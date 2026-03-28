# Graph AI System

A full-stack application that visualizes SAP Order-to-Cash (O2C) business data as an interactive knowledge graph and lets you query it using natural language powered by Google Gemini 2.0 Flash.

Live demo: https://graph-ai-system.vercel.app

---

## What It Does

The system reads a real SAP O2C dataset stored as JSONL files, builds an in-memory graph of nodes and edges from it, and exposes two interfaces in the browser:

- A 2D force-directed graph that renders all 713 nodes and 803 edges with zoom, pan, hover tooltips, and a node detail panel
- A chat interface where you type a question in plain English, Gemini parses it into a structured action, the backend queries the graph, and the matching nodes are highlighted in the visualization

The two panels are connected — asking a question in the chat automatically highlights the relevant nodes on the graph.

---

## Architecture

```
Browser
+-----------------------------------------------+
| GraphView (70%)        | ChatPanel (30%)       |
|  react-force-graph-2d  |  natural language     |
|  renders nodes/edges   |  input + answers      |
|  highlights on query   |  highlights graph     |
+-----------------------------------------------+
          |                        |
          | GET /graph             | POST /query
          v                        v
+-----------------------------------------------+
|              Express Backend                  |
|                                               |
|  graph.controller  -->  graph.service         |
|    returns all nodes + edges                  |
|                                               |
|  query.controller  -->  query.service         |
|    --> gemini.service  (parse question)       |
|    --> queryProcessor.service (run query)     |
|    --> graph.service  (read in-memory graph)  |
+-----------------------------------------------+
          |
          | on startup
          v
+-----------------------------------------------+
|  dataLoader.service  reads JSONL files        |
|  graphBuilder.service  builds nodes + edges   |
|  graph stored in memory, never re-read        |
+-----------------------------------------------+
```

---

## How a Query Works

1. User types a question in the chat, e.g. "Show me order 740506"
2. The frontend POSTs `{ question: "Show me order 740506" }` to `/query`
3. `gemini.service` sends the question to Gemini 2.0 Flash with a strict system prompt that forces it to return only a JSON action object
4. Gemini returns `{ "action": "find_order", "entityId": "740506" }`
5. `queryProcessor.service` looks up the node in the in-memory graph by type and ID
6. The backend responds with `{ answer: { ...orderData }, nodeIds: ["740506"] }`
7. The frontend displays the answer in the chat and highlights node `740506` in the graph

If Gemini is rate-limited (429 / quota exceeded), a keyword-based fallback parser runs locally on the backend to still return a result without failing.

---

## Graph Data Model

The graph is built from 9 SAP O2C dataset folders. Each folder contains JSONL files where every line is one record.

**Dataset folders loaded:**

| Folder | Node type created |
|---|---|
| business_partners | customer |
| sales_order_headers | order |
| sales_order_items | order_item |
| outbound_delivery_headers | delivery |
| outbound_delivery_items | (used for edges only) |
| billing_document_headers | invoice |
| billing_document_items | (used for edges only) |
| payments_accounts_receivable | payment |
| products | product |

**Relationship chain:**

```
Customer
   |-- placed ---------> Order
                           |-- contains -------> OrderItem
                           |                         |-- references --> Product
                           |-- fulfilled_by ---> Delivery
                                                     |-- billed_as --> Invoice
                                                                          |-- paid_by --> Payment
```

**How edges are built:**

- Customer to Order: `salesOrderHeader.soldToParty` matches `businessPartner.businessPartner`
- Order to Delivery: `outboundDeliveryItem.referenceSdDocument` matches `salesOrder`
- Delivery to Invoice: `billingDocumentItem.referenceSdDocument` matches `deliveryDocument`
- Invoice to Payment: `billingDocumentHeader.accountingDocument` matches `payment.accountingDocument`
- Order to OrderItem: `salesOrderItem.salesOrder` matches `salesOrder`
- OrderItem to Product: `salesOrderItem.material` matches `product.product`

Node IDs are the raw SAP document numbers — for example orders use the `salesOrder` field value like `740506`, deliveries use `deliveryDocument`, invoices use `billingDocument`, payments use `accountingDocument-accountingDocumentItem`.

**Node colors in the visualization:**

| Type | Color |
|---|---|
| customer | amber |
| order | green |
| order_item | light green |
| delivery | blue |
| invoice | violet |
| payment | pink |
| product | orange |

---

## AI Query Parsing

Gemini 2.0 Flash is used as a strict query parser, not a general assistant. It receives a system prompt that instructs it to return only a raw JSON object with an `action` and optional `entityId`. It is not allowed to return free text.

**Supported actions:**

| Action | Triggered when | entityId |
|---|---|---|
| find_order | user asks about a specific order | order ID |
| find_delivery | user asks about a delivery or shipment | delivery ID |
| find_invoice | user asks about an invoice or billing | invoice ID |
| find_payment | user asks about a payment or transaction | payment ID |
| find_journal_entry | user asks about a journal entry for an invoice | invoice ID |
| list_orders | user wants all orders | none |
| list_deliveries | user wants all deliveries | none |
| list_invoices | user wants all invoices | none |
| list_payments | user wants all payments | none |
| out_of_scope | question is not about the dataset | none |

