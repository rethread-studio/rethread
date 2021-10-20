import React, { useEffect, useState } from "react";
import { Link, useHistory } from "react-router-dom";

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

export const GameController = ({ laureate, selectHandler }: React.PropsWithChildren<gameControllerI>) => {
    const history = useHistory();
    const [answer, setAnswer] = useState<string | null>(null);
    const [question, setQuestion] = useState<string | null>(null);
    const [currentDirection, setCurrentDirection] = useState<controllDirection>("void")
    const [color, setColor] = useState<string>(categoryColor.physics)
    const chevronLookLeft: IconLookup = { prefix: 'fas', iconName: 'chevron-left' };
    const chevronLeft: IconDefinition = findIconDefinition(chevronLookLeft);

    socket.on("question", (question) => { setQuestion(question) });
    socket.on("enterAnswer", ({ answer, question }) => { setAnswer(answer) });
    socket.on("exitAnswer", ({ answer, question }) => { setAnswer(null) });
    socket.on("leave", () => { history.push("/") });

    
    //load characters data
    useEffect(() => {
        if (laureate == null) {
            return history.push("/select");
        }
        const keyCategory: string = laureate.prizes.length > 1 ? "special" : laureate.prizes[0].category as string;
        setColor(categoryColor[keyCategory]);
        
        socket.emit("start", laureate);
        
        const pressHandler = ({ key }: { key: string }) => {
            if (key === "ArrowDown") {
                return emitDirection("down")
            }
            if (key === "ArrowUp") {
                return emitDirection("up")
            }
            if (key === "ArrowLeft") {
                return emitDirection("left")
            }
            if (key === "ArrowRight") {
                return emitDirection("right")
            }
        }
        window.addEventListener("keydown", pressHandler);

        return () => {
            socket.emit("leave");
            socket.off("leave");
            socket.off("enterAnswer");
            socket.off("exitAnswer");
            socket.off("question");
            window.removeEventListener("keydown", pressHandler);
        }
    }, [laureate, history, selectHandler]);



    const emitDirection = (direction: controllDirection) => {
        setCurrentDirection(direction)
        socket.emit(direction);
    }

    const rotation: string = currentDirection === "up" ? "-translate-y-6" :
        currentDirection === "down" ? "translate-y-6" :
            currentDirection === "void" ? "rotate-0" :
                currentDirection === "left" ? "-rotate-45 -translate-x-8" :
                    currentDirection === "right" ? "rotate-45 translate-x-8" : "rotate-0";

    const onClickBackButton = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => { selectHandler(null); };
    
    return (

        <div className="h-full w-full p-4">
            <div className="h-full border-2 border-gray-600 flex flex-col justify-between ">

                <div className="flex flex-row justify-between text-sm">
                    <Link to={"/select"} onClick={onClickBackButton} className="text-gray-400  h-8 w-4/8 p-2 ">
                        <FontAwesomeIcon className="yellow-300 text-xs" icon={chevronLeft} /> Back to select
                    </Link>
                </div>
                <div className="w-full text-neon text-2xl uppercase text-center pt-2 ">
                    {question !== null ? <span>{question}</span> : <></>}
                </div>
                <div className="relative h-full flex flex-col justify-center content-center">
                    {answer !== null ? <div className={`answer absolute px-6 py-2 top-1/4 left-2/4 z-20 left-0 bg-white text-black text-xl rounded-xl transition-all duration-200 transform ${rotation}`}>{answer}</div> : <></>}
                    <img onClick={() => { socket.emit("emote") }} className={`w-3/5 h-auto mx-auto transition-all duration-200 transform ${rotation}`} src={`/img/laureates/${laureate.imagePath}`} alt={laureate.firstname} />
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
