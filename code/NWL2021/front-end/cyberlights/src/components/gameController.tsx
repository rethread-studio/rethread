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
import { categoryColor } from "../utils";

export const GameController = ({ charactersList, characterIndex }: React.PropsWithChildren<gameControllerI>) => {
    const [answer, setAnswer] = useState<string | null>(null);
    const [question, setQuestion] = useState<string | null>(null);
    const [currentDirection, setCurrentDirection] = useState<controllDirection>("void")
    const [color, setcolor] = useState<string>(categoryColor.physics)
    const chevronLookLeft: IconLookup = { prefix: 'fas', iconName: 'chevron-left' };
    const chevronLeft: IconDefinition = findIconDefinition(chevronLookLeft);

    socket.on("question", (question) => { setQuestion(question) });
    socket.on("enterAnswer", ({ answer, question }) => { setAnswer(answer) })
    socket.on("exitAnswer", ({ answer, question }) => { setAnswer(null) })

    //load characters data
    useEffect(() => {
        const laureateData = charactersList[characterIndex];
        const keyCategory: string = laureateData.prizes.length > 1 ? "special" : laureateData.prizes[0].category as string;
        setcolor(categoryColor[keyCategory]);
        const laureate = {
            name: laureateData.firstname,
            domain: laureateData.bornCountry,
            year: laureateData.bornDate,
            country: laureateData.bornCountry,
            color: categoryColor[keyCategory],
            img: `/img/laureates/${laureateData.imagePath}`,
            shadowImg: "/img/laureateShadow.png",
            dialogue: "/img/dialogue.png"
        };
        socket.emit("start", laureate);

        return () => {
            socket.emit("leave");
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
            <div className="h-full border-2 border-gray-600 flex flex-col justify-between ">

                <div className="flex flex-row justify-between text-sm">
                    <Link to={"/select"} className="text-gray-400  h-8 w-4/8 p-2 ">
                        <FontAwesomeIcon className="yellow-300 text-xs" icon={chevronLeft} /> Back to select
                    </Link>
                </div>
                <div className="w-full text-neon text-2xl uppercase text-center pt-2 ">
                    {question !== null ? <span>{question}</span> : <></>}
                </div>
                <div className="relative h-full flex flex-col justify-center content-center">
                    {answer !== null ? <div className={`answer absolute px-6 py-2 top-1/4 left-2/4 z-20 left-0 bg-white text-black text-xl rounded-xl transition-all duration-200 transform ${rotation}`}>{answer}</div> : <></>}
                    <img onClick={() => { socket.emit("emote") }} className={`w-3/5 h-auto mx-auto transition-all duration-200 transform ${rotation}`} src={`/img/laureates/${charactersList[characterIndex].imagePath}`} alt={charactersList[characterIndex].firstname} />
                </div>

                <div className="flex w-full flex-col justify-center items-center space-y-2 place-self-end">
                    <ArrowBtn clickEvent={emitDirection} direction="up" color={color} />
                    <div className="flex flex-row space-x-2">
                        <ArrowBtn clickEvent={emitDirection} direction="left" color={color} />
                        <ArrowBtn clickEvent={emitDirection} direction="down" color={color} />
                        <ArrowBtn clickEvent={emitDirection} direction="right" color={color} />
                    </div>
                </div>

                <div className="flex flex-row w-full justify-between text-gray-400 place-self-end p-4">
                    <span className="text-xs ">Press the arrows <br /> to move </span>
                    <span className="text-xs text-right  place-self-end ">Tap the character  <br />to emote</span>
                </div>
            </div>
        </div>
    )
}
