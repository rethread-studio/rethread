import { io, Socket } from "socket.io-client";
import { DefaultEventsMap } from "socket.io-client/build/typed-events";
import { laureateI } from "./types";
//Socket communication
export const socket: Socket<DefaultEventsMap, DefaultEventsMap> = io("/control");

window.addEventListener("click", (ev) => {
    socket.emit("click", { "x": ev.clientX, "y": ev.clientY })
})

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
        firstname: "",
        surname: "",
        imagePath: "",
        country: "",
        city: "",
        bornDate: 1983,
        diedDate: 1983,
        bornCountry: "Kenya",
        bornCountryCode: "KE",
        bornCity: "Nyeri",
        diedCountry: "Nairobi",
        diedCountryCode: "Kenya",
        diedCity: "KE",
        gender: "female",
        description: "",
        img: "./img/laureate.png",
        prizes: [],
        color: "neonyellow",
    },
    {
        firstname: "",
        surname: "",
        imagePath: "",
        country: "",
        city: "",
        bornDate: 1983,
        diedDate: 1983,
        bornCountry: "Kenya",
        bornCountryCode: "KE",
        bornCity: "Nyeri",
        diedCountry: "Nairobi",
        diedCountryCode: "Kenya",
        diedCity: "KE",
        gender: "female",
        description: "",
        img: "./img/laureate.png",
        prizes: [],
        color: "neonyellow",
    },
]

export const dummyLaureate: laureateI = {
    firstname: "",
    surname: "",
    imagePath: "",
    country: "",
    city: "",
    bornDate: 1983,
    diedDate: 1983,
    bornCountry: "Kenya",
    bornCountryCode: "KE",
    bornCity: "Nyeri",
    diedCountry: "Nairobi",
    diedCountryCode: "Kenya",
    diedCity: "KE",
    gender: "female",
    description: "",
    img: "./img/laureate.png",
    prizes: [],
    color: "neonyellow",
}

