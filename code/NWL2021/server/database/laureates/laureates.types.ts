import * as mongoose from "mongoose";

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
  firstname: string;
  surname: string;
  picturePath: string;
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
  description: string,
  prizes: IPrize[];
}

export interface ILaureateDocument extends ILaureate, mongoose.Document {}
export interface ILaureateModel extends mongoose.Model<ILaureateDocument> {}
