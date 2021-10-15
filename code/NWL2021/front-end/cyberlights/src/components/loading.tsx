import React from 'react';
import { Frame } from './frame';

export const Loading = () => {

    // <img className="w-48 h-48 animate-spin" src="./logo.png" alt="turing lights 2021" />
    return (
        <Frame center={true}>
            <h1 className="text-white mt-8 text-4xl  text-neon-yellow font-thin">Loading...</h1>
        </Frame>
    )


}