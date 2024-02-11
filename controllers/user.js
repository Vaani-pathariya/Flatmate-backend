const userModel = require("../models/user");
const messageModel = require("../models/message");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(process.env.clientIDApp);
const bcrypt = require("bcrypt");
const otpStorage = new Map();
const generateOTP = () => {
  const otp = Math.floor(100000 + Math.random() * 900000);
  return otp.toString();
};
const sendOtp = async (req, res) => {
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
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASSWORD,
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
};
const verifyOtp = async (req, res) => {
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
};
const googleAppAuthentication = async (req, res) => {
  const { idToken } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.clientIDApp, // Should match your Android app's client ID
    });
    const payload = ticket.getPayload();
    let user = await userModel.findOne({ email: payload.email });
    let newUser = false;
    if (user) {
      // Update user information if email exists
      user.googleId = user.googleId || payload.sub;
      user.name = user.name || payload.name;
      user.googlePicture = user.googlePicture || payload.picture;
    } else {
      // Create a new user if not found
      const newUser = new userModel({
        email: payload.email,
        googleId: payload.sub,
        name: payload.name,
        googlePicture: payload.picture,
      });

      user = await newUser.save();
      newUser = true;
    }
    const token = jwt.sign({ userId: user._id }, "your-secret-key");
    res.status(200).send({ success: true, token, newUser });
  } catch (error) {
    console.error("Error verifying Google token:", error);
    res.status(401).send({ success: false, error: "Unauthorized" });
  }
};
const signup = async (req, res) => {
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
    const token = jwt.sign({ userId: user._id }, "your-secret-key");
    res.status(201).json({ message: "Signup successful", token: token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
const login = async (req, res) => {
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
    const token = jwt.sign({ userId: user._id }, "your-secret-key");

    res.json({ token: token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
// const loginFailureGoogle =(req,res)=>{
//     res
//     .status(401)
//     .json({ status: "failure", message: "Google authentication failed" });
// }
const storeName = async (req, res) => {
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
};
const storeDOB = async (req, res) => {
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
};
const storeGender = async (req, res) => {
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
};
const storeBranchYear = async (req, res) => {
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
};
const storeFlatStatus = async (req, res) => {
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
};
const storeAddressRent = async (req, res) => {
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
};
const furnishingStatus = async (req, res) => {
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

    res.status(200).json({ message: "Furnishing status stored successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
// const updateValues = async (req, res) => {
//   try {
//     const {
//       name, //
//       email,
//       capacity,
//       drink,
//       bio,
//       smoke,
//       workout,
//       occupied,
//       furnishingStatus,
//       address,
//       rent,
//       dob,
//       hasFlat, //
//       displayImg,
//       branch, //
//       year, //
//       gender,
//       nonVegetarian,
//       googlePicture,
//       profileImage,
//     } = req.body;
//     const { userId } = req.user;

//     const user = await userModel.findById(userId);
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // Update the user's information
//     if (name!=null) user.name = name;
//     if (email) user.email = email;
//     if (capacity) user.capacity = capacity;
//     if (drink) user.drink = drink;
//     if (bio) user.bio = bio;
//     if (smoke) user.smoke = smoke;
//     if (workout) user.workout = workout;
//     if (occupied) user.occupied = occupied;
//     if (furnishingStatus) user.furnishingStatus = furnishingStatus;
//     if (address) user.address = address;
//     if (rent) user.rent = rent;
//     if (dob) user.dob = dob;
//     if (hasFlat) user.hasFlat = hasFlat;
//     if (displayImg) user.displayImg = displayImg;
//     if (branch) user.branch = branch;
//     if (year) user.year = year;
//     if (gender) user.gender = gender;
//     if (nonVegetarian) user.nonVegetarian = nonVegetarian;
//     if (googlePicture) user.googlePicture = googlePicture;
//     if (profileImage) user.profileImage = profileImage;

//     await user.save();

//     res.status(200).json({ message: "User information updated successfully" });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// };
const storeLifestyle=async(req,res)=>{
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
}
const storeBio=async(req,res)=>{
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
}
const readMessages=async(req,res)=>{
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
}
const unreadMessages=async(req,res)=>{
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
}
const getUserDetails =async(req,res)=>{
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
          displayImg,
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
          displayImg: displayImg,
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
      }
}
const messageAccess=async(req,res)=>{
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
        const likedUsers = await userModel.find({ _id: { $in: user.likes } }).select("_id name profileImage")
        res.status(200).json({ uniqueUsers: filteredUsers,likes : likedUsers});
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
      }
}
const deleteUser=async(req,res)=>{
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
}
const uploadFlatImages=async(req,res)=>{
    try {
        const { files } = req.body;
  
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
          const imageBuffer = Buffer.from(file, "base64");
          user.flatImages.push({
            //data: imageBuffer, //website only
            data: imageBuffer, // for apps only
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
// const uploadSingleImage=async(req,res)=>{
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
//}
const getFlatImages=async(req,res)=>{
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
}
const profileImage=async(req,res)=>{
    try {
        const { file } = req.body;
        if (!file) {
          return res.status(400).json({ message: "No image uploaded" });
        }
        // const imageBuffer = req.file.buffer.toString("base64"); //only needed in website project
        const { userId } = req.user;
        const user = await userModel.findById(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        const imageBuffer = Buffer.from(file, "base64");
        user.profileImage = {
          data: imageBuffer,
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
const displayImage=async (req,res)=>{
    try {
        const { file } = req.body;
        if (!file) {
          return res.status(400).json({ message: "No image uploaded" });
        }
        // const imageBuffer = req.file.buffer.toString("base64"); //only needed in website project
        const { userId } = req.user;
        const user = await userModel.findById(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        const imageBuffer = Buffer.from(file, "base64");
        user.displayImg = {
          data: imageBuffer,
          // contentType: req.file.mimetype,
          contentType: "image/png",
        };
  
        await user.save();
  
        res.status(200).json({ message: " Display Image uploaded successfully" });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
      }
}
const addLike=async(req,res)=>{
    try {
        const { id } = req.body;
        const { userId } = req.user;
        // Find the user by userId
        const actualId = new ObjectId(id);
        const user = await userModel.findById(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        const userLiked = await userModel.findById(actualId);
        if (!userLiked) {
          return res.status(404).json({ message: "User Liked not found" });
        }
        // Add a like to the 0th index of the likes array
        userLiked.likes.unshift(userId);
    
        // Save the user document with the updated likes array
        await userLiked.save();
        const newMessage = new messageModel({
          sender: userId,
          receiver: actualId,
          text: "You can now Chat with this user",
        });
    
        // Save the message to MongoDB
        await newMessage.save();
        res.status(200).json({ message: "Like added successfully" });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
      }
}
const dislikeFlats=async(req,res)=>{
    try {
        const { userId } = req.user;
        const { id } = req.body;
        const user = await userModel.findById(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        const idMain = new ObjectId(id);
        user.excludedFlats.push(idMain);
        await user.save();
        res.status(200).json({ message: "successful" });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
      }
}
const dislikeFlatmates=async(req,res)=>{
    try {
        const { userId } = req.user;
        const { id } = req.body;
        const user = await userModel.findById(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        const idMain = new ObjectId(id);
        user.excludedFlatmates.push(idMain);
        await user.save();
        res.status(200).json({ message: "successful" });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
      }
}
const forgotPasswordOtpSend =async (req,res)=>{
  try {
    const { email } = req.body;
    if (!email || email == "") {
      return res.status(400).json({ message: "Email is required" });
    }

    // Check if the email is already registered
    const existingUser = await userModel.findOne({ email });
    if (!existingUser) {
      return res.status(400).json({ message: "Email is not registered" });
    }

    // Generate and send OTP
    const otp = generateOTP();

    // Save OTP for verification
    otpStorage.set(email, otp);
    let transporter = await nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASSWORD,
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
}
const verifyForgotPasswordOtp=async(req,res)=>{
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
}
const forgotPassword =async (req,res)=>{
  try {
    const { email, password } = req.body;

    // Check if the email is already registered
    const existingUser = await userModel.findOne({ email });
    if (!existingUser) {
      return res.status(400).json({ message: "Email not already registered" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const newUser = new userModel({
      email,
      password: hashedPassword,
    });

    let user = await newUser.save();
    res.status(201).json({ message: "Password saved successful"});
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
module.exports = {
  sendOtp,
  uploadFlatImages,
  getFlatImages,
  dislikeFlatmates,
  dislikeFlats,
  verifyOtp,
  googleAppAuthentication,
  signup,
  login,
  storeName,
  storeDOB,
  addLike,
  storeGender,
  storeBranchYear,
  storeFlatStatus,
  storeAddressRent,
  furnishingStatus,
  storeLifestyle,
  storeBio,
  profileImage,
  readMessages,
  unreadMessages,
  getUserDetails,
  messageAccess,
  deleteUser,
  displayImage,
  forgotPasswordOtpSend,
  verifyForgotPasswordOtp,
  forgotPassword
};