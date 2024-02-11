const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const messageModel = require("./models/message");
require("dotenv").config();
const http = require("http");
const socketIO = require("socket.io");
const app = express();
const server = http.createServer(app);
const { ObjectId } = require("mongodb");
// require('./passportConfig')
const userRouter=require('./routes/user')
const displayRouter=require('./routes/display')
const {connectMongoDb}=require("./connection")
// The read field in messages refers to whether the message has been read by the receiver or not , since the message is obviously read by the sender
const io = socketIO(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // Check if the origin is allowed
      const allowedOrigins = [process.env.LOCAL_PORT];
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});
const port = 8000;
app.use(cors());
connectMongoDb(process.env.MONGO_URI)
// Configuring body parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({ limit: "10mb" }));
// app.use(passport.initialize());  -------------> Use for web app authentication google authentication
// app.use(passport.session());  -------------> Use for web app authentication google authentication
app.use("/user",userRouter);
app.use("/display",displayRouter);
app.get("/", async (req, res) => {
  res.json({ message: "Working" });
});
// Implementing messaging
io.on("connection", (socket) => {
  console.log("connected");

  // Listen for messages
  socket.on("authenticate", (token) => {
    try {
      const decoded = jwt.verify(token, "your-secret-key");
      // Add the user to a room based on their user ID
      console.log("Auth done");
      socket.join(decoded.userId);
    } catch (error) {
      console.error("Authentication failed:", error.message);
    }
  });

  socket.on("message", async (data) => {
    try {
      // Authenticate the sender based on the JWT token
      const senderData = jwt.verify(data.senderToken, "your-secret-key");
      // Create a new message
      const newMessage = new messageModel({
        sender: senderData.userId,
        receiver: new ObjectId(data.receiver),
        text: data.text,
      });

      // Save the message to MongoDB
      await newMessage.save();

      // Broadcast the message to the sender
      socket.emit("message", newMessage);
      // Broadcast the message to the receiver
      io.to(data.receiver).emit("message", newMessage);
    } catch (error) {
      console.error(error.message);
    }
  });
  // Disconnect event
  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});
server.listen(port, () => {
  console.log(`Hello world app listening on port ${port}!`);
});
