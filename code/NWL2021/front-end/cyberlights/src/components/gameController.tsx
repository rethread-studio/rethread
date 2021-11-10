import React, { useEffect, useState } from "react";
import { Link, useHistory } from "react-router-dom";

import {
    IconLookup,
    IconDefinition,
    findIconDefinition
} from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ArrowBtn } from "./arrowBtn";
import { socket } from "../api";
import { gameControllerI, controllDirection } from "../types";
import { categoryColor } from "../utils";
import { EmojiList } from "./emojiList";

// export class GameController extends React.Component {
//     constructor(readonly props: gameControllerI) {
//         super(props);

//         this.state = {
//             question: null,
//             answer: null,
//             emoji: null,
//         };

//         socket.on("question", (question) => { setQuestion(question) });
//         socket.on("enterAnswer", ({ answer }) => {
//             console.log("enterAnswer")
//             this.state.answer = answer;
//             this.setState({ answer });
//             window.navigator.vibrate(200);
//         });
//         socket.on("exitAnswer", ({ answer, question }) => { this.setState({ answer: null }); });
//         // socket.on("leave", () => { props.history.push("/") });
//         socket.on("score", (score) => { console.log("score", score) });
//         socket.on("move", ({x, y}) => { console.log("move", x, y) });

//         console.log("enter")


//         this.setState(this.state);
//     }

//     componentWillUnmount() {

//     }
//     onClickBackButton(event:any) {
//         console.log("off")
//         socket.emit("leave");
//         socket.off("leave");
//         socket.off("enterAnswer");
//         socket.off("exitAnswer");
//         socket.off("question");
//         socket.off("move");
//         socket.off("score");
//         window.removeEventListener("keydown", pressHandler);
//     }

//     onClickEmoji() {
//         socket.emit("emote", this.state.emoji)
//     }

//     emitDirection(direction: controllDirection) {
//         socket.emit("direction", direction);
//     }

//     render() {
//         return (
// <div className="h-full w-full p-4 ">
//     <div className="h-full border-2 border-gray-600 relative flex flex-col justify-between overflow-hidden">

//         <div className="flex flex-row justify-between text-sm">
//             <Link to={"/select"} onClick={this.onClickBackButton} className="text-gray-400  h-8 w-4/8 p-2 ">
//                 <FontAwesomeIcon className="yellow-300 text-xs" icon={chevronLeft} /> Back to select
//             </Link>
//         </div>
//         <div className="w-full text-neon text-2xl uppercase text-center pt-2 ">
//             {this.state.question !== null ? <span>{this.state.question}</span> : <></>}
//         </div>
//         <div className="relative h-full flex flex-col justify-center content-center">
//             {this.state.answer !== null ? <div className={`answer absolute px-6 py-2 top-1/4 left-2/4 z-20 left-0 bg-white text-black text-xl rounded-xl transition-all duration-200 transform ${this.state.rotation}`}>{this.state.answer}</div> : <></>}
//             <img onClick={this.onClickEmoji} className={`w-3/5 h-auto mx-auto transition-all duration-200 transform ${this.state.rotation}`} src={`/img/laureates/${this.state.laureate.imagePath}`} alt={this.state.laureate.firstname} />
//         </div>

//         <div className="flex w-full flex-col justify-center items-center space-y-2 place-self-end">
//             <ArrowBtn clickEvent={this.state.emitDirection} direction="up" color={this.state.color} />
//             <div className="flex flex-row space-x-2">
//                 <ArrowBtn clickEvent={this.emitDirection} direction="left" color={this.state.color} />
//                 <ArrowBtn clickEvent={this.state.emitDirection} direction="down" color={this.state.color} />
//                 <ArrowBtn clickEvent={this.state.emitDirection} direction="right" color={this.state.color} />
//             </div>
//         </div>

//         <div className="flex flex-row w-full justify-between text-gray-400 place-self-end p-4">
//             <span className="text-xs ">Press the arrows <br /> to move </span>
//             <button onClick={() => { setShow(true) }} className="text-2xl border-2 border-gray-500 rounded-full w-9">{emoji}</button>
//             <span className="text-xs text-right  place-self-end ">Tap the character  <br />to emote</span>
//         </div>
//         <EmojiList handleClick={this.setEmojitoLaureate} show={show} setShow={setShow} />
//     </div>
// </div>
//         )
//     }
// }
export const GameController = ({ laureate, selectHandler, emoji, setEmoji }: React.PropsWithChildren<gameControllerI>) => {
    const history = useHistory();
    const [position, setPosition] = useState<{x: number, y: number}>({x: 0, y: 0});
    const [score, setScore] = useState<number>(0);
    const [answer, setAnswer] = useState<string | null>(null);
    const [question, setQuestion] = useState<string | null>(null);
    const [currentDirection, setCurrentDirection] = useState<controllDirection>("void")
    const [color, setColor] = useState<string>(categoryColor.physics)
    const chevronLookLeft: IconLookup = { prefix: 'fas', iconName: 'chevron-left' };
    const chevronLeft: IconDefinition = findIconDefinition(chevronLookLeft);
    const [show, setShow] = useState(false);


    const setEmojitoLaureate = (e: string) => {
        setEmoji(e);
        console.log("emote")
        socket.emit("emote", e)
    }

    //load characters data
    useEffect(() => {
        if (laureate == null) {
            return history.push("/select");
        }
        const keyCategory: string = laureate.prizes.length > 1 ? "special" : laureate.prizes[0].category as string;
        setColor(categoryColor[keyCategory]);
        socket.emit("start", laureate._id);

        const pressHandler = ({ key }: { key: string }) => {
            if (key === "ArrowDown") {
                return emitDirection("down")
            }
            if (key === "ArrowUp") {
                return emitDirection("up")
            }
            if (key === "ArrowLeft") {
                return emitDirection("left")
            }
            if (key === "ArrowRight") {
                return emitDirection("right")
            }
        }
        window.addEventListener("keydown", pressHandler);

        socket.on("question", (question) => { setQuestion(question) });
        socket.on("enterAnswer", ({ answer }) => {
            console.log("enterAnswer")
            setAnswer(answer);
            window.navigator.vibrate(200);
        });
        socket.on("exitAnswer", ({ answer, question }) => { setAnswer(null) });
        socket.on("leave", () => { history.push("/") });
        socket.on("score", setScore);
        socket.on("move", setPosition);

        return () => {
            console.log("off")
            socket.emit("leave");
            socket.off("leave");
            socket.off("enterAnswer");
            socket.off("exitAnswer");
            socket.off("question");
            socket.off("move");
            socket.off("score");
            window.removeEventListener("keydown", pressHandler);
        }
    }, [laureate, history, selectHandler]);



    const emitDirection = (direction: controllDirection) => {
        setCurrentDirection(direction)
        socket.emit(direction);
    }

    const rotation: string = currentDirection === "up" ? "-translate-y-6" :
        currentDirection === "down" ? "translate-y-6" :
            currentDirection === "void" ? "rotate-0" :
                currentDirection === "left" ? "-rotate-45 -translate-x-8" :
                    currentDirection === "right" ? "rotate-45 translate-x-8" : "rotate-0";

    const onClickBackButton = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => { selectHandler(null); };

    let grid = <></>;
    for (let i = 0; i < 13; i++) {
        let line = <></>;
        for (let j = 0; j < 13; j++) {
            line = <>
                {line}
                <div className={"grid-position-item " + ((position.y === i && position.x === j) ? "active": "")}></div>
            </>
        }
        grid = <>{grid}<div className="grid-line">{line}</div></>
    }
    return (

        <div className="h-full w-full p-4 ">
            <div className="h-full border-2 border-gray-600 relative flex flex-col justify-between overflow-hidden">

                <div className="flex flex-row justify-between text-sm">
                    <Link to={"/select"} onClick={onClickBackButton} className="text-gray-400  h-8 w-4/8 p-2 ">
                        <FontAwesomeIcon className="yellow-300 text-xs" icon={chevronLeft} /> Back to select
                    </Link>
                    <div className="score text-sm text-gray-400  h-8 w-4/8 p-2">{score}</div>
                </div>
                <div className="w-full text-neon text-2xl uppercase text-center pt-2 ">
                    {question !== null ? <span>{question}</span> : <></>}
                </div>
                <div className="relative h-full flex flex-col justify-center content-center">
                    {answer !== null ? <div className={`answer absolute px-6 py-2 top-1/4 left-2/4 z-20 left-0 bg-white text-black text-xl rounded-xl transition-all duration-200 transform ${rotation}`}>{answer}</div> : <></>}
                    <img onClick={() => { socket.emit("emote", emoji) }} className={`w-3/5 h-auto mx-auto transition-all duration-200 transform ${rotation}`} src={`/img/laureates/${laureate.imagePath}`} alt={laureate.firstname} />
                </div>

                <div className="flex w-full flex-col justify-center items-center space-y-2 place-self-end">
                    <ArrowBtn clickEvent={emitDirection} direction="up" color={color} />
                    <div className="flex flex-row space-x-2">
                        <ArrowBtn clickEvent={emitDirection} direction="left" color={color} />
                        <ArrowBtn clickEvent={emitDirection} direction="down" color={color} />
                        <ArrowBtn clickEvent={emitDirection} direction="right" color={color} />
                    </div>
                </div>
                <div className="grid-position absolute zIndex">
                    {grid}
                </div>

                <div className="flex flex-row w-full justify-between text-gray-400 place-self-end p-4">
                    <span className="text-xs ">Press the arrows <br /> to move </span>
                    <button onClick={() => { setShow(true) }} className="text-2xl border-2 border-gray-500 rounded-full w-9">{emoji}</button>
                    <span className="text-xs text-right  place-self-end ">Tap the character  <br />to emote</span>
                </div>
                <EmojiList handleClick={setEmojitoLaureate} show={show} setShow={setShow} />
            </div>
        </div>
    )
}
