const { getDashboardData } = require("../services/dashboardService");

const dashboard = async (req, res, next) => {
  try {
    const {
      fromDate,
      toDate,
    } = req.query;

    const data = await getDashboardData({
      fromDate,
      toDate,
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Dashboard loaded",
      data,
    });
  } catch (err) {
    console.error("Dashboard Error:", err);
    next(err);
  }
};

module.exports = {
  dashboard,
};