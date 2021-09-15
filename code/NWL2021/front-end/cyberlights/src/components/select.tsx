import Reac, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Link } from "react-router-dom";
import {
    IconLookup,
    IconDefinition,
    findIconDefinition
} from '@fortawesome/fontawesome-svg-core'
import { InfoCard } from "./infoCard";


export const SelectCharacter = () => {

    const [viewBio, setViewBio] = useState(false);

    const chevronLookLeft: IconLookup = { prefix: 'fas', iconName: 'chevron-left' }
    const chevronLookRight: IconLookup = { prefix: 'fas', iconName: 'chevron-right' }
    const chevronLeft: IconDefinition = findIconDefinition(chevronLookLeft)
    const chevronRight: IconDefinition = findIconDefinition(chevronLookRight)

    const color: string = "yellow-300"
    const bio: string = "Tu Youyou turned to Chinese medical texts from the Zhou, Qing, and Han Dynasties to find a traditional cure for malaria, ultimately extracting a compound – artemisinin – that has saved millions of lives. When she isolated the ingredient she believed would work, she volunteered to be the first human subject. She is the first mainland Chinese scientist to have received a Nobel Prize in a scientific category, and she did so without a doctorate, a medical degree, or training abroad."

    const handleClick = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => { setViewBio(!viewBio); }

    return (
        <div className={`h-screen text-${color} overflow-hidden flex flex-col justify-between relative border-8 border-${color} `}>


            <div className={`flex flex-row h-8 justify-between content-center bg-${color} px-1`}>
                <h4 className="text-gray-900 text-sm uppercase" >woman in science</h4>
                <span className="text-gray-900 text-sm uppercase">01/15</span>
            </div>


            <div className="h-3/5 ">

                <h2 className="text-center uppercase text-5xl py-8">Tu youyou</h2>
                <img className="w-4/4 h-auto mx-auto" src="./characterTest.png" alt="Tu youyou" />




                <p className="text-center text-white text-xl pt-8  w-4/5 m-auto">Nobel Prize in Physiology or Medicine <br /> <span className="text-2xl mt-4">2015</span></p>
            </div>

            <button className="w-full text-center mx-auto uppercase pt-8 " onClick={handleClick}>My discovery</button>
            {/* <div className={`flex flex-row flex-grow border-t-4 border-${color}  place-self-end`}>
                <img className="p-4" src="./capsule.png" alt="medicine nobel" />
                <div className={`h-full p4 border-l-4 border-${color}`}>
                    <p>Nobel Prize in Physiology or Medicine 2015</p>
                </div>
            </div> */}

            <Link to={"/play"} className={`text-7xl text-center text-${color} uppercase border-t-4 border-${color} pt-4 pb-4 w-full place-self-end`}>
                select
            </Link>

            {viewBio ? <InfoCard bio={bio} color={color} clickHandler={handleClick} /> : <></>}

            <button className="absolute left-2 h-full w-7 top-8 " onClick={() => { console.log("ARROW") }}>
                <FontAwesomeIcon className={`${color} text-3xl`} icon={chevronLeft} />
            </button>
            <button className="absolute right-2 h-full w-7 top-8  " onClick={() => { console.log("ARROW") }}>
                <FontAwesomeIcon className={`${color} text-3xl`} icon={chevronRight} />
            </button>

        </div>
    )
}