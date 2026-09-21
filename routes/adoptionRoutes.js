const express = require("express");

const AdoptionRequest =
  require("../models/AdoptionRequest");

const Pet =
  require("../models/Pet");

const User =
  require("../models/User");

const protect =
  require("../middleware/authMiddleware");

const router = express.Router();


// ==================================================
// CREATE ADOPTION REQUEST
// ==================================================

router.post("/", protect, async (req, res) => {
  try {

    if (req.user.role !== "adopter") {
      return res.status(403).json({
        message:
          "Only adopters can request adoption"
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
        message:
          "Please fill all required fields"
      });
    }

    const pet =
      await Pet.findById(petId);

    if (!pet) {
      return res.status(404).json({
        message: "Pet not found"
      });
    }

    if (pet.adopted) {
      return res.status(400).json({
        message:
          "This pet has already been adopted"
      });
    }

    const owner =
      await User.findById(
        pet.ownerId
      );

    if (!owner) {
      return res.status(404).json({
        message:
          "Pet owner not found"
      });
    }

    // Prevent duplicate pending request
    const existingRequest =
      await AdoptionRequest.findOne({
        petId: pet._id,
        adopterId: req.user.userId,
        status: "pending"
      });

    if (existingRequest) {
      return res.status(400).json({
        message:
          "You already have a pending request for this pet"
      });
    }

    const adoptionRequest =
      await AdoptionRequest.create({
        petId: pet._id,
        adopterId: req.user.userId,
        ownerId: pet.ownerId,

        name,
        email: email.toLowerCase(),
        phone,
        address,
        message,

        status: "pending"
      });

    res.status(201).json({
      message:
        "Adoption request submitted successfully",

      request:
        adoptionRequest
    });

  } catch (error) {

    console.error(
      "CREATE ADOPTION ERROR:",
      error
    );

    res.status(500).json({
      message:
        "Failed to submit adoption request"
    });
  }
});


// ==================================================
// ADOPTER - MY REQUESTS
// ==================================================

router.get(
  "/my-requests",
  protect,
  async (req, res) => {

    try {

      const requests =
        await AdoptionRequest.find({
          adopterId: req.user.userId
        })
          .populate(
            "petId",
            "name breed age image adopted"
          )
          .populate(
            "ownerId",
            "name email phone"
          )
          .sort({
            createdAt: -1
          });

      // IMPORTANT:
      // Owner contact details only
      // when request is approved.

      const safeRequests =
        requests.map((request) => {

          const requestObject =
            request.toObject();

          if (
            request.status !== "approved"
          ) {
            requestObject.ownerId = {
              _id:
                request.ownerId?._id,
              name:
                request.ownerId?.name
            };
          }

          return requestObject;
        });

      res.status(200).json({
        requests:
          safeRequests
      });

    } catch (error) {

      console.error(
        "MY REQUESTS ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Failed to fetch adoption requests"
      });
    }
  }
);


// ==================================================
// OWNER - RECEIVED REQUESTS
// ==================================================

router.get(
  "/received",
  protect,
  async (req, res) => {

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
          : {
              ownerId:
                req.user.userId
            };

      const requests =
        await AdoptionRequest.find(
          filter
        )
          .populate(
            "petId",
            "name breed age image adopted"
          )
          .populate(
            "adopterId",
            "name email phone"
          )
          .sort({
            createdAt: -1
          });

      res.status(200).json({
        requests
      });

    } catch (error) {

      console.error(
        "RECEIVED REQUESTS ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Failed to fetch received requests"
      });
    }
  }
);


// ==================================================
// OWNER - APPROVE / REJECT
// ==================================================

router.put(
  "/:id/status",
  protect,
  async (req, res) => {

    try {

      if (
        req.user.role !== "owner" &&
        req.user.role !== "admin"
      ) {
        return res.status(403).json({
          message:
            "Only owners and admins can update requests"
        });
      }

      const {
        status
      } = req.body;

      if (
        ![
          "pending",
          "approved",
          "rejected"
        ].includes(status)
      ) {
        return res.status(400).json({
          message:
            "Invalid request status"
        });
      }

      const request =
        await AdoptionRequest.findById(
          req.params.id
        );

      if (!request) {
        return res.status(404).json({
          message:
            "Adoption request not found"
        });
      }

      if (
        req.user.role !== "admin" &&
        request.ownerId.toString() !==
          req.user.userId
      ) {
        return res.status(403).json({
          message:
            "You can only manage requests for your pets"
        });
      }


      // ==========================================
      // APPROVE
      // ==========================================

      if (status === "approved") {

        const pet =
          await Pet.findById(
            request.petId
          );

        if (!pet) {
          return res.status(404).json({
            message:
              "Pet not found"
          });
        }

        if (pet.adopted) {
          return res.status(400).json({
            message:
              "This pet has already been adopted"
          });
        }

        // Approve selected request
        request.status =
          "approved";

        await request.save();

        // Mark pet as adopted
        pet.adopted = true;

        await pet.save();

        // Reject other pending
        // requests for same pet
        await AdoptionRequest.updateMany(
          {
            petId: request.petId,
            _id: {
              $ne: request._id
            },
            status: "pending"
          },
          {
            $set: {
              status: "rejected"
            }
          }
        );

      } else {

        request.status =
          status;

        await request.save();
      }


      const updatedRequest =
        await AdoptionRequest.findById(
          request._id
        )
          .populate(
            "petId",
            "name breed age image adopted"
          )
          .populate(
            "adopterId",
            "name email phone"
          )
          .populate(
            "ownerId",
            "name email phone"
          );


      res.status(200).json({
        message:
          `Adoption request ${status}`,
        request:
          updatedRequest
      });

    } catch (error) {

      console.error(
        "UPDATE REQUEST ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Failed to update request status"
      });
    }
  }
);


module.exports = router;