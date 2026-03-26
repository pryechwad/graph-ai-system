const express      = require("express");
const cors         = require("cors");
require("dotenv").config();

const graphRoutes  = require("./routes/graph.routes");
const queryRoutes  = require("./routes/query.routes");
const errorHandler = require("./middleware/errorHandler");
const graphService = require("./services/graph.service");

const app  = express();
const PORT = process.env.PORT || 5000;

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000").split(",");

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin) || /\.vercel\.app$/.test(origin)) return callback(null, true);
    callback(new Error(`CORS: origin "${origin}" is not allowed`));
  },
}));
app.use(express.json());

app.get("/", (_req, res) => res.json({ message: "Server is running" }));

app.use("/graph",    graphRoutes);
app.use("/query",    queryRoutes);
app.use(errorHandler);

graphService.initialize();
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
