import React from "react";
import { characterCardProps, prize } from '../types';

export const CharacterCard = ({ fullName, img, prizes }: React.PropsWithChildren<characterCardProps>) => {

    const prizesEl: JSX.Element[] = prizes.map((p: prize) => {
        return (<>
            <p className="text-center text-white text-xl pt-2  w-4/5 m-auto"><span className="capitalize">{p.category}</span> <span className="text-xl mt-4">{p.year}</span></p>
        </>)
    })

    return (
        <>
            <img className="w-3/5 h-3/5 mx-auto mt-8" src={`./${img}`} alt={fullName} />
            <h2 className={`text-center uppercase pt-8 pb-4 px-4 ${fullName.length >= 14 ? "text-2xl" : "text-3xl"}`}>{`${fullName}`}</h2>
            <p className="text-center text-white text-xl w-4/5 m-auto">Nobel price in</p>
            {prizesEl}
        </>
    )
}