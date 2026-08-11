const mongoose = require("mongoose");

const attendanceSchema =
  new mongoose.Schema(
    {
      worker: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Labour",
        required: true,
      },

      date: {
        type: Date,
        required: true,
      },

      status: {
        type: String,
        enum: [
          "present",
          "absent",
          "leave",
        ],
        required: true,
      },

      markedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    },
    {
      timestamps: true,
    }
  );

// =====================================================
// ONE WORKER = ONE ATTENDANCE PER DATE
// =====================================================

attendanceSchema.index(
  {
    worker: 1,
    date: 1,
  },
  {
    unique: true,
  }
);

module.exports =
  mongoose.model(
    "Attendance",
    attendanceSchema
  );