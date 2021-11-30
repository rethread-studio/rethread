import React, { memo, useEffect, useState } from 'react';
import { socket } from "../api";

const Question = () => {
    const [question, setQuestion] = useState<string | null>(null);

    useEffect(() => {
        socket.on("question", (data) => { setQuestion(data.question); });
        return (() => {
            socket.off("question");
        })
    })

    return <div className={`w-full text-neon ${question !== null && question?.length > 60 ? "text-md" : "text-2xl"} uppercase text-center pt-2`}>
        {question !== null ? <span>{question}</span> : <></>}
    </div>
}

export default memo(Question);