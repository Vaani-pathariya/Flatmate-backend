const userModel = require("../models/user");
const getFlats=async(req,res)=>{
    try {
        const { userId } = req.user;
        const user = await userModel.findById(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        const excludedUsers = [...user.excludedFlats, userId];
        const flats = await userModel
          .find({
            hasFlat: true,
            // _id: { $ne: userId }
            _id: { $nin: excludedUsers }, // Exclude specified user IDs
          })
          .select(
            "name email _id flatImages address occupied capacity name year branch smoke workout drink nonVegetarian googlePicture profileImage rent"
          )
          .exec();
        res.status(200).json({ message: "successful", flats });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
      }
}
const getFlatmates=async (req,res)=>{
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
        res.status(200).json({ message: "successful", flatmates });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
      }
}
module.exports={
    getFlats,
    getFlatmates
}