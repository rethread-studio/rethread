import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    IconLookup,
    IconDefinition,
    findIconDefinition
} from '@fortawesome/fontawesome-svg-core';
import { sliderBtnI } from '../types';

export type Ref = HTMLButtonElement;

export const SliderBtn = (({ color, position, btnClass }: React.PropsWithChildren<sliderBtnI>) => {

    const chevronLookLeft: IconLookup = { prefix: 'fas', iconName: 'chevron-left' }
    const chevronLookRight: IconLookup = { prefix: 'fas', iconName: 'chevron-right' }
    const chevronLeft: IconDefinition = findIconDefinition(chevronLookLeft)
    const chevronRight: IconDefinition = findIconDefinition(chevronLookRight)


    return (
        <button className={`${btnClass} absolute h-full w-7 top-8 z-10  ${position === "RIGHT" ? "right-2" : "left-2"}`}>
            <FontAwesomeIcon className={`${color} text-3xl`} icon={position === "RIGHT" ? chevronRight : chevronLeft} />
        </button>
    )
})