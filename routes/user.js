const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middlewares");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const {
  sendOtp,
  verifyOtp,
  googleAppAuthentication,
  signup,
  login,
  storeName,
  storeDOB,
  storeGender,
  storeBranchYear,
  storeFlatStatus,
  storeAddressRent,
  furnishingStatus,
  storeLifestyle,
  storeBio,
  readMessages,
  unreadMessages,
  getUserDetails,
  messageAccess,
  deleteUser,
  uploadFlatImages,
  profileImage,
  displayImage,
  addLike,
  dislikeFlats,
  dislikeFlatmates,
  forgotPasswordOtpSend,
  verifyForgotPasswordOtp,
  forgotPassword,
  updateTextValues,
  updateImageData,
} = require("../controllers/user");

//Send OTP to email Id
router.post("/send-otp", sendOtp);
//Verify OTP
router.post("/verify-otp", verifyOtp);
//Android app google authentication
router.post("/google-auth", googleAppAuthentication);
//User Signup 
router.post("/signup", signup);
//User Login
router.post("/login", login);
// // Google authentication routes for web based authentication
// router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
// router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/Login-failure' }), googleCallbackMiddleware);
// router.get("/login-failure", loginFailureGoogle)
//--------------------------------------------------------------------------------------->
//Store name 
router.post("/store-name", authenticateToken, storeName);
//Store date of birth 
router.post("/store-dob", authenticateToken, storeDOB);
//Store gender 
router.post("/store-gender", authenticateToken, storeGender);
//Store branch and year
router.post("/store-branch-year", authenticateToken, storeBranchYear);
//Store flat status
router.post("/store-flat-status", authenticateToken, storeFlatStatus);
//Store address and rent 
router.post("/store-address-rent", authenticateToken, storeAddressRent);
//Store furnishing status , capacity and occupancy
router.post("/store-furnishing-status-cap-occ",authenticateToken,furnishingStatus);
//Update text based data 
router.post("/update-user-info", authenticateToken, updateTextValues);
//Update image based data 
router.post("/update-image-data",authenticateToken,upload.fields([
  { name: 'profileImage', maxCount: 1 }, // Upload one profile image
  { name: 'displayImg', maxCount: 1 }, // Upload one display image
  { name: 'FlatImages', maxCount: 4 } // Upload up to 4 flat images 
]), updateImageData);
//Store Lifestyle 
router.post("/store-lifestyle", authenticateToken, storeLifestyle);
//Store bio
router.post("/store-bio", authenticateToken, storeBio);
//Get read messages with particular user 
router.post("/read-messages", authenticateToken, readMessages);
//Get unread messages from particular user 
router.post("/unread-messages", authenticateToken, unreadMessages);
//Get user Details 
router.get("/user-details", authenticateToken, getUserDetails);
//Get message access data 
router.get("/messages-access", authenticateToken, messageAccess);
//Delete user 
router.delete("/delete-user", authenticateToken, deleteUser);
//Upload flat images 
router.post("/upload-flat-images",authenticateToken,upload.array("images", 4),uploadFlatImages);
//Upload profile image 
router.post("/upload-profile-image", authenticateToken,upload.single("image"),profileImage);
//Upload display image 
router.post("/upload-display-image",authenticateToken,upload.single("image"),displayImage);
//Add like route
router.post("/add-like", authenticateToken, addLike);
//Forgot password otp route 
router.post("/forgot-password-otp", forgotPasswordOtpSend);
//Forgot password otp verification
router.post("/forgot-password-otp-verify", verifyForgotPasswordOtp);
//Forgot password set
router.post("/forgot-password-set", forgotPassword);
//Dislike flats 
router.post("/dislike-flats", authenticateToken, dislikeFlats);
//Dislike flatmates 
router.post("/dislike-flatmates", authenticateToken, dislikeFlatmates);
module.exports = router;
