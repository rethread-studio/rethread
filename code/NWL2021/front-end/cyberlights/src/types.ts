
export interface sliderBtnI {
    color: string,
    position: "RIGHT" | "LEFT",
    btnClass: "PREV" | "NEXT"
}

export interface prize {
    category: string
    motivation: string
    share: number
    year: number
    _id: string
}

export interface laureateI {
    bornCity: string,
    bornCountry: string,
    bornCountryCode: string,
    diedCity: string,
    diedCountry: string,
    diedCountryCode: string,
    firstname: string,
    gender: string,
    prizes: prize[]
    surname?: string,
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

export interface characterCardProps {
    fullName: string,
    img?: string,
    prizes: prize[]
}

export type controllDirection = "up" | "down" | "left" | "right" | "void";
