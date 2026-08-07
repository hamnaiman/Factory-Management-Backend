const ApiError = require("../utils/apiError");

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(403, "You are not authorized to access this resource.")
      );
    }

    next();
  };
};

module.exports = authorize;