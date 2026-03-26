const sampleDataset = {
  orders: [
    { id: "ORD-1001", customer: "Alice", status: "shipped",   deliveryId: "DEL-2001" },
    { id: "ORD-1002", customer: "Bob",   status: "pending",   deliveryId: "DEL-2002" },
  ],
  deliveries: [
    { id: "DEL-2001", address: "123 Main St",  status: "delivered", invoiceId: "INV-91150187" },
    { id: "DEL-2002", address: "456 Oak Ave",  status: "in_transit", invoiceId: "INV-91150188" },
  ],
  invoices: [
    { id: "INV-91150187", amount: 250,  currency: "USD", paymentId: "PAY-4001", journalEntryId: "9400635958" },
    { id: "INV-91150188", amount: 1800, currency: "USD", paymentId: "PAY-4002", journalEntryId: "9400635959" },
  ],
  payments: [
    { id: "PAY-4001", method: "credit_card", status: "completed", amount: 250  },
    { id: "PAY-4002", method: "bank_transfer", status: "pending", amount: 1800 },
  ],
};

module.exports = sampleDataset;
