import React from 'react';
import { Frame } from './frame';

export const Loading = () => {

    return (
        <Frame center={true}>
            <img className="w-48 h-48 animate-spin" src="./logo.png" alt="turing lights 2021" />
            <h1 className="text-white mt-8 text-5xl">Loading...</h1>
        </Frame>
    )


}