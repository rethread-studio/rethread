import React from 'react';


export const Loading = () => {


    return <div className="h-screen border-8 border-yellow-300 flex flex-col justify-center items-center ">
        <img className="w-48 h-48 animate-spin" src="./logo.png" alt="turing lights 2021" />
        <h1 className="text-white mt-8 text-5xl">Loading...</h1>
    </div>

}