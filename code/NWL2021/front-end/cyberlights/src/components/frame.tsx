import React from "react";

interface frameProps {
    center: boolean,
    children?: React.ReactNode,
}

export const Frame = ({ center, children }: React.PropsWithChildren<frameProps>) => {
    return (
        <div className={` h-screen border-8 border-yellow-300 flex flex-col relative items-center ${center ? "justify-center items-center" : " justify-between "}`}>
            {children}
        </div>
    )
}