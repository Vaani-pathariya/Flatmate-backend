const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const userModel = require("./models");
const multer = require("multer");
const path = require("path");
const messageModel = require("./message");
const nodemailer = require("nodemailer");
const authenticateToken = require("./authenticateToken");
const http = require("http");
const socketIO = require("socket.io");
const app = express();
const server = http.createServer(app);
const { ObjectId } = require("mongodb");
// The read field in messages refers to whether the message has been read by the receiver or not , since the message is obviously read by the sender
const io = socketIO(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // Check if the origin is allowed
      const allowedOrigins = ["http://localhost:3000"];
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

mongoose.connect(
  "mongodb+srv://vaani:vaani@cluster0.b5sf2hj.mongodb.net/Flatmate?retryWrites=true&w=majority",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error: "));
db.once("open", function () {
  console.log("Connected successfully");
});

// Configuring body parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(
  require("express-session")({
    secret: "your-secret-key",
    resave: true,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());
const otpStorage = new Map();
const generateOTP = () => {
  const otp = Math.floor(100000 + Math.random() * 900000);
  return otp.toString();
};
const storage = multer.memoryStorage(); // You can change this to store files on disk if needed
const upload = multer({ storage: storage });
app.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || email == "") {
      return res.status(400).json({ message: "Email is required" });
    }

    // Check if the email is already registered
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email is already registered" });
    }

    // Generate and send OTP
    const otp = generateOTP();

    // Save OTP for verification
    otpStorage.set(email, otp);
    let transporter = await nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "vpathariya2111@gmail.com",
        pass: "dhlbjpwvhyhtrcuc",
      },
    });
    // Send OTP to the provided email (using Nodemailer, for example)
    const mailOptions = {
      from: "Flatmate <vpathariya2111@gmail.com>", // sender address
      to: `${email}`, // list of receivers
      subject: " OTP ", // Subject line
      text: `${otp}`,
      html: `<b>${otp}</b>`, // html body
    };
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
        res.status(500).json({ message: "Failed to send OTP email" });
      } else {
        console.log("Email sent: %s", info.messageId);
        res.status(200).json({ message: "OTP sent successfully" });
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Route to verify OTP and complete signup
app.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Verify OTP that should be in string format
    const savedOTP = otpStorage.get(email);

    if (!savedOTP || savedOTP !== otp) {
      return res.status(401).json({ message: "Invalid OTP" });
    }

    // Clear the OTP from storage
    otpStorage.delete(email);

    res.status(201).json({ message: "Successful" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
app.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if the email is already registered
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email is already registered" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const newUser = new userModel({
      email,
      password: hashedPassword,
    });

    let user = await newUser.save();
    const token = jwt.sign({ userId: user._id }, "your-secret-key", {
      expiresIn: "1h",
    });
    res.status(201).json({ message: "Signup successful", token: token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Login Route
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find the user by email
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Compare the password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, "your-secret-key", {
      expiresIn: "1h",
    });

    res.json({ token: token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Google OAuth 2.0 configuration
passport.use(
  new GoogleStrategy(
    {
      clientID:
        "316208084302-qdp4g6i3nmf8rpo6tdeb23qt5tr6gi9g.apps.googleusercontent.com",
      clientSecret: "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",
      callbackURL: "https://flatmate-backend.onrender.com/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await userModel.findOne({ googleId: profile.id });

        if (!user) {
          // Create a new user if not found
          const newUser = new userModel({
            email: profile.emails[0].value,
            googleId: profile.id,
            name: profile.displayName,
            googlePicture: profile.photos[0].value,
          });

          user = await newUser.save();
        }

        done(null, user);
      } catch (err) {
        done(err);
      }
    }
  )
);

// Serialize and deserialize user
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  userModel
    .findById(id)
    .then((user) => {
      done(null, user);
    })
    .catch((err) => {
      done(err);
    });
});
// Google authentication routes
app.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login-failure" }),
  (req, res) => {
    // Redirect to the desired page after successful authentication
    const token = jwt.sign({ userId: req.user._id }, "your-secret-key", {
      expiresIn: "1h",
    });
    res.status(200).json({ status: "success", token });
  }
);
app.get("/login-failure", (req, res) => {
  res
    .status(401)
    .json({ status: "failure", message: "Google authentication failed" });
});
app.post("/store-name", authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    const { userId } = req.user;

    // Find the user by userId
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update the user's name
    user.name = name;
    await user.save();

    res.status(200).json({ message: "Name stored successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
app.post("/store-dob", authenticateToken, async (req, res) => {
  try {
    const { dob } = req.body; // Assuming dob is in 'dd mm yyyy' format
    const { userId } = req.user;

    // Find the user by userId
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Parse the 'dd mm yyyy' date format
    const [day, month, year] = dob.split(" ").map(Number);

    // Update the user's date of birth
    user.dob = { day, month, year };
    await user.save();

    res.status(200).json({ message: "Date of birth stored successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
app.post("/store-gender", authenticateToken, async (req, res) => {
  try {
    const { gender } = req.body;
    const { userId } = req.user;

    // Find the user by userId
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update the user's gender
    user.gender = gender;
    await user.save();

    res.status(200).json({ message: "Gender stored successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
app.post("/store-branch-year", authenticateToken, async (req, res) => {
  try {
    const { branch, year } = req.body;
    const { userId } = req.user;

    // Find the user by userId
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update the user's branch and year
    user.branch = branch;
    user.year = year;
    await user.save();

    res.status(200).json({ message: "Branch and year stored successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
app.post("/store-flat-status", authenticateToken, async (req, res) => {
  try {
    const { hasFlat } = req.body;
    const { userId } = req.user;

    // Find the user by userId
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update the user's flat status
    user.hasFlat = hasFlat;
    await user.save();

    res.status(200).json({ message: "Flat status stored successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
app.post("/store-address-rent", authenticateToken, async (req, res) => {
  try {
    const { flat, area, additional, monthlyAmount, brokerage } = req.body;
    const { userId } = req.user;

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update the user's address information
    user.address = {
      flat,
      area,
      additional,
    };
    (user.rent = {
      monthlyAmount,
      brokerage,
    }),
      await user.save();

    res
      .status(200)
      .json({ message: "Address information stored successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
app.post(
  "/store-furnishing-status-cap-occ",
  authenticateToken,
  async (req, res) => {
    try {
      const { furnishingStatus, capacity, occupied } = req.body;
      const { userId } = req.user;

      const user = await userModel.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      // Update the user's furnishing status
      user.furnishingStatus = furnishingStatus;
      user.capacity = capacity;
      user.occupied = occupied;
      await user.save();

      res
        .status(200)
        .json({ message: "Furnishing status stored successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
);
app.post("/store-lifestyle", authenticateToken, async (req, res) => {
  try {
    const { drink, smoke, workout, nonVegetarian } = req.body;
    const { userId } = req.user;

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Update the user's furnishing status
    user.drink = drink;
    user.smoke = smoke;
    user.workout = workout;
    user.nonVegetarian = nonVegetarian;
    await user.save();

    res.status(200).json({ message: "Lifestyle status stored successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
app.post("/store-bio", authenticateToken, async (req, res) => {
  try {
    const { bio } = req.body;
    const { userId } = req.user;

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update the user's bio
    user.bio = bio;
    await user.save();

    res.status(200).json({ message: "Bio stored successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
app.post("/swipe-user", authenticateToken, async (req, res) => {
  try {
    const { objectId } = req.body;
    const objectIdToSave = new ObjectId(objectId);
    const { userId } = req.user;

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const newMessage = new messageModel({
      sender: userId,
      receiver: objectIdToSave,
      text: "You can now Chat with this user",
    });

    // Save the message to MongoDB
    await newMessage.save();
    res.status(200).json({ message: "User stored successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
// Get request to get all the data :
app.post("/read-messages", authenticateToken, async (req, res) => {
  try {
    const { user2IdString } = req.body;
    const { userId } = req.user;
    const userId2 = new ObjectId(user2IdString);
    const messages = await messageModel
      .find({
        $or: [
          { sender: userId, receiver: userId2 },
          { sender: userId2, receiver: userId },
        ],
        read: true,
      })
      .sort({ timestamp: -1 }); // Sort by timestamp in ascending order (earliest to oldest)

    res.status(200).json({ message: "successful", messages });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
app.post("/unread-messages", authenticateToken, async (req, res) => {
  try {
    const { user2IdString } = req.body;
    const { userId } = req.user;
    const userId2 = new ObjectId(user2IdString);
    const messages = await messageModel
      .find({
        $or: [
          { sender: userId, receiver: userId2 },
          { sender: userId2, receiver: userId },
        ],
        read: false,
      })
      .sort({ timestamp: 1 }); // Sort by timestamp in ascending order (earliest to oldest)

    res.status(200).json({ message: "successful", messages });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
app.get("/user-details", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;

    // Find the user by userId
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const {
      name,
      email,
      capacity,
      drink,
      bio,
      smoke,
      workout,
      occupied,
      furnishingStatus,
      address,
      rent,
      dob,
      hasFlat,
      branch,
      year,
      gender,
      nonVegetarian,
      googlePicture,
      profileImage,
    } = user;
    // Respond with the user's details
    res.status(200).json({
      name: name,
      email: email,
      capacity: capacity,
      drink: drink,
      bio: bio,
      smoke: smoke,
      workout: workout,
      nonVegetarian: nonVegetarian,
      occupied: occupied,
      furnishingStatus: furnishingStatus,
      address: address,
      rent: rent,
      dob: dob,
      hasFlat: hasFlat,
      branch: branch,
      year: year,
      gender: gender,
      googlePicture: googlePicture,
      profileImage: profileImage,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
app.get("/messages-access", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;

    // Find the user by userId
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find unique users messaged by the current user
    const messages = await messageModel.find({
      $or: [{ sender: userId }, { receiver: userId }],
    });

    // Extract unique user IDs from the messages
    const uniqueUserIds = Array.from(
      new Set([
        ...messages.map((message) => message.sender.toString()),
        ...messages.map((message) => message.receiver.toString()),
      ])
    );

    // Fetch user details for the unique user IDs
    const uniqueUsers = await Promise.all(
      uniqueUserIds.map(async (uniqueUserId) => {
        const userDetails = await userModel
          .findById(uniqueUserId)
          .select("email _id");
        const latestMessage = await messageModel
          .findOne({
            $or: [
              { sender: userId, receiver: uniqueUserId },
              { sender: uniqueUserId, receiver: userId },
            ],
          })
          .sort({ timestamp: -1 })
          .limit(1);

        return {
          ...userDetails.toObject(),
          latestMessage: latestMessage || null,
        };
      })
    );
    uniqueUsers.sort((a, b) => {
      const timestampA = a.latestMessage ? a.latestMessage.timestamp : 0;
      const timestampB = b.latestMessage ? b.latestMessage.timestamp : 0;
      return timestampB - timestampA;
    });
    const filteredUsers = uniqueUsers.filter(
      (user) => user.latestMessage !== null
    );
    res.status(200).json({ uniqueUsers: filteredUsers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.delete("/delete-user", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;

    // Find and delete the user by userId
    const deletedUser = await userModel.findByIdAndDelete(userId);
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
app.post("/logout", (req, res) => {
  req.logout(); // Assuming you are using passport for authentication
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      res.status(500).json({ message: "Internal Server Error" });
    } else {
      res.status(200).json({ message: "Logout successful" });
    }
  });
});
app.post(
  "/upload-flat-images",
  authenticateToken,
  upload.array("images"),
  async (req, res) => {
    try {
      const { files } = req;

      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No images uploaded" });
      }

      const { userId } = req.user;
      const user = await userModel.findById(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (files.length > 4) {
        return res
          .status(404)
          .json({ message: "You can only upload upto 4 images" });
      }
      user.flatImages = [];
      files.forEach((file) => {
        // const imageBuffer = file.buffer.toString("base64"); //will be used in website only

        user.flatImages.push({
          //data: imageBuffer, //website only
          data: file, // for apps only
          // contentType: req.file.mimetype, // website only
          contentType: "image/png",
        });
      });
      // Save the user document with the new flatImages
      await user.save();

      res.status(200).json({ message: "Images uploaded successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
);
// app.post(
//   "/upload-single-image",
//   authenticateToken,
//   upload.single("image"),
//   async (req, res) => {
//     try {
//       const { file, index } = req;
//       if (!file || index === undefined) {
//         return res.status(400).json({ message: "No image or index provided" });
//       }

//       const { userId } = req.user;
//       const user = await userModel.findById(userId);

//       if (!user) {
//         return res.status(404).json({ message: "User not found" });
//       }
//       if (index < 0 || index >= user.flatImages.length) {
//         return res.status(400).json({ message: "Invalid index provided" });
//       }
//       const imageBuffer = file.buffer.toString("base64");

//       user.flatImages[index]({
//         data: imageBuffer,
//         contentType: file.mimetype,
//       });

//       // Save the user document with the new flatImages
//       await user.save();

//       res.status(200).json({ message: "Image uploaded successfully" });
//     } catch (error) {
//       console.error(error);
//       res.status(500).json({ message: "Internal Server Error" });
//     }
//   }
// );
app.get("/get-flat-image", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Check if flatImages array is not empty
    if (!user.flatImages || user.flatImages.length === 0) {
      return res.status(404).json({ message: "Image not found for the user" });
    }

    // Retrieve the first image from the flatImages array
    const imageUrls = [];
    for (i = 0; i < user.flatImages.length; i++) {
      // imageUrls.push( `data:${user.flatImages[i].contentType};base64,${user.flatImages[i].data}`) //This is how you upload to a web project
      imageUrls.push(`${user.flatImages[i].data}`);
    }
    // Construct the data URL for the first image

    res.status(200).json({ imageUrls: imageUrls });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
app.post(
  "/upload-profile-image",
  authenticateToken,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image uploaded" });
      }
      // const imageBuffer = req.file.buffer.toString("base64"); //only needed in website project
      const { userId } = req.user;
      const user = await userModel.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      user.profileImage = {
        data: req.file,
        // contentType: req.file.mimetype,
        contentType: "image/png",
      };

      await user.save();

      res.status(200).json({ message: " Profile Image uploaded successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
);
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
  socket.on("message-read", async (messageId) => {
    try {
      // Update the read status in MongoDB
      await messageModel.findByIdAndUpdate(messageId, { read: true });
      // Broadcast the updated message to all connected users
      io.emit("message-read", messageId);
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
