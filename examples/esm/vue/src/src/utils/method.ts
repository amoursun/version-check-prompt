import { IHtmlSourceParserResult } from '../types/common';

export const noop = () => {};

/**
 * 是否有值
 */
export function isDef(val: unknown) {
    return val !== undefined && val !== null;
}

/**
 * 从HTML内容中提取指定chunk
 */
export function getChunkByHtml(htmlText: string, name = 'index') {
    const chunkRegExp = new RegExp(
        `<script(?:.*)src=(?:["']?)(.*?${name}.*?)(?:["']?)>`,
        's',
    );
    const [, src] = htmlText.match(chunkRegExp) || [];
    return src;
}

export function htmlSourceParser(html: string): IHtmlSourceParserResult {
    if (!html) {
        return {
            links: [],
            scripts: [],
            styles: [],
        };
    };
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const linkList = Array.from(doc.querySelectorAll('link'));
    const scriptList = Array.from(doc.querySelectorAll('script'));
    const styleList = Array.from(doc.querySelectorAll('style'));
    // 提取 meta 标签
    // const metas = Array.from(doc.querySelectorAll('meta')).map(meta => ({
    //     name: meta.name,
    //     content: meta.content
    // }));
    // 提取 link 资源（CSS、预加载等）
    const links = linkList.map(link => {
        const href = link.href;
        if (link.rel === 'stylesheet' || /\.css$/i.test(href)) {
            return {
                link: href,
                text: '',
            };
        }
        return null;
    }).filter(link => !!link);
    // 提取 script 资源
    const scripts = scriptList.map(script => {
        const {src, textContent} = script;
        if (src || textContent) {
            return {
                link: src,
                text: textContent || '',
            };
        }
        return null;
    }).filter(link => !!link);

    // 提取内联 style 和外部样式
    const styles = styleList.map(style => {
        const styleText = style.textContent || '';
        if (styleText) {
            return {
                text: styleText,
                link: '',
            };
        }
        return null;
    }).filter(link => !!link);
    return {
        links,
        scripts,
        styles,
    };
}

/**
 * 比较两个字符串数组是有变化
 *
 * @param arr1 第一个字符串数组
 * @param arr2 第二个字符串数组
 * @returns 如果两个数组不相等则返回 true，否则返回 false
 */
export function compareRealArray(arr1: string[], arr2: string[]) {
    const len1 = arr1.length;
    const len2 = arr2.length;
    if (len1 !== len2) {
        return true;
    }
    const set = new Set(arr1);
    for (let i = 0; i < len2; i++) {
        if (!set.has(arr2[i])) {
            return true;
        }
    }
    return false;
}

/**
 * 比较两个版本号是否相同
 * @param v1 版本1
 * @param v2 版本2
 * @see https://semver.org/lang/zh-CN/
 */
export function compareVersion(v1: string, v2: string) {
    return v1 !== v2;
}

export function createWorker(fn: () => void) {
    const blob = new Blob([`(${fn.toString()})()`], {
        type: 'text/javascript',
    });
    const url = window.URL.createObjectURL(blob);
    const worker = new Worker(url);
    window.URL.revokeObjectURL(url);
    return worker;
}

export function closeWorker(worker: Worker) {
    worker.terminate();
}

export function throwError(data: {
    errorText: string;
}) {
    const { errorText } = data || {};
    throw new Error(`[version-check-prompt]: ${errorText || 'unknown error'}`);
}

export function log(...message: unknown[]) {
    console.log(`[version-check-prompt]:`, ...message);
}

/**
 * 防抖函数
 * 
 * @param func 要执行的函数
 * @param delay 延迟时间（毫秒）
 * @param immediate 是否立即执行
 * @returns 防抖处理后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number,
    immediate = false
): (...args: Parameters<T>) => void {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let isFirstCall = true;
    
    return function(this: any, ...args: Parameters<T>): void {
        const context = this;
        
        // 清除之前的定时器
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
        
        // 立即执行模式
        if (immediate) {
            // 第一次调用或定时器已清除时执行
            if (isFirstCall) {
                func.apply(context, args);
                isFirstCall = false;
            }
            
            // 设置定时器，在延迟时间后重置 isFirstCall
            timer = setTimeout(() => {
                timer = null;
                isFirstCall = true;
            }, delay);
        } 
        // 延迟执行模式
        else {
            timer = setTimeout(() => {
                timer = null;
                func.apply(context, args);
            }, delay);
        }
    };
}
