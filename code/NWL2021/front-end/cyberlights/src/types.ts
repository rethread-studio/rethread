
export interface sliderBtnI {
    color: string,
    position: "RIGHT" | "LEFT",
    btnClass: "PREV" | "NEXT"
}

export interface affiliation {
    name: string,
    city: string,
    country: string,
}

export interface prize {
    year: number,
    category: string,
    share: number,
    motivation: string,
    affiliations: affiliation[],
}

export type colorOption = "neonyellow" | "neongreen" | "neonindigo" | "neonpink" | " neonred";

export interface laureateI {
    firstname: string,
    lastname: string,
    imagePath: string,
    country: string,
    city: string,
    bornDate: number,
    diedDate: number,
    bornCountry: string,
    bornCountryCode: string,
    bornCity: string,
    diedCountry: string,
    diedCountryCode: string,
    diedCity: string,
    gender: string,
    description: string,
    img?: string,
    prizes: prize[],
    color: colorOption
}

export interface gameControllerI {
    characterIndex: number,
    charactersList: laureateI[]
}


export interface selectCharacterProps {
    characters: laureateI[],
    charIndex: number,
    selectHandler: React.Dispatch<React.SetStateAction<number>>
}

export interface characterCardProps {
    fullName: string,
    img?: string,
    prizes: prize[]
}

export type controllDirection = "up" | "down" | "left" | "right" | "void";
