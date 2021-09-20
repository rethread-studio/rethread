import * as mongoose from "mongoose";
const { Schema } = mongoose;

const LaureateSchema = new Schema({
  firstname: String,
  lastname: String,
  imagePath: String,
  country: String,
  city: String,
  bornDate: Date,
  diedDate: Date,
  bornCountry: String,
  bornCountryCode: String,
  bornCity: String,
  diedCountry: String,
  diedCountryCode: String,
  diedCity: String,
  gender: String,
  description: String,
  prizes: [
    {
      year: Number,
      category: String,
      share: Number,
      motivation: String,
      affiliations: [
        {
          name: String,
          city: String,
          country: String,
        },
      ],
    },
  ],
});

export default LaureateSchema;
