import {
    IWorkerData,
    VersionControl,
} from '../../types';
import { ResponseResultData } from '../../types/polling';


function getResponseStatus(success: boolean): ResponseStatusEnum {
    return success ? ResponseStatusEnum.OK : ResponseStatusEnum.FAIL;
}
function handleEtagFetch(url?: string): Promise<ResponseResultData> {
    const mode = IVersionModeEnum.ETAG;
    if (!url) {
        throw new Error(
            `[${mode}] htmlUrl is null, please check your options`
        );
    }
    return fetch(url, {
        method: 'HEAD',
        cache: 'no-cache',
    }).then((response) => {
        const etag = response.headers.get('etag');
        const success = !!etag;
        return {
            status: getResponseStatus(success),
            mode,
            data: etag,
            error: success ? undefined : `[${mode}] etag is not exist, please check the response header etag.`,
        };
    });
}
function handleChunkFetch(url?: string): Promise<ResponseResultData> {
    const mode = IVersionModeEnum.CHUNK;
    if (!url) {
        throw new Error(
            `[${mode}] htmlUrl is null, please check your options`
        );
    }
    return fetch(`${url}?t=${Date.now()}`)
        .then((response) => response.text())
        .then((data) => {
            const success = !!data;
            return {
                status: getResponseStatus(success),
                mode,
                data: data,
                error: success ? undefined : `[${mode}] html is null`,
            };
        });
}
function handleJsonFetch(url?: string): Promise<ResponseResultData> {
    const mode = IVersionModeEnum.JSON;
    if (!url) {
        throw new Error(
            `[${mode}] jsonUrl is null, please check your options`
        );
    }
    return fetch(`${url}?t=${Date.now()}`)
        .then((response) => response.json())
        .then((json) => {
            const success = !!json.data?.version;
            return {
                status: getResponseStatus(success),
                mode,
                data: json.data,
                error: success ? undefined : `[${mode}] version is null`,
            };
        });
}


enum IWorkerMessageCodeEnum {
    START = 'start',
    PAUSE = 'pause',
    RESUME = 'resume',
    CHECK = 'check',
}

enum ResponseStatusEnum {
    OK = 'ok',
    FAIL = 'fail',
};

enum IVersionModeEnum {
    ETAG = 'etag',
    CHUNK = 'chunk',
    JSON = 'json',
}

/**
 * normal: 无变化
 * changed: 变化
 */
export enum IVersionCheckStatusEnum {
    NORMAL = 'normal',
    UPDATED = 'updated',
    WORKER = 'worker',
    ERROR = 'error',
};

const handleStart = async (): Promise<void> => {
    try {
        const res = await state.control.fetch(state.data.mode);
        if (res.status === ResponseStatusEnum.OK) {
            state.control.data = res.data;
        } else {
            throw new Error(res.error || 'Unknown error');
        }
    }
    catch (error) {
        throw new Error(error instanceof Error ? error.message : String(error));
    }
};
const handleCheck = async () => {
    try {
        const res = await state.control.fetch(state.data.mode);
        if (res.status === ResponseStatusEnum.FAIL) {
            throw new Error(res.error || 'Unknown error');
        }
        
        // state.control.data = res.data;
        // 发布到主线程处理逻辑
        self.postMessage({
            code: IVersionCheckStatusEnum.WORKER,
            data: {
                data: state.control.data,
                result: res,
                options: {
                    mode: state.data.mode,
                    chunkCheckTypes: state.data.chunkCheckTypes,
                }
            }
        });
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : String(error));
    }
};

const handleFetch = async (type: IVersionModeEnum): Promise<ResponseResultData> => {
    const { htmlUrl, jsonUrl } = state.data || {};
    switch (type) {
        case IVersionModeEnum.ETAG:
            return handleEtagFetch(htmlUrl);
        case IVersionModeEnum.CHUNK:
            return handleChunkFetch(htmlUrl);
        case IVersionModeEnum.JSON:
            return handleJsonFetch(jsonUrl);
        default:
            return {
                status: ResponseStatusEnum.FAIL,
                mode: type,
                data: null,
                error: `[${type}] mode is not supported`,
            };
    }
};

const startPolling = () => {
    state.timerId = setInterval(
        () => state.control.check(),
        state.data.pollingTime ?? 1 * 60 * 60 * 1000,
    );
};
const pausePolling = () => {
    if (state.timerId) {
        clearInterval(state.timerId);
        state.timerId = null;
    }
};

const state: {
    timerId: ReturnType<typeof setInterval> | null;
    data: IWorkerData;
    control: VersionControl;
} = {
    timerId: null,
    data: {
        mode: IVersionModeEnum.ETAG,
        htmlUrl: '',
        jsonUrl: '',
        pollingTime: 1 * 60 * 60 * 1000,
        forbiddenPolling: false,
        visibilityUsable: false,
        chunkCheckTypes: [],
    },
    control: {
        /**
         * 处理开始操作的方法, 存储首次版本信息, 方便后续对比
         */
        start: handleStart,
        check: handleCheck,
        fetch: handleFetch,
        /**
         * 开始轮询检查
         */
        startPolling,
        /**
         * 暂停轮询检查
         */
        pausePolling,
        data: null,
    },
}

/**
 * 处理从 Worker 发送过来的消息
 */
self.onmessage = (event: MessageEvent<{
    code: IWorkerMessageCodeEnum;
    data: IWorkerData;
}>) => {
    const { code, data } = event.data;
    if (code === IWorkerMessageCodeEnum.START) {
        state.data = data;
        // 开始获取版本信息
        state.control.start();
        if (!state.data.forbiddenPolling) {
            // 开始轮询检查
            state.control.startPolling();
        }
    }
    else if (code === IWorkerMessageCodeEnum.PAUSE) {
        // 暂停轮询检查
        state.control.pausePolling();
    }
    else if (code === IWorkerMessageCodeEnum.RESUME) {
        // 恢复轮询检查
        // 触发检查
        state.control.check();
        if (!state.data.forbiddenPolling) {
            // 开始轮询检查
            state.control.startPolling();
        }
    }
    else if (code === IWorkerMessageCodeEnum.CHECK) {
        // 触发检查
        state.control.check();
    }
};