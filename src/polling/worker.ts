import {
    IVersionCheckOptions,
    IVersionCheckStatusEnum,
    IVersionModeEnum,
    IWorkerData,
    IWorkerMessageCodeEnum,
    VersionControl,
} from '@/types';
import { closeWorker, compareVersion, createWorker, log } from '@/utils';
import {
    checkUpdated,
    handleChunkFetch,
    handleEtagFetch,
    handleJsonFetch,
} from '../utils/util-polling';
import { ResponseResultData, ResponseStatusEnum } from '@/types/polling';

export class WorkerPollingService {
    private options: IVersionCheckOptions;
    private worker!: Worker;
    data!: IWorkerData;
    private control!: VersionControl;
    private timerId!: ReturnType<typeof setInterval> | null;
    private versionMap: Map<IVersionModeEnum, VersionControl> = new Map();

    constructor(options: IVersionCheckOptions) {
        this.options = options;
    }

    private get type() {
        return this.options.mode; 
    }

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
                // TODO: 通知更新逻辑
                self.postMessage({
                    code: 'update',
                });
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
        const htmlUrl = this.data.htmlUrl;
        const jsonUrl = this.data.jsonUrl;
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
            this.data.pollingTime,
        );
    };
    
    /**
     * 处理从 Worker 发送过来的消息
     *
     * @param event 消息事件对象，包含 `code` 和 `data` 两个属性
     * @param event.data 包含消息类型和消息数据的对象
     * @param event.data.code 消息类型枚举值，类型为 IWorkerMessageCodeEnum
     * @param event.data.data 消息数据，类型为 IWorkerData
     */
    private workerSelfMessage = (event: MessageEvent<{
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
        else {
            // 触发检查
            this.control.check();
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
            this.options.onUpdate?.(this);
        }
    };
    
    /**
     * 挂载方法，用于初始化Web Worker
     */
    mount() {
        this.worker = createWorker(() => {
            this.versionMap.set(this.type, {
                start: this.handleStart,
                check: this.handleCheck,
                fetch: this.handleFetch,
            } as VersionControl);
            self.onmessage = this.workerSelfMessage;
        });

        // 
        this.worker.onmessage = this.workerMessage;
    
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
     * 暂停操作: 向工作线程发送暂停指令
     */
    pause = () => {
        this.worker.postMessage({
            code: IWorkerMessageCodeEnum.PAUSE,
        });
    };
    
    /**
     * 恢复Web Worker的执行: 向Web Worker发送一个消息，以恢复其执行
     */
    resume = () => {
        this.worker.postMessage({
            code: IWorkerMessageCodeEnum.RESUME,
        });
    };

    private clearInterval = () => {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
    };
    dispose = () => {
        if (this.worker) {
            closeWorker(this.worker);
        }
        this.clearInterval();
    };
}