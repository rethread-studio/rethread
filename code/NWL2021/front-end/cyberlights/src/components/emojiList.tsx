import React, { memo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { IEmoji } from '../types';

//on click event
//
interface IEmojiList {
    handleClick: any;
    setShow: React.Dispatch<React.SetStateAction<boolean>>,
    emojiList: IEmoji[] | null
}


const EmojiList = ({ handleClick, setShow, emojiList }: React.PropsWithChildren<IEmojiList>) => {

    const clickHandler = (e: IEmoji) => {
        handleClick(e);
        setShow(false);
    };

    const emojiButtons = emojiList?.map((emoji) => {
        return <button key={uuidv4()} className="text-4xl space-x-7 cursor-pointer" onClick={() => { clickHandler(emoji) }}>{emoji.emoji}</button>
    });

    return <>
        <div onClick={() => { setShow(false) }} className={`absolute z-10 bg-gray-800  bg-opacity-50 w-full h-screen top-0 left-0 p-8`}></div>
        <div className={` transform transition flex bottom-0 absolute z-20 bg-gray-800 w-full p-8  border-white flex-wrap space-x-4 place-items-start content-center justify-center bottom-4`}>
            <h2 className="w-full text-center mb-4 text-gray-400">Select an emoji to emote</h2>
            {emojiButtons}
        </div>
    </>
}

export default memo(EmojiList);