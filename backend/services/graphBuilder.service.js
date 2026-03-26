/**
 * Converts the SAP O2C dataset into a graph of { nodes, edges }.
 *
 * Node shape:  { id, type, data }
 * Edge shape:  { source, target, label }
 *
 * Relationship chain:
 *   Customer ──placed──► Order ──fulfilled_by──► Delivery ──billed_as──► Invoice ──paid_by──► Payment
 *   Order    ──contains──► OrderItem ──references──► Product
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function node(id, type, data) {
  return { id: String(id), type, data };
}

function edge(sourceId, targetId, label) {
  return { source: String(sourceId), target: String(targetId), label };
}

/** Builds a Map from an array keyed by a field value for O(1) lookups. */
function indexBy(arr, field) {
  const map = new Map();
  for (const item of arr) {
    const key = item[field];
    if (key != null) map.set(String(key), item);
  }
  return map;
}

/** Builds a Map<key, item[]> for one-to-many relationships. */
function groupBy(arr, field) {
  const map = new Map();
  for (const item of arr) {
    const key = String(item[field]);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

/**
 * @param {ReturnType<import('./dataLoader.service').loadDataset>} dataset
 * @returns {{ nodes: object[], edges: object[] }}
 */
function buildGraphFromDataset(dataset) {
  const {
    businessPartners,
    salesOrderHeaders,
    salesOrderItems,
    deliveryHeaders,
    deliveryItems,
    billingHeaders,
    billingItems,
    payments,
    products,
  } = dataset;

  const nodes = [];
  const edges = [];

  // ── Index lookups ──────────────────────────────────────────────────────────
  const deliveryHeaderById = indexBy(deliveryHeaders, "deliveryDocument");
  const billingHeaderById  = indexBy(billingHeaders,  "billingDocument");
  const productById        = indexBy(products,        "product");

  // delivery items grouped by salesOrder (referenceSdDocument = salesOrder)
  const deliveryItemsByOrder   = groupBy(deliveryItems, "referenceSdDocument");
  // billing items grouped by delivery (referenceSdDocument = deliveryDocument)
  const billingItemsByDelivery = groupBy(billingItems,  "referenceSdDocument");
  // payments grouped by accountingDocument (matches billing header's accountingDocument)
  const paymentsByAccDoc       = groupBy(payments,      "accountingDocument");

  // Deduplicate nodes by id
  const nodeSet = new Set();
  function addNode(n) {
    if (!nodeSet.has(n.id)) { nodeSet.add(n.id); nodes.push(n); }
  }

  // ── 1. Customer nodes ──────────────────────────────────────────────────────
  for (const bp of businessPartners) {
    addNode(node(bp.businessPartner, "customer", bp));
  }

  // ── 2. Order nodes + Customer → Order edges ───────────────────────────────
  for (const order of salesOrderHeaders) {
    addNode(node(order.salesOrder, "order", order));

    if (order.soldToParty) {
      edges.push(edge(order.soldToParty, order.salesOrder, "placed"));
    }
  }

  // ── 3. OrderItem nodes + Order → OrderItem + OrderItem → Product edges ────
  for (const item of salesOrderItems) {
    const itemId = `${item.salesOrder}-${item.salesOrderItem}`;
    addNode(node(itemId, "order_item", item));
    edges.push(edge(item.salesOrder, itemId, "contains"));

    if (item.material && productById.has(item.material)) {
      const prod = productById.get(item.material);
      addNode(node(prod.product, "product", prod));
      edges.push(edge(itemId, prod.product, "references"));
    }
  }

  // ── 4. Delivery nodes + Order → Delivery edges ────────────────────────────
  // The link is: outbound_delivery_items.referenceSdDocument = salesOrder
  //              outbound_delivery_items.deliveryDocument     = delivery id
  const processedDeliveries = new Set();
  for (const [salesOrder, items] of deliveryItemsByOrder) {
    const deliveryIds = [...new Set(items.map((i) => i.deliveryDocument))];
    for (const delivId of deliveryIds) {
      const header = deliveryHeaderById.get(delivId);
      if (!header) continue;

      if (!processedDeliveries.has(delivId)) {
        addNode(node(delivId, "delivery", header));
        processedDeliveries.add(delivId);
      }
      edges.push(edge(salesOrder, delivId, "fulfilled_by"));
    }
  }

  // ── 5. Invoice nodes + Delivery → Invoice edges ───────────────────────────
  // billing_document_items.referenceSdDocument = deliveryDocument
  const processedBillings = new Set();
  for (const [delivId, items] of billingItemsByDelivery) {
    const billingIds = [...new Set(items.map((i) => i.billingDocument))];
    for (const billId of billingIds) {
      const header = billingHeaderById.get(billId);
      if (!header) continue;

      if (!processedBillings.has(billId)) {
        addNode(node(billId, "invoice", header));
        processedBillings.add(billId);
      }
      edges.push(edge(delivId, billId, "billed_as"));
    }
  }

  // ── 6. Payment nodes + Invoice → Payment edges ────────────────────────────
  // billing_document_headers.accountingDocument links to payments_accounts_receivable.accountingDocument
  for (const billing of billingHeaders) {
    const accDoc = billing.accountingDocument;
    if (!accDoc) continue;

    const relatedPayments = paymentsByAccDoc.get(accDoc) ?? [];
    for (const pmt of relatedPayments) {
      const pmtId = `${pmt.accountingDocument}-${pmt.accountingDocumentItem}`;
      addNode(node(pmtId, "payment", pmt));
      edges.push(edge(billing.billingDocument, pmtId, "paid_by"));
    }
  }

  return { nodes, edges };
}

module.exports = { buildGraphFromDataset };
