import React, { memo } from 'react';
import SwiperCore, { Navigation, Pagination } from "swiper";
import { Swiper, SwiperSlide } from "swiper/react";
import { CharacterCard } from "./characterCard";
import { v4 as uuidv4 } from 'uuid';
import { laureateI } from '../types';


// Import Swiper styles
import 'swiper/swiper.min.css';

SwiperCore.use([Navigation, Pagination]);
interface IGallery {
    setCharacterIndex: any,
    setCharacterPrizes: any,
    selectColor: any,
    characters: laureateI[],
}
const Gallery = ({ characters, setCharacterIndex, setCharacterPrizes, selectColor }: React.PropsWithChildren<IGallery>) => {

    return <Swiper
        initialSlide={0}
        loop={true}
        spaceBetween={10}
        slidesPerView={1}
        allowTouchMove={true}
        longSwipes={false}
        onSlideChange={(SwiperCore) => {
            const { realIndex, } = SwiperCore;
            setCharacterIndex(realIndex);
            setCharacterPrizes(characters[realIndex].prizes);
            selectColor(characters[realIndex].color);
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
                    <CharacterCard key={uuidv4()} laureate={c} />
                </SwiperSlide>
            )
        })}

    </Swiper>
}
export default memo(Gallery);