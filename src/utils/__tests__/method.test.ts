import { closeWorker, compareRealArray, compareVersion, createWorker, getChunkByHtml, htmlSourceParser, isDef } from '../method';
import { describe, expect, it, vi } from 'vitest';

describe('isDef', () => {
    it('should return true for defined values', () => {
        expect(isDef(1)).toBe(true);
        expect(isDef('test')).toBe(true);
        expect(isDef({})).toBe(true);
        expect(isDef([])).toBe(true);
    });

    it('should return false for undefined values', () => {
        expect(isDef(undefined)).toBe(false);
    });

    it('should return false for null values', () => {
        expect(isDef(null)).toBe(false);
    });
});

describe('getChunkByHtml', () => {
    it('should return the chunk name from the HTML text', () => {
        const htmlText = '<script src="chunk1.js"></script>';
        const chunkName = 'chunk1';
        const result = getChunkByHtml(htmlText, chunkName);
        expect(result).toEqual(chunkName + '.js');
    });

    it('should return the chunk name from the HTML text with a different name', () => {
        const htmlText = '<script src="chunk2.js"></script>';
        const chunkName = 'chunk2';
        const result = getChunkByHtml(htmlText, chunkName);
        expect(result).toEqual(chunkName + '.js');
    });

    it('should return null when chunk name is not found', () => {
        const htmlText = '<script src="chunk3.js"></script>';
        const chunkName = 'chunk4';
        const result = getChunkByHtml(htmlText, chunkName);
        expect(result).toBeNull();
    });

    it('should handle HTML text with multiple chunks', () => {
        const htmlText = '<script src="chunk1.js"></script><script src="chunk2.js"></script>';
        const chunkName = 'chunk2';
        const result = getChunkByHtml(htmlText, chunkName);
        expect(result).toEqual(chunkName + '.js');
    });

    it('should handle HTML text with no script tags', () => {
        const htmlText = 'No script tags here';
        const chunkName = 'chunk1';
        const result = getChunkByHtml(htmlText, chunkName);
        expect(result).toBeNull();
    });

    it('should handle HTML text with empty script tags', () => {
        const htmlText = '<script src=""></script>';
        const chunkName = 'chunk1';
        const result = getChunkByHtml(htmlText, chunkName);
        expect(result).toBeNull();
    });

    it('should handle HTML text with no src attribute in script tags', () => {
        const htmlText = '<script></script>';
        const chunkName = 'chunk1';
        const result = getChunkByHtml(htmlText, chunkName);
        expect(result).toBeNull();
    });

    it('should handle HTML text with no src attribute in script tags and no chunk name', () => {
        const htmlText = '<script></script>';
        const result = getChunkByHtml(htmlText);
        expect(result).toBeNull();
    });
});

describe('htmlSourceParser', () => {
    it('should return empty result for empty input', () => {
        const result = htmlSourceParser('');
        expect(result.links).toEqual([]);
        expect(result.scripts).toEqual([]);
        expect(result.styles).toEqual([]);
    });

    it('should extract links for stylesheets', () => {
        const html = `
            <link rel="stylesheet" href="style.css">
            <link rel="stylesheet" href="another-style.css">
            <link rel="stylesheet" href="external.css">
            <link rel="stylesheet" href="external.css">
        `;
        const result = htmlSourceParser(html);
        expect(result.links).toEqual([
            { link: 'style.css', text: '' },
            { link: 'another-style.css', text: '' },
            { link: 'external.css', text: '' },
        ]);
    });

    it('should extract scripts', () => {
        const html = `
            <script src="script.js"></script>
            <script src="another-script.js"></script>
            <script>console.log('Inline script');</script>
        `;
        const result = htmlSourceParser(html);
        expect(result.scripts).toEqual([
            { link: 'script.js', text: '' },
            { link: 'another-script.js', text: '' },
            { link: '', text: 'console.log(\'Inline script\');' },
        ]);
    });

    it('should extract styles', () => {
        const html = `
            <style>body { background-color: #fff; }</style>
            <style>body { background-color: #000; }</style>
            <style>body { background-color: #fff; }</style>
        `;
        const result = htmlSourceParser(html);
        expect(result.styles).toEqual([
            { text: 'body { background-color: #fff; }', link: '' },
            { text: 'body { background-color: #000; }', link: '' },
            { text: 'body { background-color: #fff; }', link: '' },
        ]);
    });
});

describe('compareRealArray', () => {
    it('should return true when arrays are not equal', () => {
        const arr1 = ['a', 'b', 'c'];
        const arr2 = ['d', 'e', 'f'];
        expect(compareRealArray(arr1, arr2)).toBe(true);
    });

    it('should return false when arrays are equal', () => {
        const arr1 = ['a', 'b', 'c'];
        const arr2 = ['a', 'b', 'c'];
        expect(compareRealArray(arr1, arr2)).toBe(false);
    });

    it('should return true when one array is a subset of the other', () => {
        const arr1 = ['a', 'b', 'c'];
        const arr2 = ['a', 'b'];
        expect(compareRealArray(arr1, arr2)).toBe(true);
    });

    it('should return true when arrays have different lengths', () => {
        const arr1 = ['a', 'b', 'c'];
        const arr2 = ['a', 'b'];
        expect(compareRealArray(arr1, arr2)).toBe(true);
    });

    it('should return false when arrays have the same length and contain the same elements', () => {
        const arr1 = ['a', 'b', 'c'];
        const arr2 = ['a', 'b', 'c'];
        expect(compareRealArray(arr1, arr2)).toBe(false);
    });
});

describe('compareVersion', () => {
    it('should return true when versions are different', () => {
        expect(compareVersion('1.0.0', '1.0.1')).toBe(true);
        expect(compareVersion('1.0.1', '1.0.0')).toBe(true);
        expect(compareVersion('1.0.0', '2.0.0')).toBe(true);
        expect(compareVersion('2.0.0', '1.0.0')).toBe(true);
    });

    it('should return false when versions are the same', () => {
        expect(compareVersion('1.0.0', '1.0.0')).toBe(false);
        expect(compareVersion('0.0.0', '0.0.0')).toBe(false);
    });
});


describe('createWorker', () => {
    it('should create a worker with the provided function', () => {
        const worker = createWorker(() => {});
        expect(worker).toBeInstanceOf(Worker);
    });

    it('should execute the provided function in the worker', (done) => {
        const worker = createWorker(() => {
            expect(true).toBe(true);
        });
        worker.terminate();
    });
});

describe('closeWorker', () => {
    it('should terminate the worker', () => {
        const worker = new Worker('worker.js');
        worker.terminate = vi.fn();
        closeWorker(worker);
        expect(worker.terminate).toHaveBeenCalled();
    });
});