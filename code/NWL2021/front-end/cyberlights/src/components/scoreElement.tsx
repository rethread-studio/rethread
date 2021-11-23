import React, { useEffect, useState } from 'react';

interface IScoreElement {
    score: number,
    events: any,
    pos: number,
}

export const ScoreElement = ({ score, events, pos }: React.PropsWithChildren<IScoreElement>) => {
    const [eventList, setEventList] = useState<string>("")

    useEffect(() => {
        if (!events) return;

        const e: any[] = [];
        for (const key of Object.keys(events)) {
            e.push(`${key}:${events[key]}`);
        }

        setEventList(e.join(" "));

    }, [events]);

    useEffect(() => {
        let animate: any = null;
        if (eventList.length > 40) {
            animate = setInterval(() => {
                const letter: string = eventList.charAt(0);
                const nList: string = eventList.substring(1);
                setEventList(`${nList}${letter}`)
            }, 200)
        }

        return () => {
            if (animate !== null) clearInterval(animate);
        }
    }, [eventList])


    return <div className="mb-2" >
        <div className="flex flex-row justify-between px-4 uppercase text-neon-yellow ">
            <div>{pos}.</div>
            <div>{score}</div>
        </div>
        <p style={{ width: '600px' }} className="overflow-hidden overflow-ellipsis text-sm text-gray-400 max-h-6 px-4 uppercase ">
            {eventList}
        </p>
    </div>
}