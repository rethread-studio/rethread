import React from "react";
import { Link } from "react-router-dom";

import {
    IconLookup,
    IconDefinition,
    findIconDefinition
} from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ArrowBtn } from "./arrowBtn";


export const GameController = () => {

    const chevronLookLeft: IconLookup = { prefix: 'fas', iconName: 'chevron-left' };
    const chevronLeft: IconDefinition = findIconDefinition(chevronLookLeft);
    const score: string = "00334";

    return (

        <div className="h-full w-full p-4">
            <div className="h-full border-2 white flex flex-col justify-between">

                <div className="flex flex-row justify-between">

                    <Link to={"/select"} className="text-gray-900 bg-white h-8 w-3/6 pl-4 pt-1">
                        <FontAwesomeIcon className="yellow-300 " icon={chevronLeft} /> Back to select
                    </Link>

                    <span className="text-white pt-1 pr-4">{score}</span>
                </div>

                <img className="w-4/4 h-auto mx-auto transform rotate-45" src="./characterTest.png" alt="Tu youyou" />

                <div className="flex w-full flex-col justify-center items-center space-y-2 ">

                    <ArrowBtn direction="up" />

                    <div className="flex flex-row space-x-2">
                        <ArrowBtn direction="left" />
                        <ArrowBtn direction="down" />
                        <ArrowBtn direction="right" />
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