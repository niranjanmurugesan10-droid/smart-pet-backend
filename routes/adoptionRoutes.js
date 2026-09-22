const express = require("express");
const AdoptionRequest = require("../models/AdoptionRequest");
const Pet = require("../models/Pet");
const User = require("../models/User");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", protect, async (req, res) => {
  try {
    if (req.user.role !== "adopter") {
      return res.status(403).json({
        message: "Only adopters can request adoption"
      });
    }

    const {
      petId,
      name,
      email,
      phone,
      address,
      message
    } = req.body;

    if (
      !petId ||
      !name ||
      !email ||
      !phone ||
      !address ||
      !message
    ) {
      return res.status(400).json({
        message: "Please fill all required fields"
      });
    }

    const pet = await Pet.findById(petId);

    if (!pet) {
      return res.status(404).json({ message: "Pet not found" });
    }

    if (pet.adopted) {
      return res.status(400).json({
        message: "This pet has already been adopted"
      });
    }

    const owner = await User.findById(pet.ownerId);

    if (!owner) {
      return res.status(404).json({
        message: "Pet owner not found"
      });
    }

    const existingRequest = await AdoptionRequest.findOne({
      petId: pet._id,
      adopterId: req.user.userId,
      status: "pending"
    });

    if (existingRequest) {
      return res.status(400).json({
        message: "You already have a pending request for this pet"
      });
    }

    const adoptionRequest = await AdoptionRequest.create({
      petId: pet._id,
      adopterId: req.user.userId,
      ownerId: pet.ownerId,
      name,
      email: email.toLowerCase().trim(),
      phone,
      address,
      message,
      status: "pending"
    });

    res.status(201).json({
      message: "Adoption request submitted successfully",
      request: adoptionRequest
    });
  } catch (error) {
    console.error("CREATE ADOPTION REQUEST ERROR:", error);
    res.status(500).json({
      message: "Failed to submit adoption request"
    });
  }
});

router.get("/my-requests", protect, async (req, res) => {
  try {
    if (req.user.role !== "adopter") {
      return res.status(403).json({
        message: "Only adopters can view their requests"
      });
    }

    const requests = await AdoptionRequest.find({
      adopterId: req.user.userId
    })
      .populate("petId", "name breed age image adopted")
      .populate("ownerId", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({ requests });
  } catch (error) {
    console.error("MY REQUESTS ERROR:", error);
    res.status(500).json({
      message: "Failed to fetch adoption requests"
    });
  }
});

router.get("/received", protect, async (req, res) => {
  try {
    if (
      req.user.role !== "owner" &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        message:
          "Only owners and admins can view received requests"
      });
    }

    const filter =
      req.user.role === "admin"
        ? {}
        : { ownerId: req.user.userId };

    const requests = await AdoptionRequest.find(filter)
      .populate("petId", "name breed age image adopted")
      .populate("adopterId", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({ requests });
  } catch (error) {
    console.error("RECEIVED REQUESTS ERROR:", error);
    res.status(500).json({
      message: "Failed to fetch received requests"
    });
  }
});

router.put("/:id/status", protect, async (req, res) => {
  try {
    if (
      req.user.role !== "owner" &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        message: "Only owners and admins can update requests"
      });
    }

    const { status } = req.body;

    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({
        message: "Invalid request status"
      });
    }

    const request = await AdoptionRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        message: "Adoption request not found"
      });
    }

    if (
      req.user.role !== "admin" &&
      request.ownerId.toString() !== req.user.userId
    ) {
      return res.status(403).json({
        message: "You can only manage requests for your pets"
      });
    }

    if (status === "approved") {
      const pet = await Pet.findById(request.petId);

      if (!pet) {
        return res.status(404).json({
          message: "Pet not found"
        });
      }

      if (pet.adopted) {
        return res.status(400).json({
          message: "This pet is already adopted"
        });
      }

      request.status = "approved";
      await request.save();

      pet.adopted = true;
      await pet.save();

      // Reject other pending requests for the same pet.
      await AdoptionRequest.updateMany(
        {
          petId: request.petId,
          _id: { $ne: request._id },
          status: "pending"
        },
        { $set: { status: "rejected" } }
      );
    } else {
      request.status = status;
      await request.save();
    }

    res.status(200).json({
      message: "Adoption request status updated",
      request
    });
  } catch (error) {
    console.error("UPDATE REQUEST ERROR:", error);
    res.status(500).json({
      message: "Failed to update request status"
    });
  }
});

module.exports = router;
