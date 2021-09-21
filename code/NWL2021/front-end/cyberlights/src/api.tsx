import { io, Socket } from "socket.io-client";
import { DefaultEventsMap } from "socket.io-client/build/typed-events";
import { laureateI } from "./types";
//Socket communication
export const socket: Socket<DefaultEventsMap, DefaultEventsMap> = io("/control");


//LAUREATES API
export const getLaureates = (): Promise<any> => {
    const url = `/api/laureates`;
    return getRequest(url)
}

const getRequest = async (url: string) => {
    const options = {
        method: 'GET',
        headers: { 'content-type': 'application/json' },
    };
    let data = await fetch(url, options)
        .then(res => { return res.json() })
        .catch(err => { console.log('Error: ', err) })
    return data
}


export const dummyLaureates: laureateI[] = [
    {
        bornCity: "Nyeri",
        bornCountry: "Kenya",
        bornCountryCode: "KE",
        diedCity: "Nairobi",
        diedCountry: "Kenya",
        diedCountryCode: "KE",
        firstname: "Wangari",
        gender: "female",
        prizes: [],
        surname: "Maathai",
        img: "./img/laureate.png"

    },
    {
        bornCity: "Nyeri",
        bornCountry: "Kenya",
        bornCountryCode: "KE",
        diedCity: "Nairobi",
        diedCountry: "Kenya",
        diedCountryCode: "KE",
        firstname: "Wangari",
        gender: "female",
        prizes: [],
        surname: "Maathai",
        img: "./img/laureate.png"

    },
]

export const dummyLaureate: laureateI = {
    bornCity: "Nyeri",
    bornCountry: "Kenya",
    bornCountryCode: "KE",
    diedCity: "Nairobi",
    diedCountry: "Kenya",
    diedCountryCode: "KE",
    firstname: "Wangari",
    gender: "female",
    prizes: [],
    surname: "Maathai",
    img: "./img/laureate.png"
}

