import React from "react";
import { prize } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface infoCardProps {
    prizes: prize[],
    color?: string,
    clickHandler: (e: any) => void
}

export const InfoCard = ({ prizes, color, clickHandler }: React.PropsWithChildren<infoCardProps>) => {

    return (
        <>
            <div onClick={clickHandler} className="absolute z-10 bg-gray-800  bg-opacity-50 w-full h-screen  text-center bottom-0 p-8"></div>

            <div onClick={clickHandler} className={`absolute z-20 bg-gray-800 w-full  text-center bottom-0 p-8 border-t-8 border-${color}`}>
                {prizes.map((p: prize, i: number) => {
                    return <div key={uuidv4()}>
                        <h2 className={`uppercase mb-4 text-2xl text-${color ? color : "yellow-300"}`}>{p.category} <br /> <span className="text-xl">{p.year}</span></h2>
                        <p className="text-white">{p.motivation}</p>
                        <div className="h-5"></div>
                    </div>
                })}
            </div>
        </>
    )
}