**Fallback behavior:** If Gemini returns a 429 rate limit error, the backend falls back to a local keyword parser that checks for words like "order", "delivery", "invoice", "payment", "journal" and extracts the ID using a regex. This means the chat still works even when the Gemini quota is exhausted.

---

## Tech Stack

**Frontend**
- React 19
- Vite 8
- Tailwind CSS 3
- react-force-graph-2d

**Backend**
- Node.js
- Express 5
- @google/generative-ai 0.24 (Gemini 2.0 Flash)
- dotenv 17
- cors

---

## Project Structure

```
graph-ai-system/
├── backend/
│   ├── controllers/
│   │   ├── graph.controller.js     # GET /graph and GET /graph/node/:id handlers
│   │   └── query.controller.js     # POST /query handler
│   ├── data/
│   │   └── sap-order-to-cash-dataset/
│   │       └── sap-o2c-data/       # JSONL dataset files (9 entity folders)
│   ├── graph/
│   │   └── relationships.js        # relationship map definitions
│   ├── middleware/
│   │   └── errorHandler.js         # centralized Express error handler
│   ├── routes/
│   │   ├── graph.routes.js         # mounts GET / and GET /node/:id
│   │   └── query.routes.js         # mounts POST /
│   ├── services/
│   │   ├── dataLoader.service.js   # reads JSONL files from disk
│   │   ├── gemini.service.js       # Gemini API call + fallback keyword parser
│   │   ├── graph.service.js        # in-memory graph store, initialize + getGraph
│   │   ├── graphBuilder.service.js # builds nodes and edges from raw dataset
│   │   ├── query.service.js        # orchestrates gemini + queryProcessor
│   │   └── queryProcessor.service.js # executes structured query against graph
│   ├── constants.js                # ENTITY_TYPES, ACTIONS, MESSAGES
│   ├── server.js                   # Express app, CORS, routes, startup
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── GraphView.jsx       # force graph canvas, node painter, detail panel
    │   │   └── ChatPanel.jsx       # chat UI, message bubbles, API calls
    │   ├── App.jsx                 # 70/30 split layout, shared highlightedIds state
    │   └── main.jsx
    ├── .env                        # VITE_API_URL for local dev
    └── .env.production             # VITE_API_URL for production build
```

---

## API Reference

### GET /graph

Returns the full graph.

```json
{
  "nodes": [
    { "id": "740506", "type": "order", "data": { "salesOrder": "740506", "totalNetAmount": "17108.25", ... } }
  ],
  "edges": [
    { "source": "310000108", "target": "740506", "label": "placed" }
  ]
}
```

### GET /graph/node/:id

Returns a single node and its connected edges.

```json
{
  "node": { "id": "740506", "type": "order", "data": { ... } },
  "edges": [
    { "source": "310000108", "target": "740506", "label": "placed" }
  ]
}
```

### POST /query

Accepts a natural language question and returns an answer with matching node IDs.

Request:
```json
{ "question": "Show me order 740506" }
```

Response:
```json
{
  "answer": { "salesOrder": "740506", "totalNetAmount": "17108.25", "transactionCurrency": "INR", ... },
  "nodeIds": ["740506"]
}
```

Error response (non-2xx):
```json
{
  "error": "order with id \"999\" not found",
  "type": "graph_error"
}
```

---

## Getting Started

### Prerequisites

- Node.js 18 or higher
- A Google Gemini API key — get one at https://aistudio.google.com/app/apikey

### Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file:

```
GEMINI_API_KEY=your_gemini_api_key_here
PORT=5000
ALLOWED_ORIGINS=http://localhost:5173
```

Start the server:

```bash
npm start
```

The backend loads the dataset, builds the graph, and starts on `http://localhost:5000`. You will see:

```
[graph] Loading dataset...
[graph] Ready — 713 nodes, 803 edges
Server running on http://localhost:5000
```

### Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file:

```
VITE_API_URL=http://localhost:5000
```

Start the dev server:

```bash
npm run dev
```

The frontend runs on `http://localhost:5173`.

---

## Deployment

The application is deployed as two separate services.

**Frontend** is deployed on Vercel. Set the environment variable:
```
VITE_API_URL=https://your-backend.onrender.com
```

**Backend** is deployed on Render. Set the environment variables:
```
GEMINI_API_KEY=your_gemini_api_key_here
PORT=5000
ALLOWED_ORIGINS=https://your-frontend.vercel.app
```

The CORS configuration in `server.js` also automatically allows all `*.vercel.app` subdomains, which covers Vercel preview deployment URLs.

---

## Environment Variables

### Backend

| Variable | Required | Description |
|---|---|---|
| GEMINI_API_KEY | Yes | Google Gemini API key |
| PORT | No | Server port, defaults to 5000 |
| ALLOWED_ORIGINS | No | Comma-separated list of allowed CORS origins |

### Frontend

| Variable | Required | Description |
|---|---|---|
| VITE_API_URL | No | Backend base URL, defaults to http://localhost:5000 |

---


