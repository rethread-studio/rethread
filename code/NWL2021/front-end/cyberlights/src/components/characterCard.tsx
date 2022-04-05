import React from "react";
import { characterCardProps } from '../types';
// import { v4 as uuidv4 } from 'uuid';
import { getFlag } from "../utils";
import { useWindowHeight } from "../hooks/windowHeight";

export const CharacterCard = ({ laureate }: React.PropsWithChildren<characterCardProps>) => {

    // const categories: JSX.Element[] = laureate.prizes
    //     .map((p: prize) => <p key={uuidv4()}>{p.category} - {p.year}</p>)

    const fullName = `${laureate.firstname}  ${laureate.surname}`
    // const iconLocation: string = laureate.prizes.length > 1 ? getIcon("special") : getIcon(laureate.prizes[0].category);
    const { height } = useWindowHeight();

    return (
        <>
            <img className={`${height && height < 600 ? "w-2/6 h-2/6" : "w-4/6 h-4/6"} mx-auto mt-8`} src={`/img/laureates/${laureate.imagePath}`} alt={fullName} />

            <h2 style={{ color: `${laureate.color}` }} className={`text-center pt-4 pb-2 px-4 font-light ${fullName.length >= 14 ? "text-2xl" : "text-2xl"}`}>
                {laureate.firstname}<br></br>{laureate.surname}
            </h2>
            <div className="flex flex row place-items-center place-content-center gap-6 p-4">
                {/* <img className="w-10 h-10 render-optimize" src={iconLocation} alt={fullName} /> */}
                {/* <div className="text-center text-gray-400 font-normal text-base"> */}
                {/* Nobel price */}
                {/* <div className="text-sm font-thin">{categories}</div> */}
                {/* </div> */}
                <img className="w-14 h-auto" src={getFlag(laureate.bornCountry)} alt={laureate.bornCountry} />
            </div>
        </>
    )
}