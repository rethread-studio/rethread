import React from 'react';
import { Link } from "react-router-dom";
import {
    IconLookup,
    IconDefinition,
    findIconDefinition
} from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export const About = () => {
    const chevronLookLeft: IconLookup = { prefix: 'fas', iconName: 'chevron-left' };
    const chevronLeft: IconDefinition = findIconDefinition(chevronLookLeft);

    return <div className="flex flex-col w-screen place-content-center pb-6">
        <div className="flex flex-row justify-between text-sm content-center pt-2">
            <Link to={"/home"} className="text-yellow-300  h-8 w-4/8 p-2 ">
                <FontAwesomeIcon className="yellow-300 text-xs" icon={chevronLeft} /> Back
            </Link>
        </div>
        <h1 className="text-white text-xl text-center lowercase font-light "><span className="text-yellow-300 font-thin text-4xl text-neon-yellow">cyber|glow</span></h1>

        <div className="w-10/12 mt-6 text-gray-300 mx-auto text-md font-light leading-6">
            <h2 className="text-yellow-300 font-thin text-2xl text-neon-yellow">About</h2>
            <p>
                cyber|glow at Kulturnatt is an interactive software art installation. It is presented as an audiovisual dyptich.
            </p>
            <br />
            <p>
                Software is the core medium that fuels our digital society, providing services to citizens, governments, activists and corporations. It is an invisible and intangible set of processes that run millions of operations per second, on top of world-wide networks. With cyber|glow, we wish to unveil these invisible processes and let citizens realize the extraordinary scale of software that surrounds them.
            </p>
            <br />
            <h2 className="text-yellow-300 font-thin text-2xl text-neon-yellow">cyber|glow is a diptych.</h2>
            <br />
            <img src="/cyberglowCharacters.png" alt="cyber|glow" className=" object-contain w-6/6 h-auto align-middle border-none mb-4" />
            <br />
            {/* <img src="/laser.jpg" alt="WASP" className=" object-contain w-6/6 h-auto align-middle border-none mb-4" /> */}

            <p>
                The first part of cyber|glow is a multiplayer interactive game. The audience plays the game with their phone and learn about the history of the Résidence de France. While the audience plays, cyber|glow traces all the operations that make the game work: messages between the audience's phones and the game server, as well as all the digital activity inside the game.
            </p>
            <img src="/inGame.jpg" alt="cyber|glow" className=" object-contain w-6/6 h-auto align-middle border-none mb-4" />
            <br />
            <p>
                The second part of cyber|glow's dyptich is an audiovisual software art piece. The generative art piece is synthesized, in real-time, based on the software activity produced by the audience. Mesmerizing images and ambient electronic sounds reveal ultra-high frequency digital processes that run the game. This software art installation lets the audience make sense of digital activities through their emotions.
            </p>
            <br />
            <p>
                The software art piece alternates between two modes. One mode shows the three core part of the cyber|glow software infrastructure: the users' devices in the bottom right; the web server that hosts the game engine, in the top; and the computer displays the game on the résidence's ceiling, in the bottom left. The users and the display are in Stockholm, and they constantly interact with the server located in Amsterdam. The colored particles that navigate between these three parts show all the messages and actions produced by the users playing in the résidence.
            </p>
            <br />
            <video width="100%" autoPlay loop muted poster="/triangle.jpg">
                <source type="video/mp4" src="/triangle.mp4" />
            </video>

            <br />
            <p>
                The other mode zooms in the bottom right. This turns into an intensive swarm of particles that represent all the operations performed by the computer displaying the game: the operating system accessing the projector and the hard drive, mechanisms to harness inputs to create truly random cryptographically secure numbers, errors, data accesses.
            </p>
            <br />
            <video width="100%" autoPlay loop muted poster="/cyberLoop.jpg">
                <source type="video/mp4" src="/cyberglow2Loop.mp4" />
            </video> <br /> <br />
            <br />
            <h2 className="text-yellow-300 font-thin text-2xl text-neon-yellow ">Acknowledgments</h2>
            <div className="flex flex-row justify-center content-center space-x-10 mt-5">
                <img src="/logo_kth.png" alt="KTH" className=" object-contain w-2/6 h-auto align-middle border-none" />
            </div>
            <div className="flex flex-row justify-center content-center space-x-10 my-4">
                <img src="/logo_wasp.png" alt="WASP" className=" object-contain w-5/6 h-auto align-middle border-none" />
            </div>
            <p className="text-xs text-center">The cyber|glow installation is based on software technology research that was developed through <a href="https://wasp-sweden.org/" target="_blank" rel='noreferrer' className="text-neon-yellow">WASP</a>, a program supported by the Knut och Alice Wallenbergs Stiftelse.
            </p>
        </div>
    </div>
}