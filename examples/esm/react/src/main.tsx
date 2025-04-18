import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app';

// 获取根 DOM 节点并挂载 React 应用
const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);

// 渲染根组件（严格模式用于开发环境检查）
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
