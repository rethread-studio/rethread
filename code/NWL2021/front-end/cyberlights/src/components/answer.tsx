import React, { useEffect, useState } from 'react';
import { socket } from "../api";

export const Answer = () => {
    const [answer, setAnswer] = useState<string | null>(null);
    socket.on("enterAnswer", ({ answer }) => {
        setAnswer(answer);
        // window.navigator.vibrate(200);
    });
    socket.on("exitAnswer", ({ answer, question }) => { setAnswer(null) });
    useEffect(() => {

        return (() => {
            socket.off("enterAnswer");
            socket.off("exitAnswer");
        })
    }, [])
    return <>
        {answer !== null ? <div className={`answer absolute px-6 py-2 top-1/4 left-2/4 z-20 left-0 bg-white text-black text-xl rounded-xl `}>{answer}</div> : <></>}
    </>
}