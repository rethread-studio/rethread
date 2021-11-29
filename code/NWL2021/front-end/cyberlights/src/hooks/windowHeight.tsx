import { useState, useEffect } from "react";

interface IHeight {
    height: number | undefined;
}

export const useWindowHeight = (): IHeight => {
    const [windowHeight, setWindowHeight] = useState<IHeight>({
        height: undefined
    });

    useEffect(() => {
        // Handler to call on window resize
        function handleResize() {
            // Set window width/height to state
            setWindowHeight({
                height: window.innerHeight,
            });
        }
        // Add event listener
        window.addEventListener("resize", handleResize);
        // Call handler right away so state gets updated with initial window size
        handleResize();
        // Remove event listener on cleanup
        return () => window.removeEventListener("resize", handleResize);
    }, [])

    return windowHeight;
}