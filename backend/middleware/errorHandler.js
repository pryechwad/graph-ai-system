/**
 * Centralized error handler.
 * Attach to Express AFTER all routes: app.use(errorHandler)
 *
 * Recognizes:
 *   err.statusCode  — set explicitly by services to control HTTP status
 *   err.type        — "gemini_error" | "graph_error" | "validation_error"
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const statusCode = err.statusCode ?? 500;

  const body = {
    error: err.message ?? "Internal server error",
    ...(err.type && { type: err.type }),
  };

  // Log unexpected server errors only (not 4xx)
  if (statusCode >= 500) console.error("[ERROR]", err);

  res.status(statusCode).json(body);
}

module.exports = errorHandler;
