const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
  const authHeader = req.header("Authorization");
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, "your-secret-key", (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

const googleCallbackMiddleware = (req, res) => {
  // Redirect to the desired page after successful authentication
  const isNewUser = req.user._isNewUser || false;
  const token = jwt.sign({ userId: req.user._id }, "your-secret-key", {
    expiresIn: "1h",
  });
  res.status(200).json({ status: "success", token, newUser: isNewUser });
};
module.exports = { authenticateToken , googleCallbackMiddleware };
