import { defaultOptions } from './common/constant';
import { IVersionCheckOptions, IVersionCheckPrompt } from './types';
import { closeWorker, compareVersion, createWorker, noop } from './utils';


export class VersionCheckPrompt implements IVersionCheckPrompt {
    options;
    worker: Worker | undefined;

    visibilityHandler = () => {
        if (document.visibilityState === 'visible') {
            this.worker?.postMessage({
                code: 'resume',
            });
        } else {
            this.worker?.postMessage({
                code: 'pause',
            });
        }
    };

    eventHandler = () => {
        this.worker?.postMessage({
            code: 'check',
        });
    };

    constructor(options: IVersionCheckOptions) {
        this.options = {
            ...defaultOptions,
            ...options,
        };

        this.start();
    }

    start() {
        const { eventTriggerList, silent, silentPageVisibility } = this.options;
    
        if (silent) {
            return;
        }

        // web worker 脚本代码降级到es6，避免打包出现兼容问题。
        this.worker = createWorker(() => {
            let timerId: ReturnType<typeof setTimeout> | null = null;
            let globalData: WorkerGlobalData;
            let versionControl: VersionControl;
            const versionControlMap = new Map();
            versionControlMap.set('etag', {
            start: () => {
                versionControl.fetchEtag().then((res) => {
                    versionControl.versionFlag = res.versionFlag;
                });
            },
            check: () => {
                versionControl.fetchEtag().then((res) => {
                    if (res.versionFlag !== versionControl.versionFlag) {
                        self.postMessage({
                        code: 'update',
                        data: {
                            versionFlag: res.versionFlag,
                            localVersionFlag: versionControl.versionFlag,
                        },
                        });
                    }
                });
            },
            fetchEtag: () => {
                if (!globalData.htmlUrl) {
                    throw new Error('[version-polling]: htmlUrl is required');
                }
                return fetch(globalData.htmlUrl, {
                    method: 'HEAD',
                    cache: 'no-cache',
                }).then((response) => {
                    const etag = response.headers.get('etag');
                    if (!etag) {
                        throw new Error('[version-polling]: etag is null');
                    }
                    return {
                        versionFlag: etag,
                    };
                });
            },
        });
        versionControlMap.set('chunkHash', {
            start: () => {
                versionControl.fetchChunkHash().then((res) => {
                versionControl.versionFlag = res.versionFlag;
                });
            },
            check: () => {
                versionControl.fetchChunkHash().then((res) => {
                if (res.versionFlag !== versionControl.versionFlag) {
                    self.postMessage({
                    code: 'update',
                    data: {
                        versionFlag: res.versionFlag,
                        localVersionFlag: versionControl.versionFlag,
                    },
                    });
                }
                });
            },
            fetchChunkHash: () => {
                if (!globalData.htmlUrl) {
                throw new Error('[version-polling]: htmlUrl is required');
                }
                return fetch(`${globalData.htmlUrl}?t=${+new Date()}`)
                .then((response) => response.text())
                .then((response) => {
                    const getChunkByHtml = (htmlText: string, name = 'index') => {
                    const chunkRegExp = new RegExp(
                        `<script(?:.*)src=(?:["']?)(.*?${name}.*?)(?:["']?)>`,
                        's',
                    );
                    const [, src] = htmlText.match(chunkRegExp) || [];
                    return src;
                    };
                    const chunkHash = getChunkByHtml(response, globalData.chunkName);
                    if (!chunkHash) {
                    throw new Error('[version-polling]: chunkHash is null');
                    }
                    return {
                    versionFlag: chunkHash,
                    };
                });
            },
        });
        versionControlMap.set('versionJson', {
            start: () => {
                versionControl.fetchVersionFile().then((res) => {
                versionControl.versionFlag = res.versionFlag;
                });
            },
            check: () => {
                versionControl.fetchVersionFile().then((res) => {
                if (res.versionFlag !== versionControl.versionFlag) {
                    self.postMessage({
                    code: 'update',
                    data: {
                        versionFlag: res.versionFlag,
                        versionInfo: res.versionInfo,
                        localVersionFlag: versionControl.versionFlag,
                    },
                    });
                }
                });
            },
            fetchVersionFile: () => {
                if (!globalData.jsonUrl) {
                throw new Error('[version-polling]: jsonUrl is required');
                }
                return fetch(`${globalData.jsonUrl}?t=${+new Date()}`)
                .then((response) => response.json())
                .then((response) => {
                    const { version } = response;
                    if (!version) {
                    throw new Error('[version-polling]: version is null');
                    }
                    return {
                    versionFlag: version,
                    versionInfo: response,
                    };
                });
            },
        });
    
        self.onmessage = (event: MessageEvent) => {
            const { code, data } = event.data;
    
            if (code === 'start') {
                globalData = data;
                const current = versionControlMap.get(globalData.mode);
                if (!current) {
                throw new Error(
                    `[version-polling]: invalid mode: ${globalData.mode}`,
                );
                }
                versionControl = Object.assign(current, {
                startPolling: () => {
                    timerId = setInterval(
                    versionControl.check,
                    globalData.pollingTime,
                    );
                },
                pausePolling: () => {
                    if (timerId) {
                    clearInterval(timerId);
                    timerId = null;
                    }
                },
                });
                versionControl.start();
                if (!globalData.silentPollingInterval) {
                versionControl.startPolling();
                }
            } else if (code === 'pause') {
                versionControl.pausePolling();
            } else if (code === 'resume') {
                versionControl.check();
                if (!globalData.silentPollingInterval) {
                versionControl.startPolling();
                }
            } else {
                versionControl.check();
            }
            };
        });

        this.worker.onmessage = (event: MessageEvent) => {
            const { code, data } = event.data;
    
            if (code === 'update') {
                let promptUpdate = true;
                const { mode } = this.options;
                if (mode === 'json') {
                    promptUpdate = compareVersion(data.versionFlag, data.localVersionFlag);
                }
                if (promptUpdate) {
                    this.stop();
                    this.options.onUpdate?.(this, data.versionInfo);
                }
            }
        };
    
        this.worker.postMessage({
            code: 'start',
            data: {
                mode: this.options.mode,
                htmlUrl: this.options.htmlUrl,
                chunkName: this.options.chunkName,
                jsonUrl: this.options.jsonUrl,
                pollingTime: this.options.pollingTime,
                silentPollingInterval: this.options.silentPollingInterval,
            },
        });

        if (!silentPageVisibility) {
            document.addEventListener('visibilitychange', this.visibilityHandler);
        }
    
        if (eventTriggerList?.length) {
            for (const type of eventTriggerList) {
            window.addEventListener(type, this.eventHandler);
            }
        }
    }

    stop() {
        const { eventTriggerList, silentPageVisibility } = this.options;
    
        if (this.worker) {
            closeWorker(this.worker);
        }
        if (!silentPageVisibility) {
            document.removeEventListener(
                'visibilitychange',
                this.visibilityHandler,
            );
        }

        if (eventTriggerList?.length) {
            for (const type of eventTriggerList) {
                window.removeEventListener(type, this.eventHandler);
            }
        }
    }

    onRefresh() {
        window.location.reload();
    }

    /**
     * 提示时候, 取消提醒, 已经知道了
     */
    onCancel() {
        setTimeout(() => {
            this.start();
        }, 30);
    }
}