const graphService = require("../services/graph.service");

function getGraph(req, res, next) {
  try {
    res.json(graphService.getGraph());
  } catch (err) {
    next(err);
  }
}

function getNode(req, res, next) {
  try {
    const result = graphService.getNodeById(req.params.id);
    if (!result) return res.status(404).json({ error: `Node "${req.params.id}" not found` });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { getGraph, getNode };
