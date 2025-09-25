require("dotenv").config();

module.exports = {
  PORT: process.env.PORT,
  HOTEL_SERVICE: process.env.HOTEL_SERVICE,
  BOOKING_SERVICE: process.env.BOOKING_SERVICE,
  USER_SERVICE: process.env.USER_SERVICE,
};
