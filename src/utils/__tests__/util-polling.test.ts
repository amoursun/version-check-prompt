import { ResponseResultData, ResponseStatusEnum, VersionJson } from '../../types/polling';
import { describe, expect, it, vi } from 'vitest';
import {
    checkUpdated,
    getResponseStatus,
    handleChunkFetch,
    handleEtagFetch,
    handleJsonFetch,
} from '../util-polling';
import { IVersionCheckOptions, IVersionModeEnum } from '../../types';
import { IHtmlSourceParserResult } from '../../types/common';

describe('getResponseStatus', () => {
    it('should return OK for true input', () => {
        expect(getResponseStatus(true)).toEqual(ResponseStatusEnum.OK);
    });

    it('should return FAIL for false input', () => {
        expect(getResponseStatus(false)).toEqual(ResponseStatusEnum.FAIL);
    });
});


describe('handleEtagFetch', () => {
    it('should return etag when etag exists', async () => {
        const mockUrl = 'http://example.com';
        const mockResponse = {
            headers: {
                get: () => 'etag-value'
            }
        };
        global.fetch = vi.fn().mockResolvedValue(mockResponse);

        const result = await handleEtagFetch(mockUrl);

        expect(result.status).toBe(ResponseStatusEnum.OK);
        expect(result.data).toBe('etag-value');
        expect(result.error).toBeUndefined();
    });

    it('should return error when etag does not exist', async () => {
        const mockUrl = 'http://example.com';
        const mockResponse = {
            headers: {
                get: () => null
            }
        };
        global.fetch = vi.fn().mockResolvedValue(mockResponse);

        const result = await handleEtagFetch(mockUrl);

        expect(result.status).toBe(ResponseStatusEnum.FAIL);
        expect(result.data).toBeUndefined();
        expect(result.error).toBe('[etag] etag is not exist, please check the response header etag.');
    });

    it('should return error when url is null', async () => {
        const result = await handleEtagFetch();

        expect(result.status).toBe(ResponseStatusEnum.FAIL);
        expect(result.data).toBeUndefined();
        expect(result.error).toBe('[etag] htmlUrl is null, please check your options');
    });
});


describe('handleChunkFetch', () => {
    it('should return a successful response with valid HTML data', async () => {
        const url = 'https://example.com';
        const mockResponse = '<html><body>Hello, world!</body></html>';
        global.fetch = vi.fn().mockResolvedValue({
            text: () => Promise.resolve(mockResponse),
        });

        const result = await handleChunkFetch(url);

        expect(result.status).toBe(ResponseStatusEnum.OK);
        expect(result.data).toEqual({
            html: '<html><body>Hello, world!</body></html>',
            css: '',
            js: '',
        });
        expect(result.error).toBeUndefined();
    });

    it('should return an error response when the HTML data is null', async () => {
        const url = 'https://example.com';
        global.fetch = vi.fn().mockResolvedValue({
            text: () => Promise.resolve(''),
        });

        const result = await handleChunkFetch(url);

        expect(result.status).toBe(ResponseStatusEnum.FAIL);
        expect(result.data).toBeUndefined();
        expect(result.error).toMatch('html is null');
    });

    it('should return an error response when the URL is null', async () => {
        const result = await handleChunkFetch();

        expect(result.status).toBe(ResponseStatusEnum.FAIL);
        expect(result.data).toBeUndefined();
        expect(result.error).toMatch('htmlUrl is null');
    });
});


describe('handleJsonFetch', () => {
    it('should return a successful response with valid data', async () => {
        const validJsonUrl = 'https://example.com/api/version.json';
        const response = await handleJsonFetch(validJsonUrl) as ResponseResultData & {data: VersionJson};
        expect(response.status).toBe(ResponseStatusEnum.OK);
        expect(response.mode).toBe(IVersionModeEnum.JSON);
        expect(response.data).toBeDefined();
        expect(response.data.version).toBeDefined();
        expect(response.error).toBeUndefined();
    });

    it('should return an error response when the jsonUrl is null', async () => {
        const response = await handleJsonFetch();
        expect(response.status).toBe(ResponseStatusEnum.FAIL);
        expect(response.mode).toBe(IVersionModeEnum.JSON);
        expect(response.data).toBeUndefined();
        expect(response.error).toMatch(/jsonUrl is null/);
    });

    it('should return an error response when the jsonUrl does not return valid data', async () => {
        const invalidJsonUrl = 'https://example.com/api/invalid.json';
        const response = await handleJsonFetch(invalidJsonUrl);
        expect(response.status).toBe(ResponseStatusEnum.FAIL);
        expect(response.mode).toBe(IVersionModeEnum.JSON);
        expect(response.data).toBeUndefined();
        expect(response.error).toMatch(/version is null/);
    });
});

