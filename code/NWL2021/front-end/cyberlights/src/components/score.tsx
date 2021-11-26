import React, { useState, useEffect } from 'react';
import { socket } from "../api";


export const Score = () => {
    const [score, setScore] = useState<number>(0);

    useEffect(() => {
        socket.on("score", setScore);
        return () => {
            socket.off("score");
        }
    }, [])

    return <div className={`score text-sm text-gray-400  h-8 w-7/12 p-2 overflow-hidden text-right `}>
        Score:{score.toString().length > 15 ? `${score.toString().slice(0, 15)}...` : score}
    </div>
}