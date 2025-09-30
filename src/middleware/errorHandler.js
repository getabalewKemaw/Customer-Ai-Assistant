// src/middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  console.error("🔥 Error:", err);
  if (!res.headersSent) { // Add this check to prevent ERR_HTTP_HEADERS_SENT
    res.status(500).json({
      success: false,
      error: err.message || "Internal Server Error",
    });
  } else {
    next(err); // Pass to default Express handler if headers already sent
  }
};
export default errorHandler;