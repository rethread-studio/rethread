import { io, Socket } from "socket.io-client";
import { DefaultEventsMap } from "socket.io-client/build/typed-events";

//Socket communication
const socket: Socket<DefaultEventsMap, DefaultEventsMap> = io("/control");


//LAUREATES API
const getLaureates = (): Promise<any> => {
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




const dummyLaureates: laureateI[] = [
    {
        born: "1940-04-01",
        bornCity: "Nyeri",
        bornCountry: "Kenya",
        bornCountryCode: "KE",
        died: "2011-09-25",
        diedCity: "Nairobi",
        diedCountry: "Kenya",
        diedCountryCode: "KE",
        firstname: "Wangari",
        gender: "female",
        id: "783",
        surname: "Maathai",
        img: "./img/laureate.png"

    },
    {
        born: "1940-04-01",
        bornCity: "Nyeri",
        bornCountry: "Kenya",
        bornCountryCode: "KE",
        died: "2011-09-25",
        diedCity: "Nairobi",
        diedCountry: "Kenya",
        diedCountryCode: "KE",
        firstname: "Wangari",
        gender: "female",
        id: "783",
        surname: "Maathai",
        img: "./img/laureate.png"

    },
]



export { socket, getLaureates, dummyLaureates }
