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
import { IdleTaskQueue } from './idle-task';

interface IWorkerMessageEventData {
    data: ResponseResultData['data']
    result: ResponseResultData,
    options: {
        mode: IVersionCheckOptions['mode'],
        chunkCheckTypes: IVersionCheckOptions['chunkCheckTypes'],
    }
}
export class WorkerPollingService implements IPollingService {
    private instance: IVersionCheckPrompt;
    private options: IVersionCheckOptions;
    private worker: Worker | null = null;
    private idleTaskQueue: IdleTaskQueue | null = null;
    /**
     * 存储的版本信息, 提供给后续对比 (worker 里面存储重新开始会清空)
     */
    private result: ResponseResultData['data'] = null;

    constructor(options: IVersionCheckOptions, instance: IVersionCheckPrompt) {
        this.options = options;
        this.instance = instance;
    }

    private get type(): IVersionModeEnum {
        return this.options.mode;
    }


    /**
     * 处理更新事件
     *
     * @param data 更新事件数据
     */
    private handleUpdated = (data: IWorkerMessageEventData) => {
        const { result, options } = data;
        // 判断是否更新
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
        // 检查恢复, 防止处理过程中重复触发 (debugger 时候会触发多次, 这里暂时保留)
        // this.worker?.postMessage({
        //     code: IWorkerMessageCodeEnum.RESUME_CHECK,
        // });
        if (updated) {
            this.dispose(); // 注销
            // 提醒用户更新
            this.options.onUpdate?.(this.instance);
        }
    }
    /**
     * 处理工作线程回传的消息的函数
     * @param event 消息事件对象，包含版本检查状态码
     */
    private workerMessage = (event: MessageEvent<{
        code: IVersionCheckStatusEnum;
        data: IWorkerMessageEventData;
    }>) => {
        const { code, data} = event.data;
        if (code === IVersionCheckStatusEnum.UPDATE_RESULT) {
            // 更新结果, 用于对比
            this.result = data.result.data;
        }
        else if (code === IVersionCheckStatusEnum.WORKER) {
            // 先中断检查, 防止重复触发 (debugger 时候会触发多次, 这里暂时保留)
            // this.worker?.postMessage({
            //     code: IWorkerMessageCodeEnum.PAUSE_CHECK,
            // });
            if (this.idleTaskQueue) {
                this.idleTaskQueue.addTask(() => {
                    this.handleUpdated(data);
                });
            }
            else {
                // 如果没有空闲任务队列，直接执行检查
                this.handleUpdated(data);
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
                // 内部触发检查时候, 防止重复触发
                RESUME_CHECK = 'resume-check',
                PAUSE_CHECK = 'pause-check',
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
                UPDATE_RESULT = 'update_result',
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
                        // 首次获取版本信息, 存储到 state.data.result
                        // state.data.result 存在则不会再触发更新
                        if (!state.data.result) {
                            // state.data result 更新
                            state.data.result = res.data;
                            self.postMessage({
                                code: IVersionCheckStatusEnum.UPDATE_RESULT,
                                data: {
                                    data: state.data.result,
                                    result: res,
                                    options: {
                                        mode: state.data.mode,
                                        chunkCheckTypes: state.data?.chunkCheckTypes,
                                    }
                                }
                            });
                            // handlePostMessage(IVersionCheckStatusEnum.UPDATE_RESULT, res);
                        }
                        console.log({res, state: state.data.result });
                    }
                    else {
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
                    
                    // state.data.result = res.data; // 这里不需要更新, 因为要么刷新, 要么先忽略
                    // 发布到主线程处理逻辑
                    self.postMessage({
                        code: IVersionCheckStatusEnum.WORKER,
                        data: {
                            data: state.data.result,
                            result: res,
                            options: {
                                mode: state.data.mode,
                                chunkCheckTypes: state.data?.chunkCheckTypes,
                            }
                        }
                    });
                    // handlePostMessage(IVersionCheckStatusEnum.WORKER, res);
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
                else if (code === IWorkerMessageCodeEnum.PAUSE_CHECK) {
                    // 检查中断
                    state.control.pausePolling();
                }
                else if (code === IWorkerMessageCodeEnum.RESUME_CHECK) {
                    // 检查恢复
                    state.control.startPolling();
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
                result: this.result,
            },
        });

        // 初始化空闲任务队列
        this.initIdleTaskQueue();
    }

    /**
     * 初始化空闲任务队列
     */
    private initIdleTaskQueue(): void {
        // 如果已经存在空闲任务队列，先清理
        if (this.idleTaskQueue) {
            this.idleTaskQueue.clear();
        }

        // 创建新的空闲任务队列
        this.idleTaskQueue = new IdleTaskQueue(
            [], // 初始任务列表为空
            { 
                timeout: 5000, // 设置超时时间为5秒
                onError: (error: Error) => {
                    console.error('版本检查空闲任务执行失败:', error);
                }
            }
        );

        // 添加定期检查版本的任务, 这里可以不需要
        // this.idleTaskQueue.addTask(() => {
        //     // 触发版本检查
        //     this.check();
        // });
    }

    /**
     * 暂停操作
     */
    public pause(): void {
        this.worker?.postMessage({
            code: IWorkerMessageCodeEnum.PAUSE,
        });
        
        // 清空空闲任务队列
        if (this.idleTaskQueue) {
            this.idleTaskQueue.clear();
        }
    }

    /**
     * 恢复操作
     */
    public resume(): void {
        this.worker?.postMessage({
            code: IWorkerMessageCodeEnum.RESUME,
        });
        
        // 重新初始化空闲任务队列
        this.initIdleTaskQueue();
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
        
        // 清空空闲任务队列
        if (this.idleTaskQueue) {
            this.idleTaskQueue.clear();
            this.idleTaskQueue = null;
        }
    }
}