// const passport = require("passport"); --------------> Use for web app authentication google authentication 
// const GoogleStrategy = require("passport-google-oauth20").Strategy; ------------> Use for web app authentication google authentication 
// const userModel = require('./models/userModel');

// Google OAuth 2.0 configuration for web based applications -----------------> 
// passport.use(
//   new GoogleStrategy(
//     {
//       clientID:
//         process.env.clientID,
//       clientSecret: process.env.clientSecret,
//       callbackURL: process.env.callbackURL,
//     },
//     async (accessToken, refreshToken, profile, done) => {
//       try {
//         let user = await userModel.findOne({ email: profile.emails[0].value });
//         if (user) {
//           // Update user information if email exists
//           user.googleId = profile.id;
//           user.name = user.name || profile.displayName;
//           user.googlePicture = user.googlePicture || profile.photos[0].value;
//         }
//         else {
//           // Create a new user if not found
//           const newUser = new userModel({
//             email: profile.emails[0].value,
//             googleId: profile.id,
//             name: profile.displayName,
//             googlePicture: profile.photos[0].value,
//           });

//           user = await newUser.save();
//           user._isNewUser = true;
//         }

//         done(null, user);
//       } catch (err) {
//         done(err);
//       }
//     }
//   )
// );

// // Serialize and deserialize user
// passport.serializeUser((user, done) => {
//   done(null, user.id);
// });

// passport.deserializeUser((id, done) => {
//   userModel
//     .findById(id)
//     .then((user) => {
//       done(null, user);
//     })
//     .catch((err) => {
//       done(err);
//     });
// });