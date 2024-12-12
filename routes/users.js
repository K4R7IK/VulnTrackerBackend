import express from "express";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import authenticateToken from "../middleware/authenticateToken.js";

const router = express.Router();
const prisma = new PrismaClient();

// Utility function to hash passwords
const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

// Middleware for admin-only routes
const requireAdmin = (req, res, next) => {
  if (req.user.role !== "Admin") {
    return res.status(403).json({ message: "Access denied. Admins only." });
  }
  next();
};

// Get all users (Admin-only)
router.get("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyId: true,
        createdAt: true,
        updatedAt: true,
        company: true, // Include the company relationship
      }
    });
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Error fetching users." });
  }
});

// Get a single user by ID
router.get("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { company: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Restrict access if the user is not admin and accessing another user
    if (req.user.role !== "Admin" && req.user.userId !== id) {
      return res.status(403).json({ message: "Access denied." });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Error fetching user." });
  }
});

// Create a new user (Admin-only)
router.post("/", authenticateToken, requireAdmin, async (req, res) => {
  const { name, email, password, role, companyId } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  try {
    const hashedPassword = await hashPassword(password);

    // Validate company ID if provided
    if (companyId) {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });
      if (!company) {
        return res.status(400).json({ message: "Invalid company ID." });
      }
    }

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        companyId: companyId || null,
      },
    });

    res.status(201).json(newUser);
  } catch (error) {
    console.error("Error creating user:", error);
    if (error.code === "P2002") {
      return res.status(400).json({ message: "Email already exists." });
    }
    res.status(500).json({ message: "Error creating user." });
  }
});

// Update an existing user
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, email, password, role, companyId } = req.body;

  try {
    // Validate role if provided
    const validRoles = ["Admin", "User"];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role provided." });
    }

    // Initialize data object for update
    const data = { name, email, role };

    // Validate companyId if provided
    if (companyId) {
      const companyExists = await prisma.company.findUnique({
        where: { id: companyId },
      });
      if (!companyExists) {
        return res.status(400).json({ message: "Invalid company ID." });
      }
      data.companyId = companyId; // Assign valid companyId
    } else {
      data.companyId = null; // Explicitly set to null
    }

    // Handle password update
    if (password) {
      data.password = await bcrypt.hash(password, 10); // Hash the new password
    }

    // Update user in the database
    console.log("Updating user:", data);
    console.log("With UserID:", id);
    const updatedUser = await prisma.user.update({
      where: { id },
      data,
    });

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error.message, error.stack);
    if (error.code === "P2002") {
      return res.status(400).json({ message: "Email already exists." });
    }
    res.status(500).json({ message: "Error updating user." });
  }
});

// Delete a user (Admin-only)
router.delete("/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.user.delete({
      where: { id },
    });

    res.status(200).json({ message: "User deleted successfully." });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Error deleting user." });
  }
});

export default router;
