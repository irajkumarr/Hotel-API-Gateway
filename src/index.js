const express = require("express");
const { ServerConfig, Logger } = require("./config");
const apiRoutes = require("./routes");
const rateLimit = require("express-rate-limit");
const { errorHandler, AuthMiddlewares } = require("./middlewares");
const morgan = require("morgan");
const proxy = require("express-http-proxy");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const { Enums } = require("./utils/commons");
const { USER } = Enums.ROLE_TYPE;

const app = express();

// ----------------- Middlewares -----------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(morgan("dev"));

// Generate a correlation ID for each request
app.use((req, res, next) => {
  req.correlationId = uuidv4();
  Logger.info(
    `[${req.correlationId}] Incoming request: ${req.method} ${req.originalUrl}`
  );
  next();
});

// Rate limiter (basic)
const limiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2 minutes
  max: 30, // limit each IP
});
app.use(limiter);

// ----------------- Log configured services -----------------
Logger.info(`User Service: ${ServerConfig.USER_SERVICE}`);
Logger.info(`Hotel Service: ${ServerConfig.HOTEL_SERVICE}`);
Logger.info(`Booking Service: ${ServerConfig.BOOKING_SERVICE}`);

// ----------------- JWT Middleware -----------------
// Apply JWT validation to protected routes
app.use(
  "/api/v1/users",
  AuthMiddlewares.checkAuth,
  AuthMiddlewares.authorizeRoles([USER])
);
app.use(
  "/api/v1/bookings",
  AuthMiddlewares.checkAuth,
  AuthMiddlewares.authorizeRoles([USER])
);

// ----------------- Proxy Configurations -----------------

// Hotel Service Proxy
app.use(
  "/api/v1",
  proxy(ServerConfig.HOTEL_SERVICE, {
    filter: (req) =>
      req.path.startsWith("/hotels") || req.path.startsWith("/rooms"),
    proxyReqPathResolver: (req) => req.originalUrl,
    proxyErrorHandler: (err, res, next) => {
      Logger.error(
        `[${req.correlationId}] Hotel service proxy error: ${err.message}`
      );
      res.status(500).json({ error: "Hotel service unavailable" });
    },
  })
);

// User Service Proxy
app.use(
  "/api/v1",
  proxy(ServerConfig.USER_SERVICE, {
    filter: (req) =>
      req.path.startsWith("/users") || req.path.startsWith("/auth"),
    proxyReqPathResolver: (req) => req.originalUrl,
    proxyErrorHandler: (err, res, next) => {
      Logger.error(
        `[${req.correlationId}] User service proxy error: ${err.message}`
      );
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
      Logger.error(
        `[${req.correlationId}] Booking service proxy error: ${err.message}`
      );
      res.status(500).json({ error: "Booking service unavailable" });
    },
  })
);

// ----------------- Health Check -----------------
app.get("/health", (req, res) => {
  res.json({ status: "ok", correlationId: req.correlationId });
});

// ----------------- API Routes -----------------
app.use("/api", apiRoutes);

// ----------------- Global Error Handler -----------------
app.use(errorHandler);

// ----------------- Start Server -----------------
app.listen(ServerConfig.PORT, () => {
  Logger.info(`🚀 API Gateway started at PORT ${ServerConfig.PORT}`);
  Logger.info("Press Ctrl+C to stop the server.");
});

// ----------------- Graceful Shutdown -----------------
process.on("SIGINT", () => {
  Logger.info("Shutting down API Gateway...");
  process.exit(0);
});
