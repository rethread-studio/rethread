import React, { memo } from 'react';
import { controllDirection } from '../types';
import { areEqual } from '../utils';
import { ArrowBtn } from './arrowBtn';

interface IArrowsControl {
    clickHandler: (direction: controllDirection) => void,
    color: string
}

const ArrowsControl = ({ clickHandler, color }: React.PropsWithChildren<IArrowsControl>) => {

    return <div className="flex w-full flex-col justify-center items-center space-y-2 place-self-end">
        <ArrowBtn clickEvent={clickHandler} direction="up" color={color} />
        <div className="flex flex-row space-x-2">
            <ArrowBtn clickEvent={clickHandler} direction="left" color={color} />
            <ArrowBtn clickEvent={clickHandler} direction="down" color={color} />
            <ArrowBtn clickEvent={clickHandler} direction="right" color={color} />
        </div>
    </div>
}



export default memo(ArrowsControl, areEqual);