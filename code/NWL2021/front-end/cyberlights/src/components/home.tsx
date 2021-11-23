import React from "react";
import { Link } from "react-router-dom";
import { Spacer } from "./spacer";
import LOGO from "../cgLogo.svg";

export const Home = () => {

    return (
        <div className="h-full w-full p-4">
            <div className="h-full flex border-2 border-white flex-col relative items-center justify-between neon-shadow ">

                <div className="absolute lowercase  flex flex-row font-light text-white text-xs top-4"> re|thread </div>
                <Spacer direction={"vertical"} size={"lg"} />
                <img className="w-32 h-32 mx-auto" src={LOGO} alt="turing lights 2021" />
                <h1 className="text-white text-xl text-center lowercase font-light">Welcome to <br /><span className="text-yellow-300 font-thin text-5xl text-neon-yellow">cyber|glow</span></h1>
                <div className="text-white  text-center w-5/6 text-base">
                    <p>cyber|glow is an interactive diptych: a multi-player game, and real time laser visualization of code. It is part of the Nobel Week Lights 2021. Make sure to be at <span className="underline">Benny Fredrikssons Torg</span> for the complete experience.</p>
                </div>

                <div className="flex flex-row content-center mb-6 space-x-3">
                    <Link to={"/about"} className="text-xl border-yellow-300 border-2 py-2 px-4 mx-auto ">
                        <span className="text-yellow-300 font-light text-center lowercase">about</span>
                    </Link>
                    <Link to={"/select"} className="text-2xl bg-yellow-300  py-2 px-4 mx-auto ">
                        <span className="text-gray-900 font-light text-center lowercase">start</span>
                    </Link>
                </div>
            </div>
        </div>

        // </Frame>
    )
}