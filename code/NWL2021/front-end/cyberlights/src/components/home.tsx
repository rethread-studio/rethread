import React from "react";
import { Frame } from "./frame";
import { Link } from "react-router-dom";
import { Spacer } from "./spacer";


export const Home = () => {

    return (
        <Frame center={false}>
            <Spacer direction={"vertical"} size={"lg"} />
            <img className="w-48 h-48 mx-auto" src="./logo.png" alt="turing lights 2021" />
            <h1 className="text-white text-4xl text-center uppercase">Wellcome to <br /><span className="text-yellow-300">Cyber|glow</span></h1>
            <div className="text-white  text-center w-5/6 text-base">
                <p>Cyber|glow is an interactive web installation part of the Nobel Lights Week 2021.</p>
                <p>Make sure to be at address for the complete experience.</p>
            </div>

            <Link to={"/select"} className="text-7xl  text-center text-yellow-300 uppercase border-t-8 border-yellow-300 pt-4 pb-4 w-full place-self-end">
                start
            </Link>

        </Frame>
    )
}