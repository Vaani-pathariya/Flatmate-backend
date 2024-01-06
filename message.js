const { ObjectId } = require("mongodb");
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  sender: {
    type: ObjectId,
    required: true,
  },
  receiver: {
    type: ObjectId,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  read: {
    type: Boolean,
    default: false,
  },
});

const Message = mongoose.model("Message", messageSchema);

module.exports = Message;
