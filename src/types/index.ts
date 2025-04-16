import { ResponseResultData } from './polling';

export enum IVersionModeEnum {
    ETAG = 'etag',
    CHUNK = 'chunk',
    JSON = 'json',
}
// export type IVersionMode = 'etag' | 'chunk' | 'json';
/**
 * normal: 无变化
 * changed: 变化
 */
export enum IVersionCheckStatusEnum {
    NORMAL = 'normal',
    UPDATED = 'updated',
};

export enum IWorkerMessageCodeEnum {
    START = 'start',
    PAUSE = 'pause',
    RESUME = 'resume',
}

export type IObject = Record<string, unknown>;

export interface IVersionCheckPrompt {
    // 挂载
    mount: () => void;
    // 刷新
    refresh: () => void;
    // 重置 30s 后重新检测
    reset: () => void;
    // 注销卸载
    dispose: () => void;
}

export interface IVersionCheckOptions {
    /**
     * 是否可使用, 主要针对本地开发环境, 可以通过这个字段禁用版本检查
     * @default true
     */
    usable?: boolean;
    /**
     * Type of version check
     * @default 'etag'
     */
    mode: IVersionModeEnum;
    /**
     * Html url
     */
    htmlUrl?: string;
    /**
     * Json url
     */
    jsonUrl?: string;
    /**
     * 触发版本检测的事件名称列表
     */
    triggerEvents?: string[];
    /**
     * 轮训 time
     * @default 1 * 60 * 1000 (1 minute)
     */
    pollingTime?: number;
    /**
     * 禁用 轮训
     * @default false
     */
    forbiddenPolling?: boolean;
    /**
     * 页面是否可见处理暂停和恢复轮训
     * @default false (true 暂停, false 恢复)
     */
    visibilityUsable?: boolean;
    onUpdate: (self: IVersionCheckPrompt) => void;
}

export type IWorkerData = Pick<IVersionCheckOptions,
    | 'mode'
    | 'htmlUrl'
    | 'jsonUrl'
    | 'pollingTime'
    | 'forbiddenPolling'
    | 'visibilityUsable'
>;

export type VersionControl = {
    // status: IVersionCheckStatusEnum;
    /**
     * 存储的版本信息, 提供给后续对比
     */
    data: ResponseResultData['data'];
    /**
     * 当前更新缓存的版本信息, 但是还没有替换掉旧的版本信息
     * @desc 存在用户不想更新, 但是已经知道了, 等待后续刷新
     * @todo 可能是不需要的, 因为提醒后要么刷新, 要么不刷新(这个时候用户主动放弃, 存在停止轮训, 或者后续在提示, 但是都是不会去替换的)
     */
    cacheData?: ResponseResultData['data'];
    /**
     * 开始请求获取版本信息, 方便后续对比版本信息
     */
    start: () => void;
    check: () => void;
    fetch: (mode: IVersionModeEnum) => Promise<ResponseResultData>;
    pausePolling: () => void;
    startPolling: () => void;
};

