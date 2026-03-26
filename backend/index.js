const express      = require("express");
const cors         = require("cors");
require("dotenv").config();

const graphRoutes    = require("./routes/graph.routes");
const queryRoutes    = require("./routes/query.routes");
const errorHandler   = require("./middleware/errorHandler");
const graphService   = require("./services/graph.service");

const app  = express();
const PORT = process.env.PORT || 3000;

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000").split(",");

app.use(cors({
  origin(origin, callback) {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin "${origin}" is not allowed`));
  },
}));
app.use(express.json());

app.use("/api/v1/graph", graphRoutes);
app.use("/api/v1",       queryRoutes);
app.use(errorHandler);

// Initialize graph data before accepting requests
graphService.initialize();
app.listen(PORT, () => console.log(`Graph API running on http://localhost:${PORT}/api/v1`));
