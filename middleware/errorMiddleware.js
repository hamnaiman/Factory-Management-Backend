const errorMiddleware = (err, req, res, next) => {
  console.error("========= ERROR =========");
  console.error(err);
  console.error(err.stack);
  console.error("=========================");

  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
};

module.exports = errorMiddleware;