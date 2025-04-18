import {
    IVersionCheckOptions,
    IVersionCheckPrompt,
    IVersionCheckStatusEnum,
    IVersionModeEnum,
    IWorkerData,
    IWorkerMessageCodeEnum,
    VersionControl,
} from '../types';
import { closeWorker, compareVersion, createWorker, log } from '../utils';
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
        this.mount();
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
     * 处理工作线程回传的消息的函数
     *
     * @param event 消息事件对象，包含版本检查状态码
     */
    private workerMessage = (event: MessageEvent<{
        code: IVersionCheckStatusEnum;
    }>) => {
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
    mount() {
        this.worker = createWorker(() => {
            this.versionMap.set(this.type, {
                start: () => {
                    this.control.fetch(this.type)
                        .then((res) => {
                            if (res.status === ResponseStatusEnum.OK) {
                                this.control.data = res.data;
                            }
                            else if (res.status === ResponseStatusEnum.FAIL) {
                                this.options.onError?.(new Error(res.error as string));
                            }
                        })
                        .catch(error => {
                            this.options.onError?.(error);
                        });
                },
                check: () => {
                    this.control.fetch(this.type)
                        .then((res: ResponseResultData) => {
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
                                },
                            );
                            if (isUpdated) {
                                // this.control.cacheData = res.data;
                                // TODO: 通知更新逻辑
                                self.postMessage({
                                    code: IVersionCheckStatusEnum.UPDATED,
                                });
                            }
                        });
                },
                fetch: (type: IVersionModeEnum): Promise<ResponseResultData> => {
                    const htmlUrl = this.data?.htmlUrl;
                    const jsonUrl = this.data?.jsonUrl;
                    if (!htmlUrl || !jsonUrl) {
                        const error = new Error(
                            `[${type}] htmlUrl and jsonUrl is null, please check your options`
                        );
                        return Promise.reject(error);
                    }
                    // etag 模式处理
                    if (type === IVersionModeEnum.ETAG) {
                        return handleEtagFetch(htmlUrl);
                    }
                    else if (type === IVersionModeEnum.CHUNK) {
                        return handleChunkFetch(htmlUrl);
                    }
                    else if (type === IVersionModeEnum.JSON) {
                        return handleJsonFetch(jsonUrl);
                    }
                    return Promise.resolve({
                        status: ResponseStatusEnum.FAIL,
                        mode: type as IVersionModeEnum,
                        data: null,
                        error: `[${type}] mode is not supported, please check your options`,
                    });
                },
                startPolling: this.startPolling,
                pausePolling: this.clearInterval,
                data: null,
            });
            self.onmessage = (event: MessageEvent<{
                code: IWorkerMessageCodeEnum;
                data: IWorkerData;
            }>) => {
                const { code, data } = event.data;
                if (code === IWorkerMessageCodeEnum.START) {
                    this.data = data;
                    const current = this.versionMap.get(this.type);
                    this.control = Object.assign({}, current, {
                        startPolling: this.startPolling,
                        pausePolling: this.clearInterval,
                    });
                    // 开始获取版本信息
                    this.control.start();
                    if (!this.data.forbiddenPolling) {
                        // 开始轮询检查
                        this.control.startPolling();
                    }
                }
                else if (code === IWorkerMessageCodeEnum.PAUSE) {
                    // 暂停轮询检查
                    this.control.pausePolling();
                }
                else if (code === IWorkerMessageCodeEnum.RESUME) {
                    // 恢复轮询检查
                    // 触发检查
                    this.control.check();
                    if (!this.data.forbiddenPolling) {
                        // 开始轮询检查
                        this.control.startPolling();
                    }
                }
                else if (code === IWorkerMessageCodeEnum.CHECK) {
                    // 触发检查
                    this.control.check();
                }
            };// this.workerSelfMessage;
        });

        // 监听工作线程的消息
        this.worker.onmessage = this.workerMessage;
    
        this.worker.postMessage({
            code: IWorkerMessageCodeEnum.START,
            data: this,
            // data: {
            //     mode: this.options.mode,
            //     htmlUrl: this.options.htmlUrl,
            //     jsonUrl: this.options.jsonUrl,
            //     pollingTime: this.options.pollingTime,
            //     forbiddenPolling: this.options.forbiddenPolling,
            //     visibilityUsable: this.options.visibilityUsable,
            // },
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