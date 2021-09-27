import React from "react";
import { Frame } from "./frame";
import { Link } from "react-router-dom";
import { Spacer } from "./spacer";


export const Home = () => {

    return (
        <Frame center={false}>
            <Spacer direction={"vertical"} size={"lg"} />
            <img className="w-48 h-48 mx-auto" src="./logo.png" alt="turing lights 2021" />
            <h1 className="text-white text-4xl text-center uppercase font-light">Wellcome to <br /><span className="text-yellow-300">Cyber|glow</span></h1>
            <div className="text-white  text-center w-5/6 text-base">
                <p>Cyber|glow is an interactive web installation part of the Nobel Lights Week 2021.</p>
                <p>Make sure to be at address for the complete experience.</p>
            </div>

            <Link to={"/select"} className="text-4xl  text-center text-yellow-300 uppercase bg-yellow-300  py-4 px-4 mb-6 mx-auto place-self-end">
                <span className="text-gray-900 font-light">start</span>
            </Link>

        </Frame>
    )
}