import { createApp } from 'vue';
import App from './app.vue';
import router from './router';
import './assets/main.css';

import { createVersionCheckPrompt, IActivityService, IVersionCheckPrompt, IVersionModeEnum} from '@amoursun/version-check-prompt';
// 尝试明确从类型声明文件导入

// /**
//  *
//  * 调试VersionCheckPrompt
//  *
//  */
createVersionCheckPrompt({
    mode: IVersionModeEnum.ETAG,
    pollingTime: 30 * 1000,
    visibilityUsable: true,
    onUpdate: (self: IVersionCheckPrompt) => {
        const result = confirm('页面有更新，点击确定刷新页面！');
        // 取消false, 确定true
        if (result) {
            self.refresh();
        } else {
            self.reset();
        }
    },
    activityOption: {
        usable: false,
        duration: 30 * 1000,
        onInactivityPrompt: (self: IActivityService) => {
            const result = confirm('页面停留时间过长没有触发，点击确定刷新页面！');
            // 取消false, 确定true
            if (result) {
                self.refresh();
            } else {
                self.reset();
            }
        },
    }
});

const app = createApp(App);

app.use(router);

app.mount('#app');
