const express = require("express");
const cors = require("cors");
const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, ".env")
});

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const petRoutes = require("./routes/petRoutes");
const adoptionRoutes = require("./routes/adoptionRoutes");

const app = express();

/*
  =========================
  CORS CONFIGURATION
  =========================
*/

const allowedOrigins = [
  "https://petadoptationsystem.vercel.app",
  "http://localhost:5173",
  "http://localhost:5174"
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests without an origin
    // Example: Postman / server-to-server requests
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(
      new Error("Not allowed by CORS")
    );
  },

  methods: [
    "GET",
    "POST",
    "PUT",
    "DELETE",
    "OPTIONS"
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization"
  ],

  credentials: false
};

app.use(cors(corsOptions));

/*
  =========================
  BODY PARSER
  =========================
*/

app.use(
  express.json({
    limit: "10mb"
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb"
  })
);

/*
  =========================
  DATABASE
  =========================
*/

connectDB();

/*
  =========================
  API ROUTES
  =========================
*/

app.use("/api/auth", authRoutes);

app.use("/api/pets", petRoutes);

app.use("/api/adoptions", adoptionRoutes);

/*
  =========================
  ROOT ROUTE
  =========================
*/

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Smart Pet Adoption API is running 🐾"
  });
});

/*
  =========================
  HEALTH CHECK
  =========================
*/

app.get("/api/health", (req, res) => {
  res.status(200).json({
    message: "Backend is healthy ✅"
  });
});

/*
  =========================
  ERROR HANDLER
  =========================
*/

app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err.message);

  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      message: "CORS error: Origin not allowed"
    });
  }

  res.status(500).json({
    message: "Internal server error"
  });
});

/*
  =========================
  LOCAL SERVER
  =========================
*/

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(
      `Server running on http://localhost:${PORT}`
    );
  });
}

module.exports = app;