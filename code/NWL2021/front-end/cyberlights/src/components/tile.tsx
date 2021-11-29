import React, { memo } from 'react';

interface ITile {
    tileSize: number,
    isActive: boolean,
    isWall: boolean,
    isAnswer: boolean
}

const Tile = ({ tileSize, isActive, isWall, isAnswer }: React.PropsWithChildren<ITile>) => {

    return <div
        style={{ width: `${tileSize}px`, height: `${tileSize}px` }}
        className={"grid-position-item " + (isActive ? "active " : " ") + (isWall ? "wall " : " ") + (isAnswer ? "grid-answer " : " ")}>
    </div>
}

export default memo(Tile);