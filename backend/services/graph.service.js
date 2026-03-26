const { loadDataset }          = require("./dataLoader.service");
const { buildGraphFromDataset } = require("./graphBuilder.service");

let graph = null;

/**
 * Loads the dataset and builds the graph.
 * Must be called once before the server starts accepting requests.
 */
function initialize() {
  console.log("[graph] Loading dataset...");
  const dataset = loadDataset();
  graph = buildGraphFromDataset(dataset);
  console.log(`[graph] Ready — ${graph.nodes.length} nodes, ${graph.edges.length} edges`);
}

function getGraph() {
  return graph;
}

function getNodeById(id) {
  const node = graph.nodes.find((n) => n.id === id);
  if (!node) return null;

  const edges = graph.edges.filter((e) => e.source === id || e.target === id);
  return { node, edges };
}

module.exports = { initialize, getGraph, getNodeById };
