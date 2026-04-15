const jwt = require("jsonwebtoken");
const User = require("../models/User");
const JWT_SECRET = process.env.JWT_SECRET;


const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header OR body
    let token =
      req.headers.authorization?.split(" ")[1] || req.body.token;

    if (!token) {
      return res.status(401).json({
        error: true,
        message: "No token provided",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Get user from DB
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        error: true,
        message: "User not found",
      });
    }

    // Attach user to request
    req.user = user;

    next();
  } catch (err) {
    return res.status(401).json({
      error: true,
      message: "Invalid or expired token",
    });
  }
};

module.exports = authMiddleware;