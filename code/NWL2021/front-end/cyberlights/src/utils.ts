import { laureateI, prize } from './types';


export const dataToLaurates = (l: any): laureateI => {
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
        img: l.img ? l.img : 'laureate.png',
        prizes: prizes
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