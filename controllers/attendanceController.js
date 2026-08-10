const {
  markAttendance,
  getTodayAttendance,
  getAttendanceHistory,
  getAttendanceByDate,
} = require("../services/attendanceService");

const ApiResponse = require("../utils/apiResponse");

// =====================================================
// SAVE ATTENDANCE
// =====================================================

const createAttendance = async (req, res, next) => {
  try {
    const attendance = await markAttendance(
      req.body,
      req.user._id
    );

    res.status(201).json(
      new ApiResponse(
        201,
        true,
        "Attendance saved successfully",
        attendance
      )
    );
  } catch (error) {
    next(error);
  }
};

// =====================================================
// TODAY
// =====================================================

const getToday = async (req, res, next) => {
  try {
    const attendance =
      await getTodayAttendance();

    res.status(200).json(
      new ApiResponse(
        200,
        true,
        "Today's attendance fetched successfully",
        attendance
      )
    );
  } catch (error) {
    next(error);
  }
};

// =====================================================
// HISTORY
// =====================================================

const attendanceHistory = async (
  req,
  res,
  next
) => {
  try {
    const history =
      await getAttendanceHistory();

    res.status(200).json(
      new ApiResponse(
        200,
        true,
        "Attendance history fetched successfully",
        history
      )
    );
  } catch (error) {
    next(error);
  }
};

// =====================================================
// BY DATE
// =====================================================

const attendanceByDate = async (
  req,
  res,
  next
) => {
  try {
    const attendance =
      await getAttendanceByDate(
        req.params.date
      );

    res.status(200).json(
      new ApiResponse(
        200,
        true,
        "Attendance fetched successfully",
        attendance
      )
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAttendance,
  getToday,
  attendanceHistory,
  attendanceByDate,
};