import React, { useState } from 'react';
import { emojiList } from '../utils';
import { v4 as uuidv4 } from 'uuid';

//on click event
//
interface IEmojiList {
    handleClick: any;
    show: boolean,
    setShow: React.Dispatch<React.SetStateAction<boolean>>,
}

export const EmojiList = ({ handleClick, show, setShow }: React.PropsWithChildren<IEmojiList>) => {

    const clickHandler = (e: string) => {
        handleClick(e);
        setShow(!show);
    };

    const emojiButtons = emojiList.map((e: string) => {
        return <button key={uuidv4()} className="text-4xl space-x-7" onClick={() => { clickHandler(e) }}>{e}</button>
    });

    //translate-y-full

    return <>
        <div onClick={() => { setShow(false) }} className={`${show ? "block" : "hidden"} absolute z-10 bg-gray-800  bg-opacity-50 w-full h-screen bottom-0 p-8`}></div>
        <div className={` transform transition ${show ? `` : `translate-y-full`} bottom-0 absolute z-20 bg-gray-800 w-full p-8  border-white h-3/6 flex flex-wrap space-x-4 place-items-start content-start justify-start`}>
            {emojiButtons}
        </div>
    </>
}