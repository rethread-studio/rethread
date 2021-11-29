import React, { MouseEvent } from "react";
import {
    IconLookup,
    IconDefinition,
    findIconDefinition,
    IconName,
} from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";


interface arrowProps {
    direction: "up" | "down" | "right" | "left",
    clickEvent(direction: string): void,
    color: string
}

export const ArrowBtn = ({ direction, clickEvent, color }: React.PropsWithChildren<arrowProps>) => {
    const chevronDir: IconName = `chevron-${direction}`;
    const chevronLook: IconLookup = { prefix: 'fas', iconName: chevronDir };
    const chevron: IconDefinition = findIconDefinition(chevronLook);

    const clickHandler = (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        clickEvent(direction);
    };

    return (
        <button style={{
            boxShadow: `0 0 .3rem #fff,
            inset 0 0 .3rem #fff,
            0 0 1rem ${color},
            inset 0 0 2rem ${color},
            0 0 0.5rem ${color},
            inset 0 0 0.5rem ${color}`
        }} onClick={clickHandler} className="w-20 h-20 border-2 white flex justify-center items-center">
            <FontAwesomeIcon className="text-white text-xl" icon={chevron} />
        </button>
    )
}