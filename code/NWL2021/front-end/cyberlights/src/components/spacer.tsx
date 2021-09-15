import React from "react";

interface spacerProps {
    size: "xs" | "sm" | "base" | "lg" | "xl",
    direction: "horizontal" | "vertical"
}

export const Spacer = ({ size, direction }: React.PropsWithChildren<spacerProps>) => {
    const proportion: string = size === "xs" ? "1" : size === "sm" ? "3" : size === "base" ? "4" : size === "lg" ? "7" : size === "xl" ? "8" : "3";
    const dir: string = direction === "horizontal" ? "w" : "h";

    return (
        <div className={`${dir}-${proportion}`}></div>
    )
}