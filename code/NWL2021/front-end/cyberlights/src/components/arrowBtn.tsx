import React from "react";
import {
    IconLookup,
    IconDefinition,
    findIconDefinition,
    IconName,
} from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";


interface arrowProps {
    direction: "up" | "down" | "right" | "left",
}

export const ArrowBtn = ({ direction }: React.PropsWithChildren<arrowProps>) => {
    const chevronDir: IconName = `chevron-${direction}`;
    const chevronLook: IconLookup = { prefix: 'fas', iconName: chevronDir };
    const chevron: IconDefinition = findIconDefinition(chevronLook);

    return (
        <button className="w-20 h-20 border-2 white flex justify-center items-center">
            <FontAwesomeIcon className="text-white text-xl" icon={chevron} />
        </button>
    )
}