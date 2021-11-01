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

            <div style={{
                color: color,
                boxShadow: `0 0 .3rem #fff,
            inset 0 0 .3rem #fff,
            0 0 1rem ${color},
            inset 0 0 2rem ${color},
            0 0 0.5rem ${color},
            inset 0 0 0.5rem ${color}`
            }} onClick={clickHandler} className={`absolute z-20 bg-gray-800 w-full  text-center bottom-0 p-8 border-t-2 border-white `}>
                {prizes.map((p: prize, i: number) => {
                    return <div key={uuidv4()}>
                        <h2 style={{ color: color }} className={`normal-case mb-4 font-light text-2xl`}>{p.category} - <span className="text-2xl">{p.year}</span></h2>
                        <p className="text-white text-base font-light">{p.motivation}</p>
                        <div className="h-5"></div>
                    </div>
                })}
            </div>
        </>
    )
}