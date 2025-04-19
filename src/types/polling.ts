import { IVersionModeEnum } from '.';
import { IHtmlSourceParserResult } from './common';

export interface VersionJson {
    time: string;
    version: string;
}
export enum ResponseStatusEnum {
    OK = 'ok',
    FAIL = 'fail',
};
export interface ResponseResultData {
    status: ResponseStatusEnum;
    mode: IVersionModeEnum;
    data: string | VersionJson | IHtmlSourceParserResult | null;
    error?: string | null;
}

export interface IPollingService {
    // 挂载
    mount: () => void;
    // 重置 30s 后重新检测
    reset: () => void;
    // 手动检测
    check: () => void;
    // 注销卸载
    dispose: () => void;
}


