import {
    IVersionCheckOptions,
    IVersionCheckPrompt,
    IVersionCheckStatusEnum,
    IVersionModeEnum,
    IWorkerData,
    IWorkerMessageCodeEnum,
    VersionControl,
} from '../../types';
import { closeWorker, compareVersion, createWorker, htmlSourceParser, log } from '../../utils';
import {
    checkUpdated,
    handleChunkFetch,
    handleEtagFetch,
    handleJsonFetch,
} from '../../utils/util-polling';
import { IPollingService, ResponseResultData, ResponseStatusEnum } from '../../types/polling';
// import worker from './worker.ts?worker';

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
     *
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
            console.log(data, 111111);
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
    mount() {
        const workerPath = new URL(
            './worker.ts',
            import.meta.url
        );
        this.worker = new Worker(workerPath.href, {
            type: 'module',
            name: 'version-check-worker',
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
            closeWorker(this.worker);
            this.worker = null;
        }
    }
}