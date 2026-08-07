const mongoose = require("mongoose");

/**
 * Executes an asynchronous callback inside an isolated Mongoose transaction session.
 * Handles automatic commit on success and rollback on error.
 */
const executeInTransaction = async (action) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const result = await action(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

module.exports = executeInTransaction;