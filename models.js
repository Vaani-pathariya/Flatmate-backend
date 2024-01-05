const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        unique: true,
    },
    password: {
        type: String,
    },
    capacity:{
        type:Number,
    },
    drink:{
        type: Boolean,
    },
    bio:{
        type:String,
    },
    smoke:{
        type: Boolean,
    },
    workout:{
        type: Boolean,
    },
    occupied:{
        type:Number,
    },
    furnishingStatus: {
        type: String,
        enum: ['semiFurnished', 'fullyFurnished', 'nonFurnished'],
    },
    address: {
        flat: String,
        area: String,
        additional: String,
    },
    rent: {
        monthlyAmount: Number,
        brokerage: Number,
    },
    dob: {
        day: Number,
        month: Number,
        year: Number
    },
    hasFlat: {
        type: Boolean,
    },
    branch:{
        type: String,
    },
    year:{
        type: Number,
    },
    gender:{
        type: String,
        enum: ['female', 'male'],
    },
    googleId: {
        type: String,
    },
    name:{
        type: String,
    },
    picture:{
        type:String,
    }
});

const User = mongoose.model("User", UserSchema);

module.exports = User;