import React, { memo } from 'react';
import { isWall, isAnswer } from "../utils";
// import { areEqual } from '../utils';

interface ITile {
    tileSize: number,
    position: { x: number, y: number },
    answerPositions: [{ x: number, y: number }] | null,
    state: any,
    i: number,
    j: number
}

const Tile = ({ tileSize, position, i, j, state, answerPositions }: React.PropsWithChildren<ITile>) => {

    return <div
        style={{ width: `${tileSize}px`, height: `${tileSize}px` }}
        className={"grid-position-item " + ((position.y === i && position.x === j) ? "active " : " ") + (isWall(j, i, state) ? "wall " : " ") + (isAnswer(j, i, answerPositions) ? "grid-answer " : " ")}>
    </div>
}

export default memo(Tile);