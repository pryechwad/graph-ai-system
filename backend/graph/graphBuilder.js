const RELATIONSHIP_MAP = require("./relationships");

function buildGraph(dataset) {
  const entityGroups = Object.entries(dataset).map(([key, items]) => ({
    type:  key.replace(/s$/, ""), // "orders" → "order"
    items: items ?? [],
  }));

  // Build node map: "<type>:<id>" → node
  const nodeMap = new Map();
  for (const { type, items } of entityGroups) {
    for (const item of items) {
      if (item.id == null) continue;
      const key = `${type}:${item.id}`;
      if (!nodeMap.has(key)) {
        nodeMap.set(key, { id: item.id, type, metadata: { ...item } });
      }
    }
  }

  // Index nodes by type for O(1) edge resolution
  const byType = {};
  for (const node of nodeMap.values()) {
    (byType[node.type] ??= new Map()).set(node.id, node);
  }

  // Build edges from relationship map
  const edges = [];
  for (const { from, to, refField, relationship } of RELATIONSHIP_MAP) {
    const sourceNodes = byType[from];
    if (!sourceNodes) continue;

    for (const sourceNode of sourceNodes.values()) {
      const targetId = sourceNode.metadata[refField];
      if (targetId == null) continue;

      const targetNode = byType[to]?.get(targetId);
      if (!targetNode) continue;

      edges.push({ source: `${from}:${sourceNode.id}`, target: `${to}:${targetNode.id}`, relationship });
    }
  }

  return { nodes: [...nodeMap.values()], edges };
}

module.exports = { buildGraph };
