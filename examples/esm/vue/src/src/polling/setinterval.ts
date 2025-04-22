import {
    IVersionCheckOptions,
    IVersionCheckPrompt,
    IVersionModeEnum,
    IWorkerMessageCodeEnum,
    VersionControl,
} from '../types';
import { IPollingService, ResponseResultData, ResponseStatusEnum } from '../types/polling';
import { log } from '../utils';
import { checkUpdated, handleChunkFetch, handleEtagFetch, handleJsonFetch } from '../utils/util-polling';
import { IdleTaskQueue } from './idle-task';

export class IntervalPollingService implements IPollingService {
    private instance: IVersionCheckPrompt;
    private options: IVersionCheckOptions;
    private timerId: ReturnType<typeof setInterval> | null = null;
    /**
     * 存储的版本信息,，提供给后续对比 (worker 里面存在保持统一)
     */
    private result: ResponseResultData['data'] = null;
    private control: VersionControl | null = null;
    private idleTaskQueue: IdleTaskQueue | null = null;
    
    constructor(options: IVersionCheckOptions, instance: IVersionCheckPrompt) {
        this.options = options;
        this.instance = instance;
        this.created();
    }

    private get type() {
        return this.options.mode; 
    }

    /**
     * 创建控制对象
     */
    private created = () => {
        this.control = {
            start: this.handleStart,
            check: this.handleCheck,
            fetch: this.handleFetch,
            startPolling: this.startPolling,
            pausePolling: this.clearInterval,
        };
    };

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

        // 添加定期检查版本的任务, 暂时不需要
        // this.idleTaskQueue.addTask(() => {
        //     // 触发版本检查
        //     this.check();
        // });
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
                // 存储首次版本信息, 当存在版本信息代表已经存储过, 不需要存储
                if (!this.result) {
                    this.result = res.data;
                }
            }
            else {
                this.options.onError?.(new Error(res.error || 'Unknown error'));
            }
        } catch (error) {
            this.options.onError?.(error instanceof Error ? error : new Error(String(error)));
        }
    };

    /**
     * 处理更新逻辑的方法
     *
     * @param res 更新后的响应数据
     */
    private handleUpdated = (res: ResponseResultData) => {
        // 更新逻辑
        // 确保 control 和 result 存在
        if (!this.control || !this.result) {
            return;
        }
        
        const isUpdated = checkUpdated(
            this.result,
            res,
            {
                mode: this.type,
                chunkCheckTypes: this.options.chunkCheckTypes,
            }
        );

        if (isUpdated) {
            this.dispose(); // 注销
            // 提醒用户更新
            this.options.onUpdate?.(this.instance);
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

            // 将版本检查逻辑添加到空闲任务队列中
            if (this.idleTaskQueue) {
                this.idleTaskQueue.addTask(() => {
                    this.handleUpdated(res);
                });
            }
            else {
                // 如果没有空闲任务队列，直接执行检查
                this.handleUpdated(res);
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
     *
     * @param type 获取类型，类型为IVersionModeEnum枚举值
     * @returns 根据获取类型返回不同的处理结果
     * @throws 若未提供必需的URL参数，则抛出错误
     */
    private handleFetch = async (type: IVersionModeEnum): Promise<ResponseResultData> => {
        const {htmlUrl, jsonUrl} = this.options;

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
     *
     * 设置一个定时器，每隔一段时间调用一次 control.check 方法
     *
     * @returns 无返回值
     */
    private startPolling = () => {
        if (!this.control) {
            throw new Error('Control is not initialized');
        }

        this.clearInterval();
        this.timerId = setInterval(
            () => this.control?.check(),
            this.options.pollingTime,
        );
    };

    private handleMessage = (data: {
        code: IWorkerMessageCodeEnum;
    }) => {
        if (!this.control) {
            throw new Error('Control is not initialized');
        }
        const { code } = data;
        switch (code) {
            case IWorkerMessageCodeEnum.START:
                // 开始获取版本信息
                this.control.start();
                if (!this.options.forbiddenPolling) {
                    // 开始轮询检查
                    this.control?.startPolling();
                }
                break;
            case IWorkerMessageCodeEnum.PAUSE:
                // 暂停轮询检查
                this.control?.pausePolling();
                break;
            case IWorkerMessageCodeEnum.RESUME:
                // 恢复轮询检查
                // 触发检查
                this.control?.check();
                if (!this.options.forbiddenPolling) {
                    // 开始轮询检查
                    this.control?.startPolling();
                }
                break;
            case IWorkerMessageCodeEnum.CHECK:
                // 触发检查
                this.control?.check();
                break;
        }
    };

    /**
     * 挂载方法: 启动工作进程
     */
    public mount() {
        // 启动
        this.handleMessage({
            code: IWorkerMessageCodeEnum.START,
        });
        
        // 初始化空闲任务队列
        this.initIdleTaskQueue();
    }
    /**
     * 暂停任务
     */
    public pause = () => {
        this.handleMessage({
            code: IWorkerMessageCodeEnum.PAUSE,
        });
        
        // 清空空闲任务队列
        if (this.idleTaskQueue) {
            this.idleTaskQueue.clear();
        }
    };
    /**
     * 恢复任务
     */
    public resume = () => {
        this.handleMessage({
            code: IWorkerMessageCodeEnum.RESUME,
        });
        
        // 重新初始化空闲任务队列
        this.initIdleTaskQueue();
    };
    /**
     * 检查方法
     */
    public check = () => {
        this.handleMessage({
            code: IWorkerMessageCodeEnum.CHECK,
        });
    };
    
    private clearInterval = () => {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
    };

    /**
     * 重置当前实例, 结果不处理
     *
     * 首先调用dispose()方法释放资源，然后调用mount()方法重新挂载实例
     */
    public reset(): void {
        this.dispose();
        this.mount();
    }

    public dispose = () => {
        this.clearInterval();
        
        // 清空空闲任务队列
        if (this.idleTaskQueue) {
            this.idleTaskQueue.clear();
            this.idleTaskQueue = null;
        }
    };
}