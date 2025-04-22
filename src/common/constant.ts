import { IActivityOption, IChunkCheckTypesEnum, IPollingTypeEnum, IVersionCheckOptions, IVersionModeEnum } from '../types';
import { noop } from '../utils';

export const checkPollingTime =  5 * 60 * 1000; // 5分钟，默认单位为毫秒
export const defaultOptions: IVersionCheckOptions = {
    usable: true,
    usePollingType: IPollingTypeEnum.WEB_WORKER,
    mode: IVersionModeEnum.ETAG,
    htmlUrl: location.href,
    chunkCheckTypes: [IChunkCheckTypesEnum.SCRIPT_SRC],
    pollingTime: checkPollingTime, // 30分钟，默认单位为毫秒
    // silent: false,
    forbiddenPolling: false,
    visibilityUsable: false,
    onUpdate: noop,
};

export const checkDuration =  4 * 60 * 60 * 1000; // 4h，默认单位为毫秒
export const defaultActivityOption: IActivityOption = {
    usable: false,
    duration: checkDuration,
    /**
     * 监听的事件名, 可以自己提供, 用于触发刷新当前活跃时间, activeTime 后提示
     */
    eventNames: ['click', 'mousemove', 'keydown', 'scroll', 'touchstart'],
    /**
     * 超时回调
     * @param self 当前版本检查实例
     */
    onInactivityPrompt: noop,
};