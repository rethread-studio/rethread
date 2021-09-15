import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Link } from "react-router-dom";
import {
    IconLookup,
    IconDefinition,
    findIconDefinition
} from '@fortawesome/fontawesome-svg-core'


export const SelectCharacter = () => {
    const chevronLookLeft: IconLookup = { prefix: 'fas', iconName: 'chevron-left' }
    const chevronLookRight: IconLookup = { prefix: 'fas', iconName: 'chevron-right' }
    const chevronLeft: IconDefinition = findIconDefinition(chevronLookLeft)
    const chevronRight: IconDefinition = findIconDefinition(chevronLookRight)


    return (
        <div className="h-screen text-yellow-300 flex flex-col justify-between relative border-8 border-yellow-300">

            {/* // TOP SECTION */}
            <div className="flex flex-row justify-between bg-yellow-300 text-gray-900">
                <h4>woman in science</h4>
                <span>01/15</span>
            </div>
            {/* //GALLERY */}
            <div className="h-3/5 ">

                <h2 className="text-center">Tu youyou</h2>
                <img className="w-3/4 h-auto mx-auto" src="./characterTest.png" alt="Tu youyou" />

                <button className="w-full text=center mx-auto" onClick={() => { console.log("hello") }}>My discovery</button>

            </div>

            <div className="flex flex-row flex-grow border-t-4 border-yellow-300  place-self-end">
                <img className="p-4" src="./capsule.png" alt="medicine nobel" />
                <div className="h-full p4 border-l-4 border-yellow-300">
                    <p>Nobel Prize in Physiology or Medicine 2015</p>
                </div>
            </div>

            <Link to={"/play"} className="text-7xl text-center text-yellow-300 uppercase border-t-4 border-yellow-300 pt-4 pb-4 w-full place-self-end">
                select
            </Link>



            <button className="absolute left-0 h-3/5 w-7 top-0 " onClick={() => { console.log("ARROW") }}>
                <FontAwesomeIcon className="yellow-300 " icon={chevronLeft} />
            </button>
            <button className="absolute right-0 h-3/5 w-7 top-0  " onClick={() => { console.log("ARROW") }}>
                <FontAwesomeIcon className="yellow-300" icon={chevronRight} />
            </button>
        </div>
    )
}