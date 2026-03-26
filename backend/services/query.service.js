const { convertQuestionToQuery } = require("./gemini.service");
const { executeQuery }           = require("./queryProcessor.service");

async function processQuery(question) {
  const structuredQuery = await convertQuestionToQuery(question);
  return executeQuery(structuredQuery);
}

module.exports = { processQuery };
