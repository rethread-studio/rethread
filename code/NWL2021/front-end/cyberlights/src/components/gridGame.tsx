import React, { memo, useEffect, useState } from 'react';
import Tile from './tile';
import { socket } from "../api";
import { isWall, isAnswer } from "../utils";

interface IGridGame {
    state: any,
}

const GridGame = ({ state }: React.PropsWithChildren<IGridGame>) => {
    const [tileSize, setTileSize] = useState(0);
    const [position, setPosition] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
    const [answerPositions, setAnswerPositions] = useState<[{ x: number; y: number }] | null>(null);

    socket.on("question", (data) => setAnswerPositions(data.answerPositions));
    socket.on("move", setPosition);
    useEffect(() => {
        console.log("new question")
        return (() => {
            socket.off("question");
            socket.off("move");
        })
    }, [setPosition]);

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
                <Tile tileSize={tileSize} isActive={(position.y === i && position.x === j)} isWall={isWall(j, i, state)} isAnswer={isAnswer(j, i, answerPositions)} />
            </>
        }
        grid = <>{grid}<div className="grid-line">{line}</div></>
    }

    return <div className="grid-position absolute zIndex">
        {grid}
    </div>
}

export default memo(GridGame)