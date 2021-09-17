import React from "react";


interface infoCardProps {
    bio: string,
    color?: string,
    clickHandler: (e: any) => void
}

export const InfoCard = ({ bio, color, clickHandler }: React.PropsWithChildren<infoCardProps>) => {

    return (
        <>
            <div onClick={clickHandler} className="absolute z-10 bg-gray-800  bg-opacity-50 w-full h-screen  text-center bottom-0 p-8"></div>

            <div onClick={clickHandler} className={`absolute z-20 bg-gray-800 w-full  text-center bottom-0 p-8 border-t-8 border-${color}`}>
                <h2 className={`uppercase mb-4 text-3xl text-${color ? color : "yellow-300"}`}>My discovery</h2>
                <p className="text-white">{bio}</p>
            </div>
        </>
    )
}