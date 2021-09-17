import React from "react";
import { Link } from "react-router-dom";

import {
    IconLookup,
    IconDefinition,
    findIconDefinition
} from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ArrowBtn } from "./arrowBtn";
import { socket } from "../api";

export const GameController = () => {

    const chevronLookLeft: IconLookup = { prefix: 'fas', iconName: 'chevron-left' };
    const chevronLeft: IconDefinition = findIconDefinition(chevronLookLeft);
    const score: string = "00334";


    const laureate = {
        name: "Françoise Barré-Sinoussi",
        domain: "Physiology or Medicine",
        year: 2008,
        country: "France",
        img: "/img/laureate.png",
    };

    socket.emit("start", laureate);
    const emitDirection = (direction: string) => {
        console.log("hit", direction)
        socket.emit(direction);
    }

    return (

        <div className="h-full w-full p-4">
            <div className="h-full border-2 white flex flex-col justify-between">

                <div className="flex flex-row justify-between text-sm">

                    <Link to={"/select"} className="text-gray-900 bg-white h-8 w-4/8 p-2 uppercase">
                        <FontAwesomeIcon className="yellow-300" icon={chevronLeft} /> Back to select
                    </Link>

                    <span className="text-white p-2 pr-4">{score}</span>
                </div>

                <img onClick={() => { console.log("emote") }} className="w-3/3 h-auto mx-auto transform rotate-45" src="./characterTest.png" alt="Tu youyou" />

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