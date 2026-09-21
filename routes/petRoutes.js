const express = require("express");
const Pet = require("../models/Pet");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

// GET ALL PETS
router.get("/", async (req, res) => {
  try {
    const pets = await Pet.find()
      .populate("ownerId", "name email phone")
      .sort({ createdAt: -1 });

    res.status(200).json({ pets });
  } catch (error) {
    console.error("GET PETS ERROR:", error);
    res.status(500).json({
      message: "Failed to fetch pets"
    });
  }
});

// GET MY PETS
// IMPORTANT: this must come before /:id
router.get("/mine", protect, async (req, res) => {
  try {
    const pets = await Pet.find({
      ownerId: req.user.userId
    }).sort({ createdAt: -1 });

    res.status(200).json({ pets });
  } catch (error) {
    console.error("MY PETS ERROR:", error);

    res.status(500).json({
      message: "Failed to fetch your pets"
    });
  }
});

// GET SINGLE PET
router.get("/:id", async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id)
      .populate("ownerId", "name email phone");

    if (!pet) {
      return res.status(404).json({
        message: "Pet not found"
      });
    }

    res.status(200).json({ pet });
  } catch (error) {
    console.error("GET SINGLE PET ERROR:", error);

    res.status(500).json({
      message: "Failed to fetch pet"
    });
  }
});

// ADD PET
router.post("/", protect, async (req, res) => {
  try {
    if (
      req.user.role !== "owner" &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        message: "Only owners and admins can add pets"
      });
    }

    const {
      name,
      breed,
      age,
      gender,
      description,
      image
    } = req.body;

    if (
      !name ||
      !breed ||
      age === undefined ||
      !gender ||
      !description
    ) {
      return res.status(400).json({
        message: "Please fill all required fields"
      });
    }

    const pet = await Pet.create({
      name,
      breed,
      age: Number(age),
      gender,
      description,
      image: image || "",
      ownerId: req.user.userId,
      adopted: false
    });

    res.status(201).json({
      message: "Pet added successfully",
      pet
    });
  } catch (error) {
    console.error("ADD PET ERROR:", error);

    res.status(500).json({
      message: "Failed to add pet"
    });
  }
});

// UPDATE PET
router.put("/:id", protect, async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id);

    if (!pet) {
      return res.status(404).json({
        message: "Pet not found"
      });
    }

    const isAdmin = req.user.role === "admin";
    const isOwner =
      pet.ownerId.toString() === req.user.userId;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        message: "You can only edit your own pets"
      });
    }

    const {
      name,
      breed,
      age,
      gender,
      description,
      image,
      adopted
    } = req.body;

    pet.name = name ?? pet.name;
    pet.breed = breed ?? pet.breed;
    pet.age = age ?? pet.age;
    pet.gender = gender ?? pet.gender;
    pet.description = description ?? pet.description;
    pet.image = image ?? pet.image;
    pet.adopted = adopted ?? pet.adopted;

    const updatedPet = await pet.save();

    res.status(200).json({
      message: "Pet updated successfully",
      pet: updatedPet
    });
  } catch (error) {
    console.error("UPDATE PET ERROR:", error);

    res.status(500).json({
      message: "Failed to update pet"
    });
  }
});

// DELETE PET
router.delete("/:id", protect, async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id);

    if (!pet) {
      return res.status(404).json({
        message: "Pet not found"
      });
    }

    const isAdmin = req.user.role === "admin";

    const isOwner =
      pet.ownerId.toString() === req.user.userId;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        message: "You can only delete your own pets"
      });
    }

    await pet.deleteOne();

    res.status(200).json({
      message: "Pet deleted successfully"
    });
  } catch (error) {
    console.error("DELETE PET ERROR:", error);

    res.status(500).json({
      message: "Failed to delete pet"
    });
  }
});

module.exports = router;