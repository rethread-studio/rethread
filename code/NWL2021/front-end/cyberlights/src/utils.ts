import { laureateI, tCategoryColor } from './types';

export const dataToLaureates = (l: any, i: number): laureateI => {
    const keyCategory: string = l.prizes.length > 1 ? "special" : l.prizes[0].category as string;
    l.color = categoryColor[keyCategory];
    return l as laureateI
}


export const categoryColor: tCategoryColor = {
    chemistry: "#87BF00",
    physics: "#FFF793",
    peace: "#C4FFFF",
    literature: "#D3762B",
    medicine: "#C3188D",
    economics: "#7325F0",
    special: "#37FF00",
}

export const getIcon = (category: string): string => {
    switch (category) {
        case "physics":
            return "ico-physics.png";
        case "peace":
            return "ico-peace.png";
        case "literature":
            return "ico-literature.png";
        case "medicine":
            return "ico-medicine.png";
        case "economics":
            return "ico-economics.png";
        case "special":
            return "ico-special.png";
        default:
            return "ico-chemistry.png"
    }
}

export const getFlag = (country: string): string => {
    switch (country) {
        case "Italy":
            return "flag-italy.png"
        case "Russian Empire (now Poland)":
            return "flag-poland.png"
        case "USA":
            return "flag-usa.png";
        case "Tibet (now China)":
            return "flag-china.png";
        case "Ottoman Empire (now North Macedonia)":
            return "flag-macedonia.png";
        case "Pakistan":
            return "flag-pakistan.png";
        case "Scotland":
            return "flag-scotland.png";
        case "Germany":
            return "flag-germany.png";
        case "Sweden":
            return "flag-sweden.png";
        case "Prussia (now Germany)":
            return "flag-germany.png";
        default:
            return "flag-usa.png"
    }
}

export const emojiList = ['❤️‍🔥', '😵‍💫', '🥲', '😮‍💨', '🤌', '🥸', '😶‍🌫️', '❤️‍🩹', '🤐', '🤨', '😡', '💀', '🤡', '👻', '👾', '💋', '🖖', '🤟'];

export const getEmoji = () => {
    const randPos = Math.floor(Math.random() * emojiList.length);
    return emojiList[randPos];
}

export function isWall(x: number, y: number, state: any): boolean {
    if (!state) return false;
    if (x <= state.questionPosition.x + state.questionPosition.width && x >= state.questionPosition.x
        &&
        y <= state.questionPosition.y + state.questionPosition.height && y >= state.questionPosition.y) {
        return true;
    }
    return false;
}
export function isAnswer(x: number, y: number, state: any): boolean {
    if (!state) return false;
    for (const answerPosition of state.answersPositions) {
        if (x <= answerPosition.x + answerPosition.width && x >= answerPosition.x
            &&
            y <= answerPosition.y + answerPosition.height && y >= answerPosition.y) {
            return true;
        }
    }
    return false;
}