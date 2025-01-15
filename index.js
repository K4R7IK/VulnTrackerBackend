import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authenticateToken from "./middleware/authenticateToken.js"; // JWT middleware

dotenv.config();

// Ensure required environment variables are defined
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in the environment variables.");
}

const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(",") || "*", // Add allowed origins in .env
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
};
app.use(cors(corsOptions));

// Parse JSON requests
app.use(express.json());

// Import routes
import authRoutes from "./routes/auth.js";
import uploadRoutes from "./routes/upload.js";
import companiesRoutes from "./routes/companies.js";
import vulnerabilitiesRoutes from "./routes/vulnerabilities.js";
import quartersRoutes from "./routes/quarters.js";
import usersRoutes from "./routes/users.js";
import summaryRoutes from "./routes/summary.js";

// Public routes
app.use("/api/auth", authRoutes);

// Protected routes (apply JWT middleware)
app.use(authenticateToken); // All routes below this require authentication
app.use("/api/upload", uploadRoutes);
app.use("/api/companies", companiesRoutes);
app.use("/api/vulnerabilities", vulnerabilitiesRoutes);
app.use("/api/quarters", quartersRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/summary", summaryRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err.stack);
  res.status(err.status || 500).json({ message: err.message || "Internal Server Error" });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
