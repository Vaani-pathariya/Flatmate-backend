const userModel = require("../models/user");
const getFlats = async (req, res) => {
  try {
    const { userId } = req.user;
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const likedByUserIds = await userModel
      .find({ likes: userId })
      .distinct("_id");
    const excludedUsers = [...user.excludedFlats, userId];
    excludedUsers.push(...likedByUserIds);
    const flats = await userModel
      .find({
        hasFlat: true,
        // _id: { $ne: userId }
        _id: { $nin: excludedUsers }, // Exclude specified user IDs
      })
      .select(
        "name email _id flatImages address occupied capacity bhk name year branch smoke workout drink nonVegetarian googlePicture profileImage rent"
      )
      .exec();
    const flatsWithConvertedProfileImages = flats.map((user) => {
      if (user.profileImage) {
        const profile = `data:${user.profileImage.contentType};base64,${user.profileImage.data}`;
        user.profileImage = profile;
      }
      const imageUrls = [];
      for (i = 0; i < user.flatImages.length; i++) {
        imageUrls.push(
          `data:${user.flatImages[i].contentType};base64,${user.flatImages[i].data}`
        );
      }
      user.flatImages=imageUrls;
      return user;
    });
    res
      .status(200)
      .json({ message: "successful", flats: flatsWithConvertedProfileImages });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
const getFlatmates = async (req, res) => {
  try {
    const { userId } = req.user;
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const excludedUsers = [...user.excludedFlatmates, userId];
    const flatmates = await userModel
      .find({
        // _id: { $ne: userId }
        _id: { $nin: excludedUsers }, // Exclude specified user IDs
      })
      .select(
        "name email _id branch year smoke nonVegetarian workout drink googlePicture profileImage displayImg"
      )
      .exec();
    const flatmatesWithConvertedProfileImages = flatmates.map((user) => {
      if (user.profileImage) {
        const profile = `data:${user.profileImage.contentType};base64,${user.profileImage.data}`;
        user.profileImage = profile;
      }
      if (user.displayImg) {
        const display = `data:${user.displayImg.contentType};base64,${user.displayImg.data}`;
        user.displayImg = display;
      }
      return user;
    });
    res
      .status(200)
      .json({
        message: "successful",
        flatmates: flatmatesWithConvertedProfileImages,
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
module.exports = {
  getFlats,
  getFlatmates,
};
