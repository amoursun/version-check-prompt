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
