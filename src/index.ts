import { IVersionCheckOptions, IVersionCheckPrompt, IVersionModeEnum } from '@/types';
import { defaultOptions } from '@/common/constant';
import { IntervalPollingService } from './polling/setinterval';
import { WorkerPollingService } from './polling/worker';

export class VersionCheckPrompt implements IVersionCheckPrompt {
    private options: IVersionCheckOptions;
    private instance!: WorkerPollingService | IntervalPollingService;
    constructor(options: IVersionCheckOptions) {
        this.options = Object.assign({}, defaultOptions, options);
        this.createInstance();
    }

    private visibilityHandler = () => {
        if (document.visibilityState === 'visible') {
            this.instance?.pause();
        }
        else if (document.visibilityState === 'hidden') {
            this.instance?.resume();
        }
    };

    private get PollingService() {
        if (window.Worker) {
            return WorkerPollingService;
        }
        return IntervalPollingService;
    }

    private get usable() {
        return this.options.usable;
    }

    /**
     * 创建实例
     */
    createInstance() {
        const mode = this.options.mode;
        // 判断是否可用, 开发环境禁用版本检查
        if (this.usable && this.PollingService) {
            const isModeEffective = [IVersionModeEnum.ETAG, IVersionModeEnum.CHUNK, IVersionModeEnum.JSON].includes(mode);
            if (!isModeEffective) {
                console.warn(`[${mode}] mode is not supported, only support ${IVersionModeEnum.ETAG}, ${IVersionModeEnum.CHUNK}, ${IVersionModeEnum.JSON} mode`);
                return;
            }
            this.instance = new this.PollingService(this.options);
            // 添加事件
            this.addEvents();
        }
    }

    /**
     * 启动实例的方法
     */
    mount() {
        this.instance?.mount();
    }

    /**
     * 刷新当前页面
     */
    refresh() {
        window.location.reload();
    }

    /**
     * 取消当前操作并在30毫秒后重新开始。
     */
    cancel() {
        setTimeout(this.mount, 30);
    }

    /**
     * 添加事件的方法
     */
    private addEvents() {
        if (!this.options.visibilityUsable) {
            document.addEventListener('visibilitychange', this.visibilityHandler);
        }
    }
    /**
     * 移除事件监听器
     */
    private removeEvents() {
        if (!this.options.visibilityUsable) {
            document.removeEventListener('visibilitychange', this.visibilityHandler);
        }
    }
    /**
     * 销毁实例
     */
    dispose() {
        this.removeEvents();
        this.instance?.dispose();
    }
}

export function createVersionCheckPrompt(options: IVersionCheckOptions) {
    return new VersionCheckPrompt(options);
}
