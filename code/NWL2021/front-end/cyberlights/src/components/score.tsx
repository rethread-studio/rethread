import React, { useState, useEffect } from 'react';
import { socket } from "../api";


export const Score = () => {
    const [score, setScore] = useState<number>(0);
    socket.on("score", setScore);

    useEffect(() => {
        return () => {
            socket.off("score");
        }
    })

    return <div className={`score text-sm text-gray-400  h-8 w-7/12 p-2 overflow-hidden text-right `}>
        {score.toString().length > 15 ? `Score: ${score.toString().slice(0, 15)}...` : score}
    </div>
}