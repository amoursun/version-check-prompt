import { IVersionCheckOptions, IVersionModeEnum } from '@/types';
import { noop } from '@/utils';

export const defaultOptions: IVersionCheckOptions = {
    usable: true,
    mode: IVersionModeEnum.ETAG,
    htmlUrl: location.href,
    pollingTime: 1 * 60 * 1000, // 1分钟，默认单位为毫秒
    // silent: false,
    forbiddenPolling: false,
    visibilityUsable: false,
    onUpdate: noop,
};