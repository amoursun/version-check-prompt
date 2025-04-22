import { debounce } from '../utils';
import { checkDuration, defaultActivityOption } from '../common/constant';
import {
    IActivityOption,
    IActivityService,
    IVersionCheckPrompt,
} from '../types';

export class ActivityService implements IActivityService {
    private instance: IVersionCheckPrompt;
    private options: IActivityOption;
    private lastActivityTime: number = Date.now();
    private timerId: ReturnType<typeof setTimeout> | null = null;
    constructor(options: IActivityOption, instance: IVersionCheckPrompt) {
        this.options = Object.assign({}, defaultActivityOption, options);
                
        this.instance = instance;
        this.addEvents();
    }

    private get duration() {
        return this.options.duration || checkDuration;
    }

    private get eventNames() {
        return this.options.eventNames || [];
    }

    // 监听用户操作事件
    private resetTimer = debounce(() => {
        this.lastActivityTime = Date.now();
        // 重新开始
        this.start();
    }, 50);
    /**
     * 创建控制对象
     */
    private addEvents = () => {
        this.removeEvents();
        this.eventNames.forEach(event => {
            document.addEventListener(event, this.resetTimer);
        });
    };

    private checkInactivity = () => {
        this.clearTimeout();
        if (Date.now() - this.lastActivityTime > this.duration) {
            this.options.onInactivityPrompt?.(this);
        }
    };

    /**
     * 开始
     * @returns 无返回值
     */
    private start = () => {
        this.clearTimeout();
        this.timerId = setTimeout(
            () => this.checkInactivity(),
            this.duration,
        );
    };


    /**
     * 挂载方法: 启动工作进程
     */
    public mount() {
        // 启动
        this.start();
    }
    
    private clearTimeout = () => {
        if (this.timerId) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }
    };

    public reset(): void {
        this.dispose();
        this.mount();
    }

    public stop = () => {
        this.clearTimeout();
    };

    public refresh = () => {
        window.location.reload();
    };

    private removeEvents = () => {
        this.eventNames.forEach(event => {
            document.removeEventListener(event, this.resetTimer);
        });
    }

    public dispose = () => {
        this.clearTimeout();
        this.removeEvents();
    };
}