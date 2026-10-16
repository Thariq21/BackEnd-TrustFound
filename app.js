import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// Import koneksi Database (untuk memastikan koneksi aktif saat startup)
import "./config/db_mysql.js";
import "./config/db_mongo.js";

// Import Routes
import authRoutes from "./routes/authRoutes.js";
import itemRoutes from "./routes/itemRoutes.js";
import claimRoutes from "./routes/claimRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import claimV2Routes from "./routes/claimV2Routes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import slotRoutes from "./routes/slotRoutes.js";

// --- IMPORT CRON JOB ---
import initCronJobs from "./services/cronService.js";

// Import OpenAPI Specification (JSON)
import openapiSpec from "./docs/openapi.json" with { type: "json" };
import { apiReference } from "@scalar/express-api-reference";

// Load env vars
dotenv.config({ path: "./config/config.env" });

const app = express();

// --- Konfigurasi __dirname untuk ES Modules ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Middleware ---

// Enable CORS (agar bisa diakses frontend React)
app.use(cors());

// Body Parser (untuk membaca JSON dan form data)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set Static Folder (untuk mengakses file gambar yang diupload secara publik)
// Misal: http://localhost:5000/uploads/foto-dompet.jpg
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// --- Routes Mounting ---
app.use("/api/auth", authRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/claims", claimRoutes);
app.use("/api/slots", slotRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/categories", categoryRoutes);

// --- V2 Routes ---
app.use("/api/v2/claims", claimV2Routes);
app.use("/api/v2/notifications", notificationRoutes);

// --- Default Route (Health Check) ---
app.get("/", (req, res) => {
  res.json({ message: "Welcome to UBLost&Found API is running..." });
});

// --- OpenAPI Specification & Scalar API Reference ---
app.get("/openapi.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.json(openapiSpec);
});

app.use(
  "/reference",
  apiReference({
    content: openapiSpec,
    theme: "purple",
    layout: "modern",
    darkMode: true,
    showSidebar: true,
    defaultHttpClient: {
      targetKey: "javascript",
      clientKey: "axios",
    },
    pageTitle: "UBLost&Found API Documentation | Universitas Bakrie",
    metaData: {
      title: "UBLost&Found API Documentation | Universitas Bakrie",
      description:
        "Official interactive REST API reference for the Universitas Bakrie Lost and Found System (UBLost&Found)",
    },
  }),
);

// --- Error Handling Middleware (Optional but recommended) ---
// Handle 404 Not Found
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
});

// Global Error Handler
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  res.json({
    status: "error",
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
});

// --- Start Server ---
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`,
  );

  initCronJobs();
});
