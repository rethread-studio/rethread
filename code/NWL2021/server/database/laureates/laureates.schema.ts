import mongoose from "mongoose";
const { Schema } = mongoose;

const LaureateSchema = new Schema({
  _id: mongoose.Types.ObjectId,
  firstname: String,
  surname: String,
  color: String,
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
  used: Number,
});

export default LaureateSchema;
