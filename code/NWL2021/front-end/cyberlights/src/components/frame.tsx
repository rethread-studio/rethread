import React from "react";

interface frameProps {
    center: boolean,
    children?: React.ReactNode,
}

export const Frame = ({ center, children }: React.PropsWithChildren<frameProps>) => {
    return (
        <div className="h-full w-full p-4">
            <div className={`h-full border-2 border-white flex flex-col neon-shadow ${center ? "justify-center items-center" : " justify-between "}`} >
                {children}
            </div>
        </div>
    )
}