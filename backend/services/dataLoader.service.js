const fs   = require("fs");
const path = require("path");

const DATA_ROOT = path.join(__dirname, "../data/sap-order-to-cash-dataset/sap-o2c-data");

/**
 * Reads all .jsonl files inside a named subfolder and returns parsed records.
 * Each line in a JSONL file is an independent JSON object.
 */
function loadFolder(folderName) {
  const dir = path.join(DATA_ROOT, folderName);
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir)
    .filter((f) => f.endsWith(".jsonl"))
    .flatMap((file) => {
      const lines = fs.readFileSync(path.join(dir, file), "utf8").trim().split("\n");
      return lines
        .filter((l) => l.trim())
        .map((l) => {
          try { return JSON.parse(l); } catch { return null; }
        })
        .filter(Boolean);
    });
}

/**
 * Loads all entity datasets needed for graph construction.
 *
 * @returns {{
 *   businessPartners: object[],
 *   salesOrderHeaders: object[],
 *   salesOrderItems: object[],
 *   deliveryHeaders: object[],
 *   deliveryItems: object[],
 *   billingHeaders: object[],
 *   billingItems: object[],
 *   payments: object[],
 *   products: object[]
 * }}
 */
function loadDataset() {
  return {
    businessPartners: loadFolder("business_partners"),
    salesOrderHeaders: loadFolder("sales_order_headers"),
    salesOrderItems:  loadFolder("sales_order_items"),
    deliveryHeaders:  loadFolder("outbound_delivery_headers"),
    deliveryItems:    loadFolder("outbound_delivery_items"),
    billingHeaders:   loadFolder("billing_document_headers"),
    billingItems:     loadFolder("billing_document_items"),
    payments:         loadFolder("payments_accounts_receivable"),
    products:         loadFolder("products"),
  };
}

module.exports = { loadDataset };
