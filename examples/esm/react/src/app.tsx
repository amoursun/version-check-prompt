import React, { useState } from 'react';
import {HelloWorld} from './components/hello-world';
import {Button} from 'antd';
import './style.less';


const App: React.FC = () => {
    const [count, setCount] = useState<number>(0);
    return (
        <div className="app-container">
            <h1>React TS App</h1>
            <HelloWorld name="TypeScript" />
            <p>Edit <code>src/App.tsx</code> to start coding.</p>
            <Button type="primary" onClick={() => setCount(count + 1)}>
                Clicked {count} times
            </Button>
        </div>
    );
};

export default App;