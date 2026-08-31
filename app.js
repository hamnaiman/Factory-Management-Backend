const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

// Routes Imports
const authRoutes = require("./routes/authRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const labourRoutes = require("./routes/labourRoutes");
const productRoutes = require("./routes/productRoutes");
const stockRoutes = require("./routes/stockRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const salaryRoutes = require("./routes/salaryRoutes");
const clientRoutes = require("./routes/clientRoutes");
const labourProfileRoutes = require("./routes/labourProfileRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const saleRoutes = require("./routes/saleRoutes");
const productionRoutes = require("./routes/productionRoutes");
const reportRoutes = require("./routes/reportRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const vendorRoutes = require("./routes/vendorRoutes");
const purchaseRoutes = require("./routes/purchaseRoutes");
const expenseRoutes = require("./routes/expenseRoutes");

// Middleware Import
const errorMiddleware = require("./middleware/errorMiddleware");

const app = express();

// Middlewares
app.use(cookieParser());
app.use(morgan("dev"));

// Filter out undefined/empty values so a missing env var can't
// silently break CORS in production.
const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // allow non-browser tools (curl/postman) with no origin header
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Factory Management API Running 🚀",
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/labours", labourRoutes);
app.use("/api/products", productRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/salary", salaryRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/labour-profile", labourProfileRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/production", productionRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/expenses", expenseRoutes);

// Error Middleware (Must be last)
app.use(errorMiddleware);

module.exports = app;