import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Link } from "react-router-dom";

import {
    IconLookup,
    IconDefinition,
    findIconDefinition
} from '@fortawesome/fontawesome-svg-core';

import { InfoCard } from "./infoCard";
import { selectCharacterProps, prize } from "../types";
import { categoryColor } from "../utils";
import Gallery from "./gallery";
import { useWindowHeight } from "../hooks/windowHeight";



export const SelectCharacter = ({ characters, selectHandler, setCharacterIndex }: React.PropsWithChildren<selectCharacterProps>) => {

    const [viewBio, setViewBio] = useState<boolean>(false);
    const [characterPrizes, setCharacterPrizes] = useState<prize[]>([])
    const [color, selectColor] = useState<string>(categoryColor.physics)
    const { height } = useWindowHeight();

    const chevronLookLeft: IconLookup = { prefix: 'fas', iconName: 'chevron-left' }
    const chevronLookRight: IconLookup = { prefix: 'fas', iconName: 'chevron-right' }
    const chevronLeft: IconDefinition = findIconDefinition(chevronLookLeft)
    const chevronRight: IconDefinition = findIconDefinition(chevronLookRight)

    const handleClick = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => { setViewBio(!viewBio); }


    return (
        <div style={{ height: `${height}px` }} className="w-full p-4">
            <div style={{
                color: color,
                boxShadow: `0 0 .3rem #fff,
            inset 0 0 .3rem #fff,
            0 0 1rem ${color},
            inset 0 0 2rem ${color},
            0 0 0.5rem ${color},
            inset 0 0 0.5rem ${color}`
            }} className={`h-full transition-all duration-200  overflow-hidden flex flex-col justify-between relative border-2 border-white `}>

                <div>
                    <div className={`flex flex-row h-8 justify-between content-center transition-all duration-200 text-gray-400 px-3 pt-2 pb-1.5 text-sm font-light`}>
                        <Link to={"/home"} className="text-yellow-300  h-8 w-4/8 ">
                            <FontAwesomeIcon className="yellow-300 text-xs" icon={chevronLeft} /> Home
                        </Link>
                        <div>
                            <h4 className=" capsize " >Laureates <span className="fraction  uppercase"></span></h4>
                        </div>
                    </div>

                    <Gallery setCharacterIndex={setCharacterIndex} setCharacterPrizes={setCharacterPrizes} selectColor={selectColor} characters={characters} />
                </div>

                <button className="prev absolute h-full w-7 top-0 z-10 left-2">
                    <FontAwesomeIcon className={`transition-all duration-200 text-gray-300 text-base`} icon={chevronLeft} />
                </button>

                <button className="next absolute h-full w-7 top-0 z-10 right-2">
                    <FontAwesomeIcon className={`transition-all duration-200 text-gray-300 text-base`} icon={chevronRight} />
                </button>


                <button style={{ borderColor: color }} className="cursor-pointer border-2 w-3/6 border-opacity-40 opacity-80 text-center mx-auto normal-case font-light py-2 mb-2" onClick={handleClick}>my discovery</button>

                <button style={{ backgroundColor: color }} className={`cursor-pointer text-2xl  w-3/6 text-center transition-all duration-200 lowercase  py-2 px-4 mb-6 mx-auto place-self-end z-20`} onClick={selectHandler}>
                    <span className="text-gray-900 font-light">select</span>
                </button>

                {viewBio ? <InfoCard prizes={characterPrizes} color={color} clickHandler={handleClick} /> : <></>}

            </div>
        </div>
    )
}