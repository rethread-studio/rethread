import React from 'react';
import { isWall, isAnswer } from "../utils";

interface IGridGame {
    state: any,
    position: { x: number, y: number },
}

export const GridGame = ({ state, position }: React.PropsWithChildren<IGridGame>) => {

    const tileSize: number = (window.innerWidth - 16 * 2) / state.width;

    let grid = <></>;
    for (let i = 0; i < (state?.height || 0); i++) {
        let line = <></>;
        for (let j = 0; j < state.width; j++) {
            line = <>
                {line}
                <div style={{ width: `${tileSize}px`, height: `${tileSize}px` }} className={"grid-position-item " + ((position.y === i && position.x === j) ? "active " : " ") + (isWall(j, i, state) ? "wall " : " ") + (isAnswer(j, i, state) ? "grid-answer " : " ")}></div>
            </>
        }
        grid = <>{grid}<div className="grid-line">{line}</div></>
    }

    return <div className="grid-position absolute zIndex">
        {grid}
    </div>
}