import mongoose from "mongoose";

export interface IPrize {
  year: number;
  category: string;
  share: number;
  motivation: string;
  affiliations: Array<{
    name: string;
    city: string;
    country: string;
  }>;
}

export interface ILaureate {
  _id: string;
  firstname: string;
  surname: string;
  color: string;
  imagePath: string;
  country: string;
  city: string;
  bornDate: Date;
  diedDate: Date;
  bornCountry: string;
  bornCountryCode: string;
  bornCity: string;
  diedCountry: string;
  diedCountryCode: string;
  diedCity: string;
  gender: string;
  description: string;
  prizes: IPrize[];
  used: number;
}

export interface ILaureateDocument extends Omit<ILaureate, '_id'>, mongoose.Document {}
export interface ILaureateModel extends mongoose.Model<ILaureateDocument> {}
