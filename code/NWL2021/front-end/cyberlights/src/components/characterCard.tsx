import React from "react";
import { characterCardProps, prize } from '../types';
import { v4 as uuidv4 } from 'uuid';

const getIcon = (category: string): string => {
    switch (category) {
        case "physics":
            return "ico-physics.png";
        case "peace":
            return "ico-peace.png";
        case "literature":
            return "ico-literature.png";
        case "medicine":
            return "ico-medicine.png";
        case "economics":
            return "ico-economics.png";
        case "special":
            return "ico-special.png";
        default:
            return "ico-chemistry.png"
    }
}

export const CharacterCard = ({ fullName, img, prizes, country }: React.PropsWithChildren<characterCardProps>) => {

    const categories: JSX.Element[] = prizes
        .map((p: prize) => <p>{p.category} - {p.year}</p>)


    const iconLocation: string = prizes.length > 1 ? getIcon("special") : getIcon(prizes[0].category);


    return (
        <>


            <img className="w-4/5 h-4/5 mx-auto mt-8" src={`./${img}`} alt={fullName} />

            <h2 className={`text-center pt-4 pb-2 px-4 font-light text-neon-yellow ${fullName.length >= 14 ? "text-2xl" : "text-2xl"}`}>{`${fullName}`}</h2>
            <div className="flex flex row place-items-center place-content-center gap-6 p-4">
                <img className="w-10 h-10" src={`./${iconLocation}`} alt={fullName} />
                <div className="text-center text-white font-normal text-base">
                    Nobel price
                    <div className="text-sm font-thin">{categories}</div>
                </div>
                <img className="w-10 h-10" src={`./flag-usa.png`} alt={fullName} />
            </div>
        </>
    )
}