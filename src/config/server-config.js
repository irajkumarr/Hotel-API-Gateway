require("dotenv").config();
const fs = require("fs");
const path = require("path");

module.exports = {
  PORT: process.env.PORT,
  PUBLIC_KEY: fs.readFileSync(path.join(__dirname, "../../public.key"), "utf8"),
  HOTEL_SERVICE: process.env.HOTEL_SERVICE,
  BOOKING_SERVICE: process.env.BOOKING_SERVICE,
  USER_SERVICE: process.env.USER_SERVICE,
  NOTIFICATION_SERVICE: process.env.NOTIFICATION_SERVICE,
};
