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
import { laureateI, selectCharacterProps } from "../types";

import SwiperCore, { Navigation, Pagination } from "swiper";
import { Swiper, SwiperSlide } from "swiper/react";

// Import Swiper styles
import 'swiper/swiper.min.css';



SwiperCore.use([Navigation, Pagination]);

export const SelectCharacter = ({ characters, selectHandler }: React.PropsWithChildren<selectCharacterProps>) => {
    let history = useHistory();

    const [viewBio, setViewBio] = useState(false);
    const [characterBio, setCharacterBio] = useState<string>(characters[0].born)
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
                        setCharacterBio(characters[realIndex].born);
                        selectHandler(realIndex);
                        selectColor(realIndex % 2 === 0 ? "neonyellow-300" : "neongreen-300")
                    }}
                    onSwiper={() => console.log()}
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
                        const fullName: string = `${c.firstname} ${c.surname}`;
                        return (
                            <SwiperSlide key={uuidv4()} >
                                <h2 className={`text-center uppercase py-8 px-4 ${fullName.length >= 14 ? "text-2xl" : "text-4xl"}`}>{`${c.firstname} ${c.surname}`}</h2>
                                <img className="w-3/5 h-3/5 mx-auto" src={`./img/laureate.png`} alt={c.firstname} />
                                <p className="text-center text-white text-xl pt-8  w-4/5 m-auto">{c.gender}<br /> <span className="text-2xl mt-4">2015</span></p>
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


            <button className={`text-7xl text-center transition-all duration-200 text-${color} uppercase border-t-4 border-${color} pt-4 pb-4 w-full place-self-end z-20`} onClick={handleSelect}>
                select
            </button>

            {viewBio ? <InfoCard bio={characterBio} color={color} clickHandler={handleClick} /> : <></>}

        </div>
    )
}