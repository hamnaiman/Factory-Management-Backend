// const express = require("express");
// const router = express.Router();

// const authMiddleware = require("../middleware/authMiddleware");
// const clientController = require("../controllers/clientController");

// router.use(authMiddleware);

// router.get("/", clientController.getClients);
// router.get("/:id", clientController.getClientById);
// router.post("/", clientController.createClient);
// router.put("/:id", clientController.updateClient);
// router.delete("/:id", clientController.deleteClient);

// module.exports = router;

const express = require("express");
const router = express.Router();
const {
  getClientLedger,
} = require("../controllers/clientLedgerController");

const {
  getClientProfile,
} = require("../controllers/clientProfileController");

const authMiddleware = require("../middleware/authMiddleware");

const {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
} = require("../controllers/clientController");

const {
  receivePayment,
  getClientPayments,
} = require("../controllers/clientPaymentController");

router.use(authMiddleware);

// ================= Client CRUD =================

router.get("/", getClients);

router.get("/:id/profile", getClientProfile);

router.get("/:id", getClientById);

router.post("/", createClient);

router.put("/:id", updateClient);

router.delete("/:id", deleteClient);

router.post("/:id/payment", receivePayment);

router.get("/:id/payments", getClientPayments);

router.get("/:id/ledger", getClientLedger);




module.exports = router;