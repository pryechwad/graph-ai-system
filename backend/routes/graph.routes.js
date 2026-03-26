const { Router }  = require("express");
const { getGraph, getNode } = require("../controllers/graph.controller");

const router = Router();

router.get("/",       getGraph);
router.get("/node/:id", getNode);

module.exports = router;
