import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useHistory } from "react-router-dom";
import { v4 as uuidv4 } from 'uuid';
import {
    IconLookup,
    IconDefinition,
    findIconDefinition
} from '@fortawesome/fontawesome-svg-core';

import { InfoCard } from "./infoCard";
import { CharacterCard } from "./characterCard";

import { laureateI, selectCharacterProps, prize } from "../types";

import SwiperCore, { Navigation, Pagination } from "swiper";
import { Swiper, SwiperSlide } from "swiper/react";

// Import Swiper styles
import 'swiper/swiper.min.css';

const prizesToString = (p: prize) => {
    return (
        <>
            <h3>{p.category} {p.year}</h3>
            <p>{p.motivation}</p>
        </>
    )
}

SwiperCore.use([Navigation, Pagination]);

export const SelectCharacter = ({ characters, selectHandler }: React.PropsWithChildren<selectCharacterProps>) => {
    let history = useHistory();

    const [viewBio, setViewBio] = useState<boolean>(false);
    const [characterPrizes, setCharacterPrizes] = useState<prize[]>([])
    const [color, selectColor] = useState<string>("yellow-300")

    const chevronLookLeft: IconLookup = { prefix: 'fas', iconName: 'chevron-left' }
    const chevronLookRight: IconLookup = { prefix: 'fas', iconName: 'chevron-right' }
    const chevronLeft: IconDefinition = findIconDefinition(chevronLookLeft)
    const chevronRight: IconDefinition = findIconDefinition(chevronLookRight)

    const handleClick = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => { setViewBio(!viewBio); }

    const handleSelect = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => { history.push("/play") }



    return (
        <div className={`h-screen transition-all duration-200 text-${color} overflow-hidden flex flex-col justify-between relative border-8 border-${color} `}>


            <div className="">
                <div className={`flex flex-row h-8 justify-between content-center transition-all duration-200 bg-${color} px-1 pb-1.5`}>
                    <h4 className="text-gray-900 text-sm uppercase" >woman in science</h4>
                    <span className="fraction text-gray-900 text-sm uppercase"></span>
                </div>
                <Swiper
                    initialSlide={Math.random() * characters.length}
                    loop={true}
                    spaceBetween={50}
                    slidesPerView={1}
                    onSlideChange={(SwiperCore) => {
                        const { realIndex, } = SwiperCore;
                        setCharacterPrizes(characters[realIndex].prizes);
                        selectHandler(realIndex);
                        selectColor(realIndex % 2 === 0 ? "neonyellow-300" : "neongreen-300")
                    }}
                    navigation={{
                        prevEl: '.prev',
                        nextEl: '.next',
                    }}
                    pagination={{
                        el: ".fraction",
                        "type": "fraction"
                    }}
                >
                    {characters.map((c: laureateI) => {
                        return (
                            <SwiperSlide key={uuidv4()} >
                                <CharacterCard fullName={`${c.firstname} ${c.surname}`} img={c.img} prizes={c.prizes} />
                            </SwiperSlide>
                        )
                    })}

                </Swiper>
            </div>

            <button className="prev absolute h-full w-7 top-0 z-10 left-2">
                <FontAwesomeIcon className={`transition-all duration-200 ${color} text-3xl`} icon={chevronLeft} />
            </button>
            <button className="next absolute h-full w-7 top-0 z-10 right-2">
                <FontAwesomeIcon className={`transition-all duration-200 ${color} text-3xl`} icon={chevronRight} />
            </button>

            <button className="w-full text-center mx-auto uppercase pt-8 pb-8 " onClick={handleClick}>My discovery</button>


            <button className={`text-5xl text-center transition-all duration-200 text-${color} uppercase border-t-4 border-${color} pt-4 pb-4 w-full place-self-end z-20`} onClick={handleSelect}>
                select
            </button>

            {viewBio ? <InfoCard prizes={characterPrizes} color={color} clickHandler={handleClick} /> : <></>}

        </div>
    )
}