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
    WORKER = 'worker',
    ERROR = 'error',
    UPDATE_RESULT = 'update_result',
};

export enum IWorkerMessageCodeEnum {
    START = 'start',
    PAUSE = 'pause',
    RESUME = 'resume',
    CHECK = 'check',
    // 内部触发检查时候, 防止重复触发
    RESUME_CHECK = 'resume-check',
    PAUSE_CHECK = 'pause-check',
}

export enum IPollingTypeEnum {
    /**
     * 使用 worker 检测更新
     */
    WEB_WORKER = 'worker',
    /**
     * 使用定时器检测更新
     */
    INTERVAL = 'interval',
}

export type IObject = Record<string, unknown>;

export interface IVersionCheckPrompt {
    // 挂载
    // mount: () => void;
    // 刷新
    refresh: () => void;
    // 重置 30s 后重新检测
    reset: () => void;
    // 手动检测
    check: () => void;
    // 停止忽略更新提示
    stop: () => void;
    // 注销卸载
    dispose: () => void;
}
export interface IActivityService {
    // 挂载
    // mount: () => void;
    // 重置检测
    reset: () => void;
    // 停止
    stop: () => void;
    // 刷新
    refresh: () => void;
    // 注销卸载
    dispose: () => void;
}

export enum IChunkCheckTypesEnum {
    /**
     * link css
     */
    LINK_CSS = 'link_css',
    /**
     * style css
     */
    STYLE_CSS = 'style_css',
    /**
     * script
     */
    SCRIPT = 'script',
    /**
     * script src
     */
    SCRIPT_SRC = 'script_src',
}

/**
 * 浏览器活跃态配置
 */
export interface IActivityOption {
    /**
     * 是否可使用
     * @default false
     */
    usable?: boolean;
    /**
     * 检测time
     * @default 1 * 4 * 60 * 60 * 1000 (4 hour)
     */
    duration?: number;
    /**
     * 监听的事件名, 可以自己提供, 用于触发刷新当前活跃时间, activeTime 后提示
     * @default ['click', 'mousemove', 'keydown', 'scroll', 'touchstart']
     */
    eventNames?: string[];
    /**
     * 超时回调
     * @param self 当前版本检查实例
     */
    onInactivityPrompt: (self: IActivityService) => void;
}

export interface IVersionCheckOptions {
    /**
     * 是否可使用, 主要针对本地开发环境, 可以通过这个字段禁用版本检查
     * @default true
     */
    usable?: boolean;
    /**
     * 使用轮训类型
     * @default web worker 检测更新
     *  - 降级为定时器检测更新
     */
    usePollingType?: IPollingTypeEnum;
    /**
     * Type of version check
     * @default 'etag'
     */
    mode: IVersionModeEnum;
    /**
     * chunk 模式下的文件类型, 默认只检测 src 属性为 js
     * @description [] => 表示检查 script src 属性为 js 的文件
     * @default [IChunkCheckTypesEnum.SCRIPT_SRC]
     */
    chunkCheckTypes?: IChunkCheckTypesEnum[];
    /**
     * Html url
     */
    htmlUrl?: string;
    /**
     * Json url
     */
    jsonUrl?: string;
    /**
     * 轮训 time
     * @default 5 * 60 * 1000 (1 minute)
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
    /**
     * 版本更新后, 提示用户更新, 用户可以选择更新或者不更新, 后续不在提示
     * @param self 当前版本检查实例
     */
    onUpdate?: (self: IVersionCheckPrompt) => void;
    /**
     * 错误回调
     * @param error 错误信息
     */
    onError?: (error: Error) => void;
    /**
     * 浏览器活跃相关配置
     */
    activityOption?: IActivityOption;
}

export type IWorkerData = Pick<IVersionCheckOptions,
    | 'mode'
    | 'htmlUrl'
    | 'jsonUrl'
    | 'pollingTime'
    | 'forbiddenPolling'
    | 'visibilityUsable'
    | 'chunkCheckTypes'
> & {
    result: ResponseResultData['data'];
};

export type VersionControl = {
    // status: IVersionCheckStatusEnum;
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

export * from './common';
export * from './polling';

