// server/controllers/notificationController.js

const { getNotifications } = require("../services/notificationService");

const notifications = async (req, res, next) => {
  try {
    const data = await getNotifications();
    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Notifications loaded",
      data,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { notifications };