import React, { useState } from 'react';
import './style.less';

interface Props {
    name: string;
}
export const HelloWorld: React.FC<Props> = ({name}) => {
    const [count, setCount] = useState<number>(0);
    return (
        <div className="hello-world">
            <h1>Hello World {name}!</h1>
        </div>
    );
};

export default HelloWorld;