import React, { memo, useEffect, useState } from 'react';
import { isWall, isAnswer } from "../utils";

interface IGridGame {
    state: any,
    position: { x: number, y: number },
    answerPositions: [{ x: number, y: number }] | null
}

const GridGame = ({ state, position, answerPositions }: React.PropsWithChildren<IGridGame>) => {
    const [tileSize, setTileSize] = useState(0);

    useEffect(() => {
        const root = document?.getElementById("root") || document?.body;
        setTileSize((root.clientWidth - 16 * 2) / state.width)
    }, [state.width]);

    let grid = <></>;
    for (let i = 0; i < (state?.height || 0); i++) {
        let line = <></>;
        for (let j = 0; j < state.width; j++) {
            line = <>
                {line}
                <div style={{ width: `${tileSize}px`, height: `${tileSize}px` }} className={"grid-position-item " + ((position.y === i && position.x === j) ? "active " : " ") + (isWall(j, i, state) ? "wall " : " ") + (isAnswer(j, i, answerPositions) ? "grid-answer " : " ")}></div>
            </>
        }
        grid = <>{grid}<div className="grid-line">{line}</div></>
    }

    return <div className="grid-position absolute zIndex">
        {grid}
    </div>
}

export default memo(GridGame)