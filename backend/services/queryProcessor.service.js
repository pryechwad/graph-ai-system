const { getGraph }              = require("./graph.service");
const { ACTIONS, ENTITY_TYPES, MESSAGES } = require("../constants");

// Maps each find_* action to its entity type
const FIND_ACTION_MAP = {
  [ACTIONS.FIND_ORDER]:         ENTITY_TYPES.ORDER,
  [ACTIONS.FIND_DELIVERY]:      ENTITY_TYPES.DELIVERY,
  [ACTIONS.FIND_INVOICE]:       ENTITY_TYPES.INVOICE,
  [ACTIONS.FIND_PAYMENT]:       ENTITY_TYPES.PAYMENT,
  [ACTIONS.FIND_JOURNAL_ENTRY]: ENTITY_TYPES.INVOICE,
};

// Maps each list_* action to its entity type
const LIST_ACTION_MAP = {
  [ACTIONS.LIST_ORDERS]:     ENTITY_TYPES.ORDER,
  [ACTIONS.LIST_DELIVERIES]: ENTITY_TYPES.DELIVERY,
  [ACTIONS.LIST_INVOICES]:   ENTITY_TYPES.INVOICE,
  [ACTIONS.LIST_PAYMENTS]:   ENTITY_TYPES.PAYMENT,
};

function findNode(graph, type, id) {
  return graph.nodes.find((n) => n.type === type && String(n.id) === String(id)) ?? null;
}

function handleFind(action, entityId, graph) {
  const type = FIND_ACTION_MAP[action];
  const node = findNode(graph, type, entityId);
  if (!node) return { error: `${type} with id "${entityId}" not found` };

  if (action === ACTIONS.FIND_JOURNAL_ENTRY) {
    const accDoc = node.data?.accountingDocument;
    if (!accDoc) return { error: `No journal entry linked to invoice "${entityId}"` };
    return { answer: `Journal Entry (Accounting Document) for invoice ${entityId} is: ${accDoc}`, nodeIds: [node.id] };
  }

  return { answer: node.data, nodeIds: [node.id] };
}

function executeQuery({ action, entityId }) {
  if (action === ACTIONS.OUT_OF_SCOPE) return { answer: MESSAGES.OUT_OF_SCOPE };

  const graph = getGraph();

  if (action in FIND_ACTION_MAP) return handleFind(action, entityId, graph);

  if (action in LIST_ACTION_MAP) {
    const nodes = graph.nodes.filter((n) => n.type === LIST_ACTION_MAP[action]);
    return {
      answer: nodes.map((n) => n.data),
      nodeIds: nodes.map((n) => n.id),
    };
  }

  return { error: `Unsupported action: "${action}"` };
}

module.exports = { executeQuery };
