import { io, Socket } from "socket.io-client";
import { DefaultEventsMap } from "socket.io-client/build/typed-events";
import { laureateI } from "./types";

//Socket communication
export const socket: Socket<DefaultEventsMap, DefaultEventsMap> = io("/control");

window.addEventListener("click", (ev) => {
    socket.emit("click", { "x": ev.clientX, "y": ev.clientY })
})

//LAUREATES API
export const getLaureates = (): Promise<laureateI[]> => {
    const url = `/api/laureates`;
    return getRequest(url)
}

//LAUREATES API
export const getLaureate = (laureateID: string): Promise<laureateI> => {
    const url = `/api/laureates/` + laureateID;
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