const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
  },
  password: {
    type: String,
    default: null,
  },
  capacity: {
    type: Number,
    default: null,
  },
  drink: {
    type: Boolean,
    default: null,
  },
  bio: {
    type: String,
    default: null,
  },
  smoke: {
    type: Boolean,
    default: null,
  },
  workout: {
    type: Boolean,
    default: null,
  },
  occupied: {
    type: Number,
    default: null,
  },
  furnishingStatus: {
    type: String,
    enum: ["semiFurnished", "fullyFurnished", "nonFurnished"],
    default: null,
  },
  address: {
    flat: {
      type: String,
      default: null,
    },
    area: {
      type: String,
      default: null,
    },
    additional: {
      type: String,
      default: null,
    },
  },
  rent: {
    monthlyAmount: {
      type: Number,
      default: null,
    },
    brokerage: {
      type: Number,
      default: null,
    },
  },
  dob: {
    day: {
      type: Number,
      default: null,
    },
    month: {
      type: Number,
      default: null,
    },
    year: {
      type: Number,
      default: null,
    },
  },
  hasFlat: {
    type: Boolean,
    default: null,
  },
  branch: {
    type: String,
    default: null,
  },
  year: {
    type: Number,
    default: null,
  },
  gender: {
    type: String,
    enum: ["female", "male", null],
    default: null,
  },
  googleId: {
    type: String,
    default: null,
  },
  name: {
    type: String,
    default: null,
  },
  picture: {
    type: String,
    default: null,
  },
});

const User = mongoose.model("User", UserSchema);

module.exports = User;
