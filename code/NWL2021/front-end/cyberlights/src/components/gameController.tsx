import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import ControllMenu from './controllMenu';
import ArrowsControl from './arrowsControl';
import { socket } from "../api";
import { gameControllerI, controllDirection, IEmoji } from "../types";
import { categoryColor } from "../utils";
import EmojiList from "./emojiList";
import GridGame from "./gridGame";
import { ScoreList } from "./scoreList";
import { useWindowHeight } from "../hooks/windowHeight";
import { Answer } from "./answer";
import Question from "./question";


export const GameController = ({ laureate, selectHandler, iemoji, state, emojiList }: React.PropsWithChildren<gameControllerI>) => {
    const history = useHistory();
    const [color, setColor] = useState<string>(categoryColor.physics)
    const [emoji, setEmoji] = useState<IEmoji | null>(null);
    const [show, setShow] = useState(false);
    const [showScoreList, setScoreList] = useState(false);
    const [showEmoji, setShowEmoji] = useState(false);
    const { height } = useWindowHeight();
    const [currentDirection, setCurrentDirection] = useState<controllDirection>("void");

    useEffect(() => {
        setEmoji(iemoji);
    }, [iemoji])

    useEffect(() => {
        socket.emit("emote", emoji?._id);
        setShowEmoji(true);
    }, [emoji])

    const emote = () => {
        socket.emit("emote", emoji?._id)
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


        socket.on("leave", () => { history.push("/") });

        return () => {
            socket.emit("leave");
            socket.off("leave");
            socket.off("move");
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

    const onClickBackButton = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => { selectHandler(null); };
    return (

        <div style={{ height: `${height}px` }} className="w-full p-4 ">
            <div className="h-full border-2 border-gray-600 relative flex flex-col justify-between overflow-hidden">

                <ControllMenu clickHandler={onClickBackButton} btnClick={setScoreList} />

                <Question />

                <GridGame state={state} />

                <div className="relative h-full flex flex-col justify-center content-center">
                    <Answer />
                    {showEmoji === true ? <div className={`answer absolute px-6 py-2 top-1/4 left-1/4 z-20 left-0 bg-white text-black text-2xl rounded-xl `}> {emoji?.emoji}</div> : <></>}

                    <img onClick={emote} className={`cursor-pointer w-3/5 h-auto mx-auto transition-all duration-200 transform ${rotation}`} src={`/img/laureates/${laureate.imagePath}`} alt={laureate.firstname} />
                </div>

                <ArrowsControl clickHandler={emitDirection} color={color} />


                <div className="flex flex-row w-full justify-between text-gray-400 place-self-end p-4">
                    <span className="text-xs ">Press the arrows <br /> to move </span>
                    <button onClick={() => { setShow(true) }} className="cursor-pointer text-2xl border-2 border-yellow-300 rounded-full w-9">{emoji?.emoji}</button>
                    <span className="text-xs text-right  place-self-end ">Tap the character  <br />to emote</span>
                </div>
                {show ? <EmojiList handleClick={setEmoji} setShow={setShow} emojiList={emojiList} /> : <></>}
                {showScoreList ? <ScoreList clickHandler={setScoreList} /> : <></>}
            </div>
        </div >
    )
}
