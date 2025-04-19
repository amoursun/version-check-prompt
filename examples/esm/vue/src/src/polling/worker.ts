import {
    IVersionCheckOptions,
    IVersionCheckPrompt,
    IVersionCheckStatusEnum,
    IVersionModeEnum,
    IWorkerData,
    IWorkerMessageCodeEnum,
    VersionControl,
} from '../types';
import { closeWorker, createWorker, htmlSourceParser, log } from '../utils';
import {
    checkUpdated,
} from '../utils/util-polling';
import { IPollingService, ResponseResultData } from '../types/polling';

export class WorkerPollingService implements IPollingService {
    private instance: IVersionCheckPrompt;
    private options: IVersionCheckOptions;
    private worker: Worker | null = null;

    constructor(options: IVersionCheckOptions, instance: IVersionCheckPrompt) {
        this.options = options;
        this.instance = instance;
    }

    private get type(): IVersionModeEnum {
        return this.options.mode;
    }

    /**
     * 处理工作线程回传的消息的函数
     * @param event 消息事件对象，包含版本检查状态码
     */
    private workerMessage = (event: MessageEvent<{
        code: IVersionCheckStatusEnum;
        data: {
            data: ResponseResultData['data']
            result: ResponseResultData,
            options: {
                mode: IVersionCheckOptions['mode'],
                chunkCheckTypes: IVersionCheckOptions['chunkCheckTypes'],
            }
        };
    }>) => {
        const { code, data} = event.data;
        if (code === IVersionCheckStatusEnum.WORKER) {
            const { result, options } = data;
            let updated = false;
            // this.type === IVersionModeEnum.CHUNK 或者这个直接判断
            if (options.mode === IVersionModeEnum.CHUNK) {
                const chunkPrevData = htmlSourceParser(data.data as string);
                result.data = htmlSourceParser(result.data as string);
                updated = checkUpdated(chunkPrevData, result, options);
            }
            else {
                updated = checkUpdated(data.data, result, options);
            }
            log('web worker check updated', {updated, data, result});
            if (updated) {
                this.dispose(); // 注销
                // 提醒用户更新
                this.options.onUpdate?.(this.instance);
            }
        }
        else if (code === IVersionCheckStatusEnum.UPDATED) {
            this.dispose(); // 注销
            // 提醒用户更新
            this.options.onUpdate?.(this.instance);
        }
    };

