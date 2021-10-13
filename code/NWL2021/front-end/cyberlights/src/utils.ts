import { laureateI, prize, colorOption } from './types';

const colors: colorOption[] = ["neonyellow", "neongreen", "neonindigo", "neonpink", " neonred"]
export const dataToLaurates = (l: any, i: number): laureateI => {
    const prizes: prize[] = l.prizes.map(dataToPrizes)
    return {
        firstname: l.firstname,
        lastname: l.lastname ? l.lastname : "",
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