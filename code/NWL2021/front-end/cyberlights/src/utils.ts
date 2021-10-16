import { laureateI, prize, colorOption, tCategoryColor } from './types';

const colors: colorOption[] = ["neonyellow", "neongreen", "neonindigo", "neonpink", " neonred"]
export const dataToLaurates = (l: any, i: number): laureateI => {
    const prizes: prize[] = l.prizes.map(dataToPrizes)
    return {
        firstname: l.firstname,
        surname: l.surname ? l.surname : "",
        imagePath: l.imagePath,
        country: l.country,
        city: l.city,
        bornDate: l.bornDate,
        diedDate: l.diedDate,
        bornCountry: l.firstname,
        bornCountryCode: l.firstname,
        bornCity: l.firstname,
        diedCountry: l.firstname,
        diedCountryCode: l.firstname,
        diedCity: l.firstname,
        gender: l.firstname,
        description: l.firstname,
        img: l.imagePath,
        prizes: prizes,
        color: colors[i % (colors.length - 1)]
    }
}


const dataToPrizes = ((p: any): prize => {
    return {
        category: p.category,
        motivation: p.motivation,
        share: p.share,
        year: p.year,
        affiliations: [],
    }
})


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