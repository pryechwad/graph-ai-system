const ENTITY_TYPES = Object.freeze({
  ORDER:    "order",
  DELIVERY: "delivery",
  INVOICE:  "invoice",
  PAYMENT:  "payment",
});

const ACTIONS = Object.freeze({
  FIND_ORDER:         "find_order",
  FIND_DELIVERY:      "find_delivery",
  FIND_INVOICE:       "find_invoice",
  FIND_PAYMENT:       "find_payment",
  FIND_JOURNAL_ENTRY: "find_journal_entry",
  LIST_ORDERS:        "list_orders",
  LIST_DELIVERIES:    "list_deliveries",
  LIST_INVOICES:      "list_invoices",
  LIST_PAYMENTS:      "list_payments",
  OUT_OF_SCOPE:       "out_of_scope",
});

const MESSAGES = Object.freeze({
  OUT_OF_SCOPE: "This system is designed to answer dataset-related questions only.",
});

module.exports = { ENTITY_TYPES, ACTIONS, MESSAGES };
