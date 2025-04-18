import { IChunkCheckTypesEnum, IVersionCheckOptions, IVersionModeEnum } from '../types';
import { ResponseResultData, ResponseStatusEnum, VersionJson } from '../types/polling';
import { compareRealArray, compareVersion, htmlSourceParser } from './method';
import { IHtmlSourceParserItem, IHtmlSourceParserResult } from '../types/common';



function getResponseStatus(success: boolean): ResponseStatusEnum {
    return success ? ResponseStatusEnum.OK : ResponseStatusEnum.FAIL;
}
export function handleEtagFetch(url?: string): Promise<ResponseResultData> {
    const mode = IVersionModeEnum.ETAG;
    if (!url) {
        const error = new Error(
            `[${mode}] htmlUrl is null, please check your options`
        );
        return Promise.reject(error);
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

export function handleChunkFetch(url?: string): Promise<ResponseResultData> {
    const mode = IVersionModeEnum.CHUNK;
    if (!url) {
        const error = new Error(
            `[${mode}] htmlUrl is null, please check your options`
        );
        return Promise.reject(error);
    }
    return fetch(`${url}?t=${Date.now()}`)
        .then((response) => response.text())
        .then((data) => {
            const success = !!data;
            const source = htmlSourceParser(data);
            return {
                status: getResponseStatus(success),
                mode,
                data: source,
                error: success ? undefined : `[${mode}] html is null`,
            };
        });
}

export function handleJsonFetch(url?: string): Promise<ResponseResultData> {
    const mode = IVersionModeEnum.JSON;
    if (!url) {
        const error = new Error(
            `[${mode}] jsonUrl is null, please check your options`
        );
        return Promise.reject(error);
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


/**
 * 检查两个版本标签（ETag）是否相同
 *
 * @param v1 第一个版本标签（ETag）
 * @param v2 第二个版本标签（ETag）
 * @returns 如果两个版本标签相同则返回 true，否则返回 false
 */
function checkEtag(v1?: string, v2?: string): boolean {
    if (!v1 || !v2) {
        return false;
    }
    return compareVersion(v1, v2);
}

/**
 * 比较两个存在版本号的大小
 *
 * @param v1 第一个版本号对象，包含version属性
 * @param v2 第二个版本号对象，包含version属性
 * @returns 如果v1版本号大于或等于v2版本号，则返回true；否则返回false
 */
function checkVersion(v1: VersionJson, v2: VersionJson): boolean {
    const version1 = v1?.version;
    const version2 = v2?.version;
    if (!version1 || !version2) {
        return false;
    }
    return compareVersion(version1, version2);
}

function checkDetail(arr1: string[], arr2: string[]) {
    if (!arr1.length || !arr2.length) {
        return false;
    }
    return compareRealArray(arr1, arr2);
}
function getCheckTypes(typeList?: IChunkCheckTypesEnum[]) {
    function filterChunkCheckTypes(types?: IChunkCheckTypesEnum[]) {
        const chunkCheckTypeSet = new Set(Object.values(IChunkCheckTypesEnum));
        return (types || []).filter((type) => {
            return chunkCheckTypeSet.has(type);
        });
    }
    const types = filterChunkCheckTypes(typeList);
    if (!types || !types.length) {
        return [IChunkCheckTypesEnum.SCRIPT_SRC];
    }
    return types;
}
function getHtmlSourceParserItemValue(list: IHtmlSourceParserItem[], key: 'link' | 'text'): string[] {
    return list.map((item) => item[key]).filter(Boolean);
}
function checkChunk(
    v1: IHtmlSourceParserResult,
    v2: IHtmlSourceParserResult,
    checkTypes?: IVersionCheckOptions['chunkCheckTypes']
): boolean {
    const types = getCheckTypes(checkTypes);
    return types.some((type) => {
        switch (type) {
            case IChunkCheckTypesEnum.LINK_CSS:
                return checkDetail(
                    getHtmlSourceParserItemValue(v1.links, 'link'),
                    getHtmlSourceParserItemValue(v2.links, 'link')
                );
            case IChunkCheckTypesEnum.STYLE_CSS:
                return checkDetail(
                    getHtmlSourceParserItemValue(v1.styles, 'text'),
                    getHtmlSourceParserItemValue(v2.styles, 'text')
                );
            case IChunkCheckTypesEnum.SCRIPT:
                return checkDetail(
                    getHtmlSourceParserItemValue(v1.scripts, 'text'),
                    getHtmlSourceParserItemValue(v2.scripts, 'text')
                );
            case IChunkCheckTypesEnum.SCRIPT_SRC:
                return checkDetail(
                    getHtmlSourceParserItemValue(v1.scripts, 'link'),
                    getHtmlSourceParserItemValue(v2.scripts, 'link')
                );
            default:
                return false;
        }
    });
}

/**
 * 检查是否更新
 * @param type 版本类型
 * @param data 当前版本数据
 * @param result 请求版本数据
 */
export function checkUpdated(
    data: ResponseResultData['data'],
    result: ResponseResultData,
    options: Pick<IVersionCheckOptions, 'mode' | 'chunkCheckTypes'>
): boolean {
    const { mode, chunkCheckTypes } = options || {};
    if (!data) {
        // 没有版本数据，不更新
        return false;
    }
    if (!result || !result.data) {
        // 没有版本数据，不更新
        return false;
    }
    if (mode === IVersionModeEnum.ETAG) {
        // etag 模式
        return checkEtag(data as string, result.data as string);
    }
    else if (mode === IVersionModeEnum.JSON) {
        // json 模式
        return checkVersion(data as VersionJson, result.data as VersionJson);
    }
    else if (mode === IVersionModeEnum.CHUNK) {
        // chunk 模式
        /**
         * 没有直接比较 html text, 而是比较 html 里面的资源链接, script link style 不变化就不更新
         */
        return checkChunk(
            data as IHtmlSourceParserResult,
            result.data as IHtmlSourceParserResult,
            chunkCheckTypes
        );
    }
    return false;
}

