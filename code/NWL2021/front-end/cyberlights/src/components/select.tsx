import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Link } from "react-router-dom";
import {
    IconLookup,
    IconDefinition,
    findIconDefinition
} from '@fortawesome/fontawesome-svg-core'
import { InfoCard } from "./infoCard";
import { laureateI } from '../api';
import { Swiper, SwiperSlide } from "swiper/react";

// Import Swiper styles
import 'swiper/swiper.min.css';

interface selectCharacterProps {
    characters: laureateI[]
}

export const SelectCharacter = ({ characters }: React.PropsWithChildren<selectCharacterProps>) => {

    const [viewBio, setViewBio] = useState(false);
    const [currentPos, setCurrentPos] = useState(1);

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
                <span className="text-gray-900 text-sm uppercase">{currentPos}/{characters.length}</span>
            </div>


            <div className="h-3/5 place-self-stretch">

                <Swiper
                    spaceBetween={50}
                    slidesPerView={1}
                    onSlideChange={() => console.log('slide change')}
                    onSwiper={() => console.log()}
                >
                    {characters.map((c: laureateI) => {
                        console.log(c)
                        return (
                            <SwiperSlide>
                                <h2 className="text-center uppercase text-4xl py-8 px-4">{`${c.firstname} ${c.surname}`}</h2>
                                <img className="w-3/4 h-auto mx-auto" src={`./img/laureate.png`} alt={c.firstname} />
                                <p className="text-center text-white text-xl pt-8  w-4/5 m-auto">{c.gender}<br /> <span className="text-2xl mt-4">2015</span></p>
                            </SwiperSlide>
                        )
                    })}


                </Swiper>

            </div>

            <button className="w-full text-center mx-auto uppercase pt-8 " onClick={handleClick}>My discovery</button>


            <Link to={"/play"} className={`text-7xl text-center text-${color} uppercase border-t-4 border-${color} pt-4 pb-4 w-full place-self-end`}>
                select
            </Link>

            {viewBio ? <InfoCard bio={bio} color={color} clickHandler={handleClick} /> : <></>}

            <button className="absolute left-2 h-full w-7 top-8 z-10 " onClick={() => { console.log("ARROW") }}>
                <FontAwesomeIcon className={`${color} text-3xl`} icon={chevronLeft} />
            </button>
            <button className="absolute right-2 h-full w-7 top-8 z-10  " onClick={() => { console.log("ARROW") }}>
                <FontAwesomeIcon className={`${color} text-3xl`} icon={chevronRight} />
            </button>

        </div>
    )
}