describe('checkUpdated', () => {
    it('should return false when data is null', () => {
        const result: ResponseResultData = { 
            data: {
                version: '1.0.0',
                time: '2023-01-01'
            },
            mode: IVersionModeEnum.JSON,
            status: ResponseStatusEnum.OK
        };
        const options: IVersionCheckOptions = { mode: IVersionModeEnum.JSON };
        expect(checkUpdated(null, result, options)).toBe(false);
    });

    it('should return false when result.data is null', () => {
        const result: ResponseResultData = { data: null, mode: IVersionModeEnum.JSON, status: ResponseStatusEnum.OK };
        const options: IVersionCheckOptions = { mode: IVersionModeEnum.JSON };
        expect(checkUpdated({version: '1.0.0', time: '2023-01-01'}, result, options)).toBe(false);
    });

    it('should return false when mode is ETAG and data and result.data are not equal', () => {
        const result: ResponseResultData = {
            data: 'etag-1',
            mode: IVersionModeEnum.ETAG,
            status: ResponseStatusEnum.OK
        };
        const options: IVersionCheckOptions = { mode: IVersionModeEnum.ETAG };
        expect(checkUpdated('etag-2', result, options)).toBe(false);
    });

    it('should return true when mode is ETAG and data and result.data are equal', () => {
        const result: ResponseResultData = {
            data: 'etag-1',
            mode: IVersionModeEnum.ETAG,
            status: ResponseStatusEnum.OK
        };
        const options: IVersionCheckOptions = { mode: IVersionModeEnum.ETAG };
        expect(checkUpdated('etag-1', result, options)).toBe(true);
    });

    it('should return false when mode is JSON and data and result.data are not equal', () => {
        const result: ResponseResultData = {
            data: {
                version: '1.0.0',
                time: '2023-01-01'
            },
            mode: IVersionModeEnum.JSON,
            status: ResponseStatusEnum.OK
        };
        const options: IVersionCheckOptions = { mode: IVersionModeEnum.JSON };
        expect(checkUpdated({ version: '2.0.0', time: '2023-01-02' }, result, options)).toBe(false);
    });

    it('should return true when mode is JSON and data and result.data are equal', () => {
        const result: ResponseResultData = {
            data: {
                version: '1.0.0',
                time: '2023-01-01'
            },
            mode: IVersionModeEnum.JSON,
            status: ResponseStatusEnum.OK
        };
        const options: IVersionCheckOptions = { mode: IVersionModeEnum.JSON };
        expect(checkUpdated({version: '1.0.0', time: '2023-01-01'}, result, options)).toBe(true);
    });

    it('should return false when mode is CHUNK and data and result.data are not equal', () => {
        const result: ResponseResultData = {
            data: {
                scripts: [{link: 'script.js', text: ''}],
                styles: [],
                links: [],
            },
            mode: IVersionModeEnum.CHUNK,
            status: ResponseStatusEnum.OK,
    };
        const options: IVersionCheckOptions = { mode: IVersionModeEnum.CHUNK };
        const data: IHtmlSourceParserResult = {
            scripts: [],
            styles: [],
            links: [],
        };
        expect(checkUpdated(data, result, options)).toBe(false);
    });

    it('should return true when mode is CHUNK and data and result.data are equal', () => {
        const result: ResponseResultData = {
            data: {
                scripts: [{link: 'script.js', text: ''}],
                styles: [],
                links: [],
            },
            mode: IVersionModeEnum.CHUNK,
            status: ResponseStatusEnum.OK,
        };
        const options: IVersionCheckOptions = { mode: IVersionModeEnum.CHUNK };
        const data: IHtmlSourceParserResult = {
            scripts: [{link: 'script.js', text: ''}],
            styles: [],
            links: [],
        };
        expect(checkUpdated(data, result, options)).toBe(true);
    });
});


