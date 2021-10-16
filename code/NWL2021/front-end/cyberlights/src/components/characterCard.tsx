import React from "react";
import { characterCardProps, prize } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { getIcon } from "../utils";


export const CharacterCard = ({ fullName, img, prizes, country, color }: React.PropsWithChildren<characterCardProps>) => {

    const categories: JSX.Element[] = prizes
        .map((p: prize) => <p key={uuidv4()}>{p.category} - {p.year}</p>)


    const iconLocation: string = prizes.length > 1 ? getIcon("special") : getIcon(prizes[0].category);


    return (
        <>
            <img className="w-4/5 h-4/5 mx-auto mt-8" src={`${img}`} alt={fullName} />

            <h2 style={{
                color: "white",
                textShadow:
                    `0 0 4px #fff,
                0 0 11px #fff,
                0 0 19px #fff,
                0 0 40px ${color},
                0 0 80px ${color},
                0 0 90px ${color},
                0 0 100px ${color},
                0 0 150px ${color}`
            }} className={`text-center pt-4 pb-2 px-4 font-light ${fullName.length >= 14 ? "text-2xl" : "text-2xl"}`}>{`${fullName}`}</h2>
            <div className="flex flex row place-items-center place-content-center gap-6 p-4">
                <img className="w-10 h-10 render-optimize" src={`${iconLocation}`} alt={fullName} />
                <div className="text-center text-gray-400 font-normal text-base">
                    Nobel price
                    <div className="text-sm font-thin">{categories}</div>
                </div>
                <img className="w-10 h-10" src={`./flag-usa.png`} alt={fullName} />
            </div>
        </>
    )
}