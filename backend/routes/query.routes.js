const { Router }      = require("express");
const { handleQuery } = require("../controllers/query.controller");

const router = Router();

router.post("/", handleQuery);

module.exports = router;
