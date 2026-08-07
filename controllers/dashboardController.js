const { getDashboardData } = require("../services/dashboardService");

const dashboard = async (req, res, next) => {
  try {
    const data = await getDashboardData();

    // ✅ Clean Express Response
    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Dashboard loaded",
      data: data,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  dashboard,
};