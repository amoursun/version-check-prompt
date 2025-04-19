import {
    IVersionCheckOptions,
    IVersionCheckPrompt,
    IVersionCheckStatusEnum,
    IVersionModeEnum,
    IWorkerData,
    IWorkerMessageCodeEnum,
    VersionControl,
} from '../types';
import { closeWorker, createWorker, log } from '../utils';
import {
    checkUpdated,
    handleChunkFetch,
    handleEtagFetch,
    handleJsonFetch,
} from '../utils/util-polling';
import { IPollingService, ResponseResultData, ResponseStatusEnum } from '../types/polling';

export class WorkerPollingService implements IPollingService {
    private instance: IVersionCheckPrompt;
    private options: IVersionCheckOptions;
    private worker: Worker | null = null;
    private data: IWorkerData | null = null;
    private control: VersionControl | null = null;
    private timerId: ReturnType<typeof setInterval> | null = null;
    private versionMap: Map<IVersionModeEnum, VersionControl> = new Map();

    constructor(options: IVersionCheckOptions, instance: IVersionCheckPrompt) {
        this.options = options;
        this.instance = instance;
    }

    private get type(): IVersionModeEnum {
        return this.options.mode;
    }

    /**
     * 处理开始操作的方法, 存储首次版本信息, 方便后续对比
     */
    private handleStart = async (): Promise<void> => {
        if (!this.control) {
            throw new Error('Control is not initialized');
        }

        try {
            const res = await this.control.fetch(this.type);
            if (res.status === ResponseStatusEnum.OK) {
                this.control.data = res.data;
            } else {
                this.options.onError?.(new Error(res.error || 'Unknown error'));
            }
        } catch (error) {
            this.options.onError?.(error instanceof Error ? error : new Error(String(error)));
        }
    };

    /**
     * 处理检查更新逻辑的方法
     */
    private handleCheck = async (): Promise<void> => {
        if (!this.control) {
            throw new Error('Control is not initialized');
        }

        try {
            const res = await this.control.fetch(this.type);
            if (res.status === ResponseStatusEnum.FAIL) {
                log(res.error);
                return;
            }

            const isUpdated = checkUpdated(
                this.control.data,
                res,
                {
                    mode: this.type,
                    chunkCheckTypes: this.options.chunkCheckTypes,
                }
            );

            if (isUpdated) {
                self.postMessage({
                    code: IVersionCheckStatusEnum.UPDATED,
                });
            }
        } catch (error) {
            this.options.onError?.(
                error instanceof Error
                    ? error
                    : new Error(String(error))
            );
        }
    };

    /**
     * 处理不同类型的获取请求
     */
    private handleFetch = async (type: IVersionModeEnum): Promise<ResponseResultData> => {
        const { htmlUrl, jsonUrl } = this.data || {};

        switch (type) {
            case IVersionModeEnum.ETAG:
                return handleEtagFetch(htmlUrl);
            case IVersionModeEnum.CHUNK:
                return handleChunkFetch(htmlUrl);
            case IVersionModeEnum.JSON:
                return handleJsonFetch(jsonUrl);
            default:
                return {
                    status: ResponseStatusEnum.FAIL,
                    mode: type,
                    data: null,
                    error: `[${type}] mode is not supported`,
                };
        }
    };

    /**
     * 开始轮询检查
     */
    private startPolling = (): void => {
        if (!this.control) {
            throw new Error('Control is not initialized');
        }

        this.clearInterval();
        this.timerId = setInterval(
            () => this.control?.check(),
            this.data?.pollingTime ?? 5000
        );
    };

    /**
     * 处理从 Worker 发送过来的消息
     */
    private handleWorkerMessage = (event: MessageEvent<{
        code: IWorkerMessageCodeEnum;
        data: IWorkerData;
    }>): void => {
        const { code, data } = event.data;

        switch (code) {
            case IWorkerMessageCodeEnum.START:
                this.data = data;
                const current = this.versionMap.get(this.type);
                if (!current) {
                    throw new Error(`No version control found for mode: ${this.type}`);
                }
                this.control = {
                    ...current,
                    startPolling: this.startPolling,
                    pausePolling: this.clearInterval,
                    data: current.data,
                };
                this.control.start();
                if (!this.data.forbiddenPolling) {
                    this.control.startPolling();
                }
                break;
            case IWorkerMessageCodeEnum.PAUSE:
                this.control?.pausePolling();
                break;
            case IWorkerMessageCodeEnum.RESUME:
                this.control?.check();
                if (!this.data?.forbiddenPolling) {
                    this.control?.startPolling();
                }
                break;
            case IWorkerMessageCodeEnum.CHECK:
                this.control?.check();
                break;
        }
    };

    /**
     * 处理工作线程回传的消息
     */
    private handleWorkerResponse = (event: MessageEvent<{
        code: IVersionCheckStatusEnum;
    }>): void => {
        const { code } = event.data;
        if (code === IVersionCheckStatusEnum.UPDATED) {
            this.dispose(); // 注销
            // 提醒用户更新
            this.options.onUpdate?.(this.instance);
        }
    };

    /**
     * 挂载方法，用于初始化Web Worker
     */
    public   mount(): void {
        this.worker = createWorker(() => {
            const versionControl: VersionControl = {
                start: this.handleStart,
                check: this.handleCheck,
                fetch: this.handleFetch,
                data: null,
                startPolling: this.startPolling,
                pausePolling: this.clearInterval,
            };
            this.versionMap.set(this.type, versionControl);
            self.onmessage = this.handleWorkerMessage;
        });

        this.worker.onmessage = this.handleWorkerResponse;

        this.worker.postMessage({
            code: IWorkerMessageCodeEnum.START,
            data: {
                mode: this.options.mode,
                htmlUrl: this.options.htmlUrl,
                jsonUrl: this.options.jsonUrl,
                pollingTime: this.options.pollingTime,
                forbiddenPolling: this.options.forbiddenPolling,
            },
        });
    }

    /**
     * 暂停操作
     */
    public pause(): void {
        this.worker?.postMessage({
            code: IWorkerMessageCodeEnum.PAUSE,
        });
    }

    /**
     * 恢复操作
     */
    public resume(): void {
        this.worker?.postMessage({
            code: IWorkerMessageCodeEnum.RESUME,
        });
    }

    /**
     * 手动检查更新
     */
    public check(): void {
        this.worker?.postMessage({
            code: IWorkerMessageCodeEnum.CHECK,
        });
    }

    /**
     * 清理定时器
     */
    private clearInterval(): void {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
    }

    /**
     * 刷新版本检查
     */
    public refresh(): void {
        this.check();
    }

    /**
     * 重置版本检查
     */
    public reset(): void {
        this.dispose();
        this.mount();
    }

    /**
     * 销毁实例
     */
    public dispose(): void {
        if (this.worker) {
            closeWorker(this.worker);
            this.worker = null;
        }
        this.clearInterval();
        this.versionMap.clear();
        this.control = null;
        this.data = null;
    }
}