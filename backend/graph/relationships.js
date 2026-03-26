const RELATIONSHIP_MAP = [
  { from: "order",    to: "delivery", refField: "deliveryId", relationship: "fulfilled_by" },
  { from: "delivery", to: "invoice",  refField: "invoiceId",  relationship: "billed_as"    },
  { from: "invoice",  to: "payment",  refField: "paymentId",  relationship: "paid_by"      },
];

module.exports = RELATIONSHIP_MAP;
