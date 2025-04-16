import { createApp } from 'vue';
import App from './app.vue';
import router from './router';
import './assets/main.css';

// import { createVersionCheckPrompt } from '../../../../src/index';

// /**
//  *
//  * 调试VersionCheckPrompt
//  *
//  */
// createVersionCheckPrompt({
//   pollingTime: 30 * 1000,
//   // silent: import.meta.env.MODE === 'development', // 开发环境下不检测
//   onUpdate: (self: any) => {
//     const result = confirm('页面有更新，点击确定刷新页面！');
//     if (result) {
//       self.onRefresh();
//     } else {
//       self.onCancel();
//     }
//   },
// });

const app = createApp(App);

app.use(router);

app.mount('#app');
