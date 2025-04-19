import { IVersionCheckOptions, IVersionCheckPrompt, IVersionModeEnum } from './types';
import { checkPollingTime, defaultOptions } from './common/constant';
import { IntervalPollingService } from './polling/setinterval';
import { WorkerPollingService } from './polling/worker';
import { Omega, omega } from './omega';
import { ActivityService } from './polling/activity';

export class VersionCheckPrompt implements IVersionCheckPrompt {
    private options: IVersionCheckOptions;
    private instance!: WorkerPollingService | IntervalPollingService;
    private activityInstance!: ActivityService;
    constructor(options: IVersionCheckOptions) {
        this.options = Object.assign({}, defaultOptions, options);
        this.createInstance();
    }

    private visibilityHandler = () => {
        if (document.visibilityState === 'visible') {
            console.log('页面可见, 恢复轮训');
            this.instance?.resume();
        }
        else if (document.visibilityState === 'hidden') {
            console.log('页面隐藏, 暂停轮训');
            this.instance?.pause();
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

    private get pollingTime() {
        return this.options.pollingTime || checkPollingTime;
    }

    /**
     * 创建实例
     */
    private createInstance() {
        const mode = this.options.mode;
        // 判断是否可用, 开发环境禁用版本检查
        if (this.usable && this.PollingService) {
            const isModeEffective = Object.values(IVersionModeEnum).includes(mode);
            if (!isModeEffective) {
                this.options.onError?.(new Error(`[mode] ${mode} is not supported`));
                console.warn(`[mode] ${mode} is not supported`);
                return;
            }
            this.instance = omega(new this.PollingService({
                ...this.options,
                pollingTime: this.pollingTime,
            }, this))();
            // 添加事件
            this.addEvents();
            this.mount();
        }

        // 活跃监听是否使用
        if (this.options.activityOption?.usable) {
            this.activityInstance = omega(new ActivityService(this.options.activityOption, this))();
            this.activityInstance?.mount();
        }
    }

    /**
     * 启动实例的方法
     */
    public mount() {
        this.instance?.mount();
    }

    /**
     * 刷新当前页面
     */
    public refresh() {
        window.location.reload();
    }

    /**
     * 取消当前操作并在30毫秒后重新开始。
     */
    public reset() {
        setTimeout(this.mount, 30);
    }

    public check() {
        this.instance?.check();
    }

    public activityReset() {
        this.activityInstance?.mount();
    }

    /**
     * 添加事件的方法
     */
    private addEvents() {
        if (this.options.visibilityUsable) {
            document.addEventListener('visibilitychange', this.visibilityHandler);
        }
    }
    /**
     * 移除事件监听器
     */
    private removeEvents() {
        if (this.options.visibilityUsable) {
            document.removeEventListener('visibilitychange', this.visibilityHandler);
        }
    }
    /**
     * 销毁实例
     */
    public dispose() {
        this.removeEvents();
        this.instance?.dispose();
        this.activityInstance?.dispose();
    }
}

export function createVersionCheckPrompt(options: IVersionCheckOptions) {
    return new VersionCheckPrompt(options);
}
