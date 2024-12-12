import jwt from "jsonwebtoken";

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized: Token is required" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Use your JWT secret
    req.user = decoded; // Attach user info to request object
    next(); // Proceed to the next middleware/route
  } catch (error) {
    console.error("JWT verification failed:", error);
    return res.status(403).json({ message: "Forbidden: Invalid token" });
  }
};

export default authenticateToken;

