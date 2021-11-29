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

    return <div className={`score text-sm text-gray-200  h-8 p-2 overflow-hidden text-center `}>
        Score: {score}
    </div>
}