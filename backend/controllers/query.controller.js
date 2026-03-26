const queryService = require("../services/query.service");

async function handleQuery(req, res, next) {
  try {
    const { question } = req.body;

    if (!question || typeof question !== "string" || !question.trim()) {
      return res.status(400).json({ error: "Field 'question' must be a non-empty string" });
    }

    const result = await queryService.processQuery(question.trim());
    res.json(result);
  } catch (err) {
    next(err); // delegate to centralized error handler in index.js
  }
}

module.exports = { handleQuery };