    /**
     * 挂载方法，用于初始化Web Worker
     */
    public mount(): void {
        this.worker = createWorker(() => {
            enum IWorkerMessageCodeEnum {
                START = 'start',
                PAUSE = 'pause',
                RESUME = 'resume',
                CHECK = 'check',
            }
            enum ResponseStatusEnum {
                OK = 'ok',
                FAIL = 'fail',
            };
            enum IVersionModeEnum {
                ETAG = 'etag',
                CHUNK = 'chunk',
                JSON = 'json',
            }
            /**
             * normal: 无变化
             * changed: 变化
             * worker: worker 方式处理
             * error: 错误
             */
            enum IVersionCheckStatusEnum {
                NORMAL = 'normal',
                UPDATED = 'updated',
                WORKER = 'worker',
                ERROR = 'error',
            };
            function getResponseStatus(success: boolean): ResponseStatusEnum {
                return success ? ResponseStatusEnum.OK : ResponseStatusEnum.FAIL;
            }
            function handleEtagFetch(url?: string): Promise<ResponseResultData> {
                const mode = IVersionModeEnum.ETAG;
                if (!url) {
                    throw new Error(
                        `[${mode}] htmlUrl is null, please check your options`
                    );
                }
                return fetch(url, {
                    method: 'HEAD',
                    cache: 'no-cache',
                }).then((response) => {
                    const etag = response.headers.get('etag');
                    const success = !!etag;
                    return {
                        status: getResponseStatus(success),
                        mode,
                        data: etag,
                        error: success ? undefined : `[${mode}] etag is not exist, please check the response header etag.`,
                    };
                });
            }
            function handleChunkFetch(url?: string): Promise<ResponseResultData> {
                const mode = IVersionModeEnum.CHUNK;
                if (!url) {
                    throw new Error(
                        `[${mode}] htmlUrl is null, please check your options`
                    );
                }
                return fetch(`${url}?t=${Date.now()}`)
                    .then((response) => response.text())
                    .then((data) => {
                        const success = !!data;
                        return {
                            status: getResponseStatus(success),
                            mode,
                            data: data,
                            error: success ? undefined : `[${mode}] html is null`,
                        };
                    });
            }
            function handleJsonFetch(url?: string): Promise<ResponseResultData> {
                const mode = IVersionModeEnum.JSON;
                if (!url) {
                    throw new Error(
                        `[${mode}] jsonUrl is null, please check your options`
                    );
                }
                return fetch(`${url}?t=${Date.now()}`)
                    .then((response) => response.json())
                    .then((json) => {
                        const success = !!json.data?.version;
                        return {
                            status: getResponseStatus(success),
                            mode,
                            data: json.data,
                            error: success ? undefined : `[${mode}] version is null`,
                        };
                    });
            }
            /**
             * 处理开始操作的方法, 存储首次版本信息, 方便后续对比
             */
            const handleStart = async (): Promise<void> => {
                try {
                    const res = await state.control.fetch(state.data.mode);
                    if (res.status === ResponseStatusEnum.OK) {
                        state.control.data = res.data;
                    } else {
                        throw new Error(res.error || 'Unknown error');
                    }
                }
                catch (error) {
                    throw new Error(error instanceof Error ? error.message : String(error));
                }
            };
            /**
             * 处理检查更新逻辑的方法
             */
            const handleCheck = async () => {
                try {
                    const res = await state.control.fetch(state.data.mode);
                    if (res.status === ResponseStatusEnum.FAIL) {
                        throw new Error(res.error || 'Unknown error');
                    }
                    
                    // state.control.data = res.data;
                    // 发布到主线程处理逻辑
                    self.postMessage({
                        code: IVersionCheckStatusEnum.WORKER,
                        data: {
                            data: state.control.data,
                            result: res,
                            options: {
                                mode: state.data.mode,
                                chunkCheckTypes: state.data?.chunkCheckTypes,
                            }
                        }
                    });
                } catch (error) {
                    throw new Error(error instanceof Error ? error.message : String(error));
                }
            };
            /**
             * 处理不同类型的获取请求
             */
            const handleFetch = async (type: IVersionModeEnum): Promise<ResponseResultData> => {
                const { htmlUrl, jsonUrl } = state.data || {};
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
            const startPolling = () => {
                state.timerId = setInterval(
                    () => state.control.check(),
                    state.data?.pollingTime  ?? 1 * 60 * 60 * 1000,
                );
            };
            /**
             * 暂停轮询检查
             */
            const pausePolling = () => {
                if (state.timerId) {
                    clearInterval(state.timerId);
                    state.timerId = null;
                }
            };
            const state: {
                timerId: ReturnType<typeof setInterval> | null;
                data: IWorkerData;
                control: VersionControl;
            } = {
                timerId: null,
                data: {} as IWorkerData,
                control: {
                    /**
                     * 处理开始操作的方法, 存储首次版本信息, 方便后续对比
                     */
                    start: handleStart,
                    check: handleCheck,
                    fetch: handleFetch,
                    /**
                     * 开始轮询检查
                     */
                    startPolling,
                    /**
                     * 暂停轮询检查
                     */
                    pausePolling,
                    data: null,
                },
            };
            /**
             * 处理从 Worker 发送过来的消息
             */
            self.onmessage = (event: MessageEvent<{
                code: IWorkerMessageCodeEnum;
                data: IWorkerData;
            }>) => {
                const { code, data } = event.data;
                if (code === IWorkerMessageCodeEnum.START) {
                    state.data = data;
                    // 开始获取版本信息
                    state.control.start();
                    if (!state.data.forbiddenPolling) {
                        // 开始轮询检查
                        state.control.startPolling();
                    }
                }
                else if (code === IWorkerMessageCodeEnum.PAUSE) {
                    // 暂停轮询检查
                    state.control.pausePolling();
                }
                else if (code === IWorkerMessageCodeEnum.RESUME) {
                    // 恢复轮询检查
                    // 触发检查
                    state.control.check();
                    if (!state.data?.forbiddenPolling) {
                        // 开始轮询检查
                        state.control.startPolling();
                    }
                }
                else if (code === IWorkerMessageCodeEnum.CHECK) {
                    // 触发检查
                    state.control.check();
                }
            };
        });
        // 监听工作线程的消息
        this.worker.onmessage = this.workerMessage;
    
        const {
            pollingTime,
            forbiddenPolling,
            visibilityUsable,
            mode,
            chunkCheckTypes,
            htmlUrl,
            jsonUrl,
        } = this.options;
        // 启动工作线程
        this.worker.postMessage({
            code: IWorkerMessageCodeEnum.START,
            data: {
                mode,
                chunkCheckTypes,
                htmlUrl,
                jsonUrl,
                pollingTime,
                forbiddenPolling,
                visibilityUsable,
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
            this.pause(); // 暂停轮询
            closeWorker(this.worker);
            this.worker = null;
        }
    }
}