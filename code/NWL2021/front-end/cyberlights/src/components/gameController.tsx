import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
    IconLookup,
    IconDefinition,
    findIconDefinition
} from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ArrowBtn } from "./arrowBtn";
import { socket } from "../api";
import { gameControllerI, controllDirection } from "../types";

export const GameController = ({ charactersList, characterIndex }: React.PropsWithChildren<gameControllerI>) => {
    const [answer, setAnswer] = useState<boolean>(false);
    const [question, setQuestion] = useState<string | null>(null);
    const [currentDirection, setCurrentDirection] = useState<controllDirection>("void")

    const chevronLookLeft: IconLookup = { prefix: 'fas', iconName: 'chevron-left' };
    const chevronLeft: IconDefinition = findIconDefinition(chevronLookLeft);



    socket.on("question", (question) => { setQuestion(question.text) });

    socket.on("gameStateUpdate", (status) => { setAnswer(status.inQuestion) })

    //load characters data
    useEffect(() => {
        const laureate = {
            name: charactersList[characterIndex].firstname,
            domain: charactersList[characterIndex].bornCountry,
            year: charactersList[characterIndex].bornDate,
            country: charactersList[characterIndex].bornCountry,
            color: "#ffe879",
            img: charactersList[characterIndex].imagePath,
            shadowImg: "/img/laureateShadow.png",
            dialogue: "/img/dialogue.png"
        };
        socket.emit("start", laureate);

        return () => {
            console.log("disconnect")
            // socket.emit("disconnect");
        }

    }, [charactersList, characterIndex]);



    const emitDirection = (direction: controllDirection) => {
        setCurrentDirection(direction)
        socket.emit(direction);
    }

    const rotation: string = currentDirection === "up" ? "-translate-y-6" :
        currentDirection === "down" ? "translate-y-6" :
            currentDirection === "void" ? "rotate-0" :
                currentDirection === "left" ? "-rotate-45 -translate-x-8" :
                    currentDirection === "right" ? "rotate-45 translate-x-8" : "rotate-0";

    return (

        <div className="h-full w-full p-4">
            <div className="h-full border-2 white flex flex-col justify-between">

                <div className="flex flex-row justify-between text-sm">

                    <Link to={"/select"} className="text-gray-900 bg-white h-8 w-4/8 p-2 uppercase">
                        <FontAwesomeIcon className="yellow-300" icon={chevronLeft} /> Back to select
                    </Link>
                </div>
                <div className="w-full text-neon text-xl uppercase text-center pt-4 ">
                    {question !== null ? <span>{question}</span> : <></>}
                </div>
                <div className="relative h-full flex flex-col justify-center content-center">

                    <img onClick={() => { console.log("emote") }} className={`w-3/3 h-auto mx-auto transition-all duration-200 transform ${rotation}`} src={`/img/laureates/${charactersList[characterIndex].imagePath}`} alt="Tu youyou" />


                </div>

                <div className="flex w-full flex-col justify-center items-center space-y-2 place-self-end">
                    <ArrowBtn clickEvent={emitDirection} direction="up" />
                    <div className="flex flex-row space-x-2">
                        <ArrowBtn clickEvent={emitDirection} direction="left" />
                        <ArrowBtn clickEvent={emitDirection} direction="down" />
                        <ArrowBtn clickEvent={emitDirection} direction="right" />
                    </div>
                </div>

                <div className="flex flex-row w-full justify-between text-white place-self-end p-4">
                    <span className="text-xs uppercase">PRESS THE arrows <br /> to move </span>
                    <span className="text-xs text-right uppercase place-self-end ">Tap CHARACTER  <br />to emote</span>
                </div>
            </div>
        </div>
    )
}
