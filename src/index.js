const express = require("express");
const { ServerConfig, Logger } = require("./config");
const apiRoutes = require("./routes");
const rateLimit = require("express-rate-limit");
const { errorHandler } = require("./middlewares");
const morgan = require("morgan");
const proxy = require("express-http-proxy");
const cors = require("cors");

const app = express();

// Rate limiter
const limiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2 minutes
  max: 30, // Limit each IP to 30 requests per window
});

//* Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(limiter);
app.use(cors());

// Log configured service URLs
Logger.info(`User Service: ${ServerConfig.USER_SERVICE}`);
Logger.info(`Hotel Service: ${ServerConfig.HOTEL_SERVICE}`);
Logger.info(`Booking Service: ${ServerConfig.BOOKING_SERVICE}`);

// --------- Proxy Configurations ---------

// Hotel Service Proxy
app.use(
  "/api/v1",
  proxy(ServerConfig.HOTEL_SERVICE, {
    filter: (req) => {
      return req.path.startsWith("/hotels") || req.path.startsWith("/rooms");
    },
    proxyReqPathResolver: (req) => req.originalUrl,
    proxyErrorHandler: (err, res, next) => {
      Logger.error(`Hotel service proxy error: ${err.message}`);
      res.status(500).json({ error: "Hotel service unavailable" });
    },
  })
);

// User Service Proxy
app.use(
  "/api/v1",
  proxy(ServerConfig.USER_SERVICE, {
    filter: (req) => {
      return req.path.startsWith("/users") || req.path.startsWith("/auth");
    },
    proxyReqPathResolver: (req) => req.originalUrl,
    proxyErrorHandler: (err, res, next) => {
      Logger.error(`User service proxy error: ${err.message}`);
      res.status(500).json({ error: "User service unavailable" });
    },
  })
);

// Booking Service Proxy
app.use(
  "/api/v1",
  proxy(ServerConfig.BOOKING_SERVICE, {
    filter: (req) => req.path.startsWith("/bookings"),
    proxyReqPathResolver: (req) => req.originalUrl,
    proxyErrorHandler: (err, res, next) => {
      Logger.error(`Booking service proxy error: ${err.message}`);
      res.status(500).json({ error: "Booking service unavailable" });
    },
  })
);

// --------- API Gateway routes ---------
app.use("/api", apiRoutes);

// --------- Global Error Handler ---------
app.use(errorHandler);

// --------- Start Server ---------
app.listen(ServerConfig.PORT, () => {
  Logger.info(`🚀 API Gateway started at PORT ${ServerConfig.PORT}`);
  Logger.info("Press Ctrl+C to stop the server.");
});
