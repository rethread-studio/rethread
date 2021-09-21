import { laureateI, prize } from './types';


export const dataToLaurates = (l: any): laureateI => {
    const prizes: prize[] = l.prizes.map(dataToPrizes)
    return {
        bornCity: l.bornCity,
        bornCountry: l.bornCountry,
        bornCountryCode: l.bornCountryCode,
        diedCity: l.diedCity,
        diedCountry: l.diedCountry,
        diedCountryCode: l.diedCountryCode,
        firstname: l.firstname,
        gender: l.gender,
        prizes: prizes,
        surname: l.surname ? l.surname : "",
        img: l.img ? l.img : 'characterTest.png',
    }
}


const dataToPrizes = ((p: any): prize => {
    return {
        category: p.category,
        motivation: p.motivation,
        share: p.share,
        year: p.year,
        _id: p._id
    }
})