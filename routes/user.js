const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middlewares");
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
  swipeUser,
  readMessages,
  unreadMessages,
  getUserDetails,
  messageAccess,
  deleteUser,
  uploadFlatImages,
  getFlatImages,
  profileImage,
  displayImage,
  addLike,
  dislikeFlats,
  dislikeFlatmates,
} = require("../controllers/user");

router.post("/send-otp", sendOtp);

// Route to verify OTP and complete signup
router.post("/verify-otp", verifyOtp);
router.post("/google-auth", googleAppAuthentication);
router.post("/signup", signup);

// Login Route
router.post("/login", login);

// // Google authentication routes for web based authentication
// router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
// router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/Login-failure' }), googleCallbackMiddleware);
// router.get("/login-failure", loginFailureGoogle)
//--------------------------------------------------------------------------------------->
router.post("/store-name", authenticateToken, storeName);
router.post("/store-dob", authenticateToken, storeDOB);
router.post("/store-gender", authenticateToken, storeGender);
router.post("/store-branch-year", authenticateToken, storeBranchYear);
router.post("/store-flat-status", authenticateToken, storeFlatStatus);
router.post("/store-address-rent", authenticateToken, storeAddressRent);
router.post(
  "/store-furnishing-status-cap-occ",
  authenticateToken,
  furnishingStatus
);
// The following route needs changes
// router.post("/update-user-info", authenticateToken, updateValues);
router.post("/store-lifestyle", authenticateToken, storeLifestyle);
router.post("/store-bio", authenticateToken, storeBio);
router.post("/swipe-user", authenticateToken, swipeUser);
// Get request to get all the data :
router.post("/read-messages", authenticateToken, readMessages);
router.post("/unread-messages", authenticateToken, unreadMessages);
router.get("/user-details", authenticateToken, getUserDetails);
router.get("/messages-access", authenticateToken, messageAccess);

router.delete("/delete-user", authenticateToken, deleteUser);
router.post("/upload-flat-images", authenticateToken, uploadFlatImages);
// router.post( "/upload-single-image",authenticateToken,upload.single("image"),uploadSingleImage);
router.get("/get-flat-image", authenticateToken, getFlatImages);
router.post(
  "/upload-profile-image",
  authenticateToken,
  // upload.single("image"), ------------>used in multer
  profileImage
);
router.post(
  "/upload-display-image",
  authenticateToken,
  // upload.single("image"),
  displayImage
);
router.post("/add-like", authenticateToken, addLike);

router.post("/dislike-flats", authenticateToken, dislikeFlats);
router.post("/dislike-flatmates", authenticateToken, dislikeFlatmates);
module.exports = router;
