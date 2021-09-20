import { type } from "os";

export interface sliderBtnI {
    color: string,
    position: "RIGHT" | "LEFT",
    btnClass: "PREV" | "NEXT"
}

export interface laureateI {
    born: string,
    bornCity: string,
    bornCountry: string,
    bornCountryCode: string,
    died: string,
    diedCity: string,
    diedCountry: string,
    diedCountryCode: string,
    firstname: string,
    gender: string,
    id: string,
    prizes?: [any]
    surname: string,
    img?: string
}

export interface gameControllerI {
    characterIndex: number,
    charactersList: laureateI[]
}


export interface selectCharacterProps {
    characters: laureateI[],
    selectHandler: React.Dispatch<React.SetStateAction<number>>
}

export type controllDirection = "up" | "down" | "left" | "right" | "void";
