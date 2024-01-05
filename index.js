const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require("mongoose");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const userModel = require("./models");
const nodemailer = require('nodemailer');
const authenticateToken = require('./authenticateToken');
const app = express();
const port = 8000;
app.use(cors());

mongoose.connect('mongodb+srv://vaani:vaani@cluster0.b5sf2hj.mongodb.net/Flatmate?retryWrites=true&w=majority',
    {
        useNewUrlParser: true,
        useUnifiedTopology: true
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
app.use(require('express-session')({ secret: 'your-secret-key', resave: true, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
const otpStorage = new Map();
const generateOTP = () => {
    const otp = Math.floor(100000 + Math.random() * 900000);
    return otp.toString();
};
app.post('/send-otp', async (req, res) => {
    try {
      const { email } = req.body;
  
      // Check if the email is already registered
      const existingUser = await userModel.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email is already registered' });
      }
  
      // Generate and send OTP
      const otp = generateOTP();
      
      // Save OTP for verification
      otpStorage.set(email, otp);
      let transporter=await nodemailer.createTransport({
        service:'gmail',
        auth:{
            user: 'vpathariya2111@gmail.com',
            pass: 'dhlbjpwvhyhtrcuc'
        }
      })
      // Send OTP to the provided email (using Nodemailer, for example)
      const mailOptions = {
        from: 'Flatmate <vpathariya2111@gmail.com>', // sender address
        to: `${email}`, // list of receivers
        subject: ' OTP ', // Subject line
        text: `${otp}`,
        html: `<b>${otp}</b>` // html body
      };
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          return console.log(error);
        }
        console.log('Message sent: %s', info.messageId);
      });
      // Respond with success message
      res.status(200).json({ message: 'OTP sent successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });
  
  // Route to verify OTP and complete signup
  app.post('/verify-otp', async (req, res) => {
    try {
      const { email, otp } = req.body;
  
      // Verify OTP that should be in string format 
      const savedOTP = otpStorage.get(email);
  
      if (!savedOTP || savedOTP !== otp) {
        return res.status(401).json({ message: 'Invalid OTP' });
      }
  
      // Clear the OTP from storage
      otpStorage.delete(email);
  
      res.status(201).json({ message: 'Successful' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });
app.post('/signup', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if the email is already registered
        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email is already registered' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user
        const newUser = new userModel({
            email,
            password: hashedPassword,
        });

        let user = await newUser.save();
        const token = jwt.sign({ userId: user._id }, 'your-secret-key',{ expiresIn: '1h' });
        res.status(201).json({ message: 'Signup successful',token:token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Login Route
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find the user by email
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Compare the password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Generate JWT token
        const token = jwt.sign({ userId: user._id }, 'your-secret-key', { expiresIn: '1h' });

        res.json({ token:token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


// Google OAuth 2.0 configuration
passport.use(
    new GoogleStrategy(
        {
            clientID: '316208084302-qdp4g6i3nmf8rpo6tdeb23qt5tr6gi9g.apps.googleusercontent.com',
            clientSecret: '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',
            callbackURL: 'https://flatmate-backend.onrender.com/google/callback',
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                let user = await userModel.findOne({ googleId: profile.id });

                if (!user) {
                    // Create a new user if not found
                    const newUser = new userModel({
                        email: profile.emails[0].value,
                        googleId: profile.id,
                        name:profile.displayName,
                        picture:profile.photos[0].value
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
    userModel.findById(id)
        .then(user => {
            done(null, user);
        })
        .catch(err => {
            done(err);
        });
});
// Google authentication routes
app.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get(
    '/google/callback',
    passport.authenticate('google', { failureRedirect: '/login-failure' }),
    (req, res) => {
        // Redirect to the desired page after successful authentication
        const token = jwt.sign({ userId: req.user._id }, 'your-secret-key', { expiresIn: '1h' });
        res.status(200).json({status:'success',token});
    }
);
app.get('/login-failure', (req, res) => {
    res.status(401).json({ status: 'failure', message: 'Google authentication failed' });
});
app.post('/store-name', authenticateToken, async (req, res) => {
    try {
        const { name } = req.body;
        const { userId } = req.user;

        // Find the user by userId
        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update the user's name
        user.name = name;
        await user.save();

        res.status(200).json({ message: 'Name stored successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
app.post('/store-dob', authenticateToken, async (req, res) => {
    try {
        const { dob } = req.body; // Assuming dob is in 'dd mm yyyy' format
        const { userId } = req.user;

        // Find the user by userId
        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Parse the 'dd mm yyyy' date format
        const [day, month, year] = dob.split(' ').map(Number);

        // Update the user's date of birth
        user.dob = { day, month, year };
        await user.save();

        res.status(200).json({ message: 'Date of birth stored successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
app.post('/store-gender', authenticateToken, async (req, res) => {
    try {
        const { gender } = req.body;
        const { userId } = req.user;

        // Find the user by userId
        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update the user's gender
        user.gender = gender;
        await user.save();

        res.status(200).json({ message: 'Gender stored successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
app.post('/store-branch-year', authenticateToken, async (req, res) => {
    try {
        const { branch, year } = req.body;
        const { userId } = req.user;

        // Find the user by userId
        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update the user's branch and year
        user.branch = branch;
        user.year = year;
        await user.save();

        res.status(200).json({ message: 'Branch and year stored successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
app.post('/store-flat-status', authenticateToken, async (req, res) => {
    try {
        const { hasFlat } = req.body;
        const { userId } = req.user;

        // Find the user by userId
        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update the user's flat status
        user.hasFlat = hasFlat;
        await user.save();

        res.status(200).json({ message: 'Flat status stored successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
app.post('/store-address-rent', authenticateToken, async (req, res) => {
    try {
      const { flat, area, additional, monthlyAmount,brokerage } = req.body;
      const { userId } = req.user;
  
      const user = await userModel.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      // Update the user's address information
      user.address = {
        flat,
        area,
        additional,
      }
      user.rent= {
        monthlyAmount,
        brokerage,
      },
  
      await user.save();
  
      res.status(200).json({ message: 'Address information stored successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });
  app.post('/store-furnishing-status-cap-occ', authenticateToken, async (req, res) => {
    try {
      const { furnishingStatus,capacity,occupied} = req.body;
      const { userId } = req.user;
  
      const user = await userModel.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      // Update the user's furnishing status
      user.furnishingStatus = furnishingStatus;
      user.capacity=capacity;
      user.occupied=occupied;
      await user.save();
  
      res.status(200).json({ message: 'Furnishing status stored successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });
  app.post('/store-lifestyle', authenticateToken, async (req, res) => {
    try {
      const { drink,smoke,workout} = req.body;
      const { userId } = req.user;
  
      const user = await userModel.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      // Update the user's furnishing status
      user.drink = drink;
      user.smoke=smoke;
      user.workout=workout;
      await user.save();
  
      res.status(200).json({ message: 'Furnishing status stored successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });
  app.post('/store-bio', authenticateToken, async (req, res) => {
    try {
      const { bio } = req.body;
      const { userId } = req.user;
  
      const user = await userModel.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      // Update the user's bio
      user.bio = bio;
      await user.save();
  
      res.status(200).json({ message: 'Bio stored successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });
// Get request to get all the data : 
app.get('/user-details', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.user;

        // Find the user by userId
        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const {name,email,capacity,drink,bio,smoke,workout,occupied,furnishingStatus,address,rent,dob,hasFlat,branch,year,gender,picture}=user;
        // Respond with the user's details
        res.status(200).json({ name:name,email:email,capacity:capacity,drink:drink,bio:bio,smoke:smoke,workout:workout,occupied:occupied,furnishingStatus:furnishingStatus,address:address,rent:rent,dob:dob,hasFlat:hasFlat,branch:branch,year:year,gender:gender,picture:picture });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
app.delete('/delete-user', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.user;

        // Find and delete the user by userId
        const deletedUser = await userModel.findByIdAndDelete(userId);
        if (!deletedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
  app.post('/logout', (req, res) => {
    req.logout(); // Assuming you are using passport for authentication
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
        res.status(500).json({ message: 'Internal Server Error' });
      } else {
        res.status(200).json({ message: 'Logout successful' });
      }
    });
});
// basic get request 
app.get('/', async (req, res) => {
    res.json({message:"Working"});
});
app.listen(port, () => console.log(`Hello world app listening on port ${port}!`));

