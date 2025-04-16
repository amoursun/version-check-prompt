import { IVersionCheckOptions } from '@/types';

export class IntervalPollingService {
    options: IVersionCheckOptions;
    timerId!: ReturnType<typeof setTimeout> | null;
    constructor(options: IVersionCheckOptions) {
        this.options = options;
    }

    mount() {
    }
    pause = () => {
        this.clearInterval();
    };
    resume = () => {
        this.clearInterval();
        this.timerId = setInterval(() => {
            this.options.onUpdate(this);
        }, this.options.pollingTime);
    };
    private clearInterval = () => {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
    };
    dispose = () => {
        this.clearInterval();
    };
}