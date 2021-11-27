import React, { useEffect, useMemo, useState } from "react";
import { Link, useHistory } from "react-router-dom";

import {
    IconLookup,
    IconDefinition,
    findIconDefinition
} from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import ArrowsControl from './arrowsControl';
import { socket } from "../api";
import { gameControllerI, controllDirection, IEmoji } from "../types";
import { categoryColor } from "../utils";
import EmojiList from "./emojiList";
import GridGame from "./gridGame";
import { ScoreList } from "./scoreList";
import { Score } from "./score";

export const GameController = ({ laureate, selectHandler, emoji, setEmoji, state, emojiList }: React.PropsWithChildren<gameControllerI>) => {
    const history = useHistory();
    const [position, setPosition] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
    const [answer, setAnswer] = useState<string | null>(null);
    const [answerPositions, setAnswerPositions] = useState<[{ x: number; y: number }] | null>(null);
    const [question, setQuestion] = useState<string | null>(null);
    const [currentDirection, setCurrentDirection] = useState<controllDirection>("void")
    const [color, setColor] = useState<string>(categoryColor.physics)
    const chevronLookLeft: IconLookup = { prefix: 'fas', iconName: 'chevron-left' };
    const chevronLeft: IconDefinition = findIconDefinition(chevronLookLeft);
    const [show, setShow] = useState(false);
    const [showScoreList, setScoreList] = useState(false);
    const [showEmoji, setShowEmoji] = useState(false);

    const setEmojitoLaureate = (e: IEmoji) => {
        setEmoji(e);
        emote();
    }

    const emote = () => {
        socket.emit("emote", emoji?._id)
        window.navigator.vibrate(200);
        setShowEmoji(true);
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

        socket.on("question", (data) => {
            setQuestion(data.question);
            setAnswerPositions(data.answerPositions);
        });
        socket.on("enterAnswer", ({ answer }) => {
            setAnswer(answer);
            window.navigator.vibrate(200);
        });
        socket.on("exitAnswer", ({ answer, question }) => { setAnswer(null) });
        socket.on("leave", () => { history.push("/") });
        // socket.on("score", setScore);
        socket.on("move", setPosition);

        return () => {
            socket.emit("leave");
            socket.off("leave");
            socket.off("enterAnswer");
            socket.off("exitAnswer");
            socket.off("question");
            socket.off("move");
            // socket.off("score");
            window.removeEventListener("keydown", pressHandler);
        }
    }, [laureate, history, selectHandler]);


    useEffect(() => {
        const emojiTimeout = setTimeout(() => {
            setShowEmoji(false);
        }, 2000)
        return (() => {
            if (emojiTimeout) clearTimeout(emojiTimeout);
        })
    }, [showEmoji])

    const emitDirection = (direction: controllDirection) => {
        setCurrentDirection(direction)
        socket.emit(direction);
    }

    const rotation: string = currentDirection === "up" ? "-translate-y-3" :
        currentDirection === "down" ? "translate-y-3" :
            currentDirection === "void" ? "rotate-0" :
                currentDirection === "left" ? "-rotate-45 -translate-x-8" :
                    currentDirection === "right" ? "rotate-45 translate-x-8" : "rotate-0";
    console.log(selectHandler)
    const onClickBackButton = useMemo(() => (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => selectHandler(null), [selectHandler]);
    return (

        <div className="h-full w-full p-4 ">
            <div className="h-full border-2 border-gray-600 relative flex flex-col justify-between overflow-hidden">

                {/* uppermenu */}
                <div className="flex flex-row justify-between text-sm content-center pt-2">
                    <Link to={"/select"} onClick={onClickBackButton} className="text-gray-400  h-8 w-4/8 p-2 ">
                        <FontAwesomeIcon className="yellow-300 text-xs" icon={chevronLeft} /> Back
                    </Link>
                    <Score />
                    <button onClick={() => { setScoreList(true) }} className="text-sm text-gray-400  mr-2" >View Top 2 </button>
                </div>
                <div className={`w-full text-neon ${question !== null && question?.length > 60 ? "text-md" : "text-2xl"} uppercase text-center pt-2`}>
                    {question !== null ? <span>{question}</span> : <></>}
                </div>

                <GridGame state={state} position={position} answerPositions={answerPositions} />

                <div className="relative h-full flex flex-col justify-center content-center">
                    {answer !== null ? <div className={`answer absolute px-6 py-2 top-1/4 left-2/4 z-20 left-0 bg-white text-black text-xl rounded-xl transition-all duration-200 transform ${rotation}`}>{answer}</div> : <></>}
                    {showEmoji === true ? <div className={`answer absolute px-6 py-2 top-1/4 left-1/4 z-20 left-0 bg-white text-black text-2xl rounded-xl transition-all duration-200 transform ${rotation}`}> {emoji?.emoji}</div> : <></>}

                    <img onClick={emote} className={`cursor-pointer w-3/5 h-auto mx-auto transition-all duration-200 transform ${rotation}`} src={`/img/laureates/${laureate.imagePath}`} alt={laureate.firstname} />
                </div>

                <ArrowsControl clickHandler={emitDirection} color={color} />


                <div className="flex flex-row w-full justify-between text-gray-400 place-self-end p-4">
                    <span className="text-xs ">Press the arrows <br /> to move </span>
                    <button onClick={() => { setShow(true) }} className="cursor-pointer text-2xl border-2 border-gray-500 rounded-full w-9">{emoji?.emoji}</button>
                    <span className="text-xs text-right  place-self-end ">Tap the character  <br />to emote</span>
                </div>
                {show ? <EmojiList handleClick={setEmojitoLaureate} setShow={setShow} emojiList={emojiList} /> : <></>}
                {showScoreList ? <ScoreList clickHandler={setScoreList} /> : <></>}
            </div>
        </div >
    )
}
