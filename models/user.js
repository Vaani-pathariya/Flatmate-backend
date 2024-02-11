const mongoose = require("mongoose");
const { ObjectId } = require("mongodb");
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
  nonVegetarian: {
    type: Boolean,
    default: null,
  },
  occupied: {
    type: Number,
    default: null,
  },
  bhk:{
    type: Number,
    default:null,
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
  googlePicture: {
    //This is the profile picture field
    type: String,
    default: null,
  },
  excludedFlatmates:[
    {
      type: ObjectId,
      default: null
    },
  ],
  excludedFlats:[
    {
      type: ObjectId,
      default: null,
    },
  ],
  profileImage: {
    data: {
      type: String, // Storing base64-encoded image data as a string
      default: null,
    },
    contentType: {
      type: String,
      default: null,
    },
  },
  displayImg:{
    data: {
      type: String, // Storing base64-encoded image data as a string
      default: null,
    },
    contentType: {
      type: String,
      default: null,
    },
  },
  likes: [
    {
      type: ObjectId,
      default: null
    },
  ],
  flatImages: [
    {
      data: {
        type: Buffer, 
        default: null,
      },
      contentType: {
        type: String,
        default: null,
      },
    },
  ],
});

const User = mongoose.model("User", UserSchema);

module.exports = User;
