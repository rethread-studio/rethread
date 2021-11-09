
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
    surname: string,
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
    color: colorOption,
    emoji: string
}

export interface gameControllerI {
    laureate: laureateI,
    selectHandler: React.Dispatch<React.SetStateAction<laureateI | null>>,
    emoji: string,
    setEmoji: React.Dispatch<React.SetStateAction<string>>;
}


export interface selectCharacterProps {
    characters: laureateI[],
    selectHandler: React.Dispatch<React.SetStateAction<laureateI | null>>
}

export interface characterCardProps {
    laureate: laureateI,
    color: string
}

export type controllDirection = "up" | "down" | "left" | "right" | "void";


export type tCategoryColor = { [key: string]: string };
