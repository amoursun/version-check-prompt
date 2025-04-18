import { createApp } from 'vue';
import App from './app.vue';
import router from './router';
import './assets/main.css';

import { createVersionCheckPrompt } from './src';
import { IVersionCheckPrompt, IVersionModeEnum } from './src/types';

// /**
//  *
//  * 调试VersionCheckPrompt
//  *
//  */
createVersionCheckPrompt({
    mode: IVersionModeEnum.CHUNK,
    pollingTime: 30 * 1000,
    visibilityUsable: true,
    onUpdate: (self: IVersionCheckPrompt) => {
        const result = confirm('页面有更新，点击确定刷新页面！');
        if (result) {
        } else {
        }
    },
});

const app = createApp(App);

app.use(router);

app.mount('#app');
