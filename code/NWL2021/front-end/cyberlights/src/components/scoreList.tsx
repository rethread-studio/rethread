import React, { useEffect, useState } from "react";
import { getPersonalScore, getScore } from "../api";
import { IUserPersonalScore, IUserScore } from "../types";
import { ScoreElement } from "./scoreElement";
import { v4 as uuidv4 } from 'uuid';
import { downloadFile } from "../utils";

interface IScoreInterface {
    clickHandler: any,
    userScore: number
}

export const ScoreList = ({ clickHandler, userScore }: React.PropsWithChildren<IScoreInterface>) => {
    const [score, setScore] = useState<IUserScore[]>([]);
    const [userEvents, setUserEvents] = useState({})
    const [userData, setUserData] = useState({});
    const topNumber: number = 3;

    useEffect(() => {
        getScore().then(scoreList => scoreList.length > topNumber ? scoreList.slice(0, topNumber) : scoreList)
            .then(scoreList => scoreList.sort((a: IUserScore, b: IUserScore) => b.score - a.score))
            .then(scoreList => {
                setScore(scoreList);
            }, error => {
                console.log(error);
                clickHandler(false);
            })
        getPersonalScore()
            .then((myScore: IUserPersonalScore) => {
                setUserData(myScore);
                setUserEvents(myScore.events)
            }, error => {
                console.log(error);
                clickHandler(false);
            })
        return () => { }
    }, [clickHandler]);


    const exportToJson = (e: any) => {
        e.preventDefault()
        downloadFile(
            JSON.stringify(userData),
            'users.json',
            'text/json',
        );
    }

    return <div className="h-full w-full p-4 fixed top-0 left-0 bg-gray-900 z-40">
        <div className="h-full border-2 border-gray-600 relative flex flex-col justify-start overflow-hidden">
            <div className="flex flex-row justify-end text-sm content-center pt-2">
                <button onClick={() => { clickHandler(false) }} className="text-sm text-gray-400 border-2 border-gray-500 rounded-full w-7 h-7 mr-2" >X</button>
            </div>
            <div className={`w-full text-neon "text-2xl" uppercase text-center pt-2 mb-4`}>
                {`Top ${score.length} players`}
            </div>
            {score.map((s: IUserScore, i: number) => <ScoreElement key={uuidv4()} score={s.score} events={s.events} pos={i + 1} />)}

            <div className={`w-full text-neon "text-2xl" uppercase text-center pt-2`}>
                {`Your score`}
            </div>
            <div className="text-neon-yellow px-4 text-3xl">
                {userScore}
            </div>
            <div>
                {/* {userEvents} */}
            </div>


            <div className="flex flex-row justify-between mt-4">
                <button onClick={exportToJson} style={{ borderColor: "#f6d465" }} className={`h-20 border-2 w-2/6 border-opacity-40 opacity-80 text-center mx-auto normal-case font-light py-2 mb-2 text-base`} >
                    <span style={{ color: "#f6d465" }} className="font-light ">Download score</span>
                </button>
                <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ&ab_channel=RickAstley" target="_blank" rel='noreferrer' style={{ backgroundColor: "#f6d465" }} className={`h-20 text-base  w-2/6 text-center transition-all duration-200 normal-case py-2 mb-6 mx-auto place-self-end z-20`}>
                    <span className="text-gray-900 font-light ">Claim<br></br>award</span>
                </a>

            </div>
        </div>

    </div>;
}