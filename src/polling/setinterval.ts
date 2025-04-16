import { IVersionCheckOptions, IVersionCheckPrompt, IVersionModeEnum, IWorkerData, IWorkerMessageCodeEnum, VersionControl } from '../types';
import { ResponseResultData, ResponseStatusEnum } from '../types/polling';
import { log } from '../utils';
import { checkUpdated, handleChunkFetch, handleEtagFetch, handleJsonFetch } from '../utils/util-polling';

export class IntervalPollingService {
    private options: IVersionCheckOptions;
    private timerId!: ReturnType<typeof setInterval> | null;
    control!: VersionControl;
    constructor(options: IVersionCheckOptions) {
        this.options = options;
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
            data: null,
            start: this.handleStart,
            check: this.handleCheck,
            fetch: this.handleFetch,
            startPolling: this.startPolling,
            pausePolling: this.clearInterval,
        };
    };

    /**
     * 处理开始操作的方法, 存储首次版本信息, 方便后续对比
     */
    private handleStart = () => {
        this.control.fetch(this.type).then((res) => {
            if (res.status === ResponseStatusEnum.OK) {
                this.control.data = res.data;
            }
            else if (res.status === ResponseStatusEnum.FAIL) {
                log(res.error);
            }
        });
    };
    /**
     * 处理检查更新逻辑的方法
     */
    private handleCheck = () => {
        this.control.fetch(this.type).then((res: ResponseResultData) => {
            if (res.status === ResponseStatusEnum.FAIL) {
                log(res.error);
                return;
            }
            const isUpdated = checkUpdated(
                this.type,
                this.control.data,
                res
            );
            if (isUpdated) {
                // this.control.cacheData = res.data;
                this.dispose(); // 注销
                // 提醒用户更新
                this.options.onUpdate?.(this as unknown as IVersionCheckPrompt);
            }
        });
    };
    /**
     * 处理不同类型的获取请求
     *
     * @param type 获取类型，类型为IVersionModeEnum枚举值
     * @returns 根据获取类型返回不同的处理结果
     * @throws 若未提供必需的URL参数，则抛出错误
     */
    private handleFetch = (type: IVersionModeEnum): Promise<ResponseResultData> => {
        const {htmlUrl, jsonUrl} = this.options;
        // etag
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
    };

    /**
     * 开始轮询检查
     *
     * 设置一个定时器，每隔一段时间调用一次 control.check 方法
     *
     * @returns 无返回值
     */
    private startPolling = () => {
        this.timerId = setInterval(
            this.control.check,
            this.options.pollingTime,
        );
    };

    private handleMessage = (data: {
        code: IWorkerMessageCodeEnum;
    }) => {
        const { code } = data;
        if (code === IWorkerMessageCodeEnum.START) {
            // 开始获取版本信息
            this.control.start();
            if (!this.options.forbiddenPolling) {
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
            if (!this.options.forbiddenPolling) {
                // 开始轮询检查
                this.control.startPolling();
            }
        }
        else {
            // 触发检查
            this.control.check();
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
    }
    /**
     * 暂停任务
     */
    public pause = () => {
        this.handleMessage({
            code: IWorkerMessageCodeEnum.PAUSE,
        });
    };
    /**
     * 恢复任务
     */
    public resume = () => {
        this.handleMessage({
            code: IWorkerMessageCodeEnum.RESUME,
        });
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
    public dispose = () => {
        this.clearInterval();
    };
}