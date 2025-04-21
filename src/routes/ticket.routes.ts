import express from "express";
import { TicketController } from "../controllers/ticket.controllers";
import { validateKey } from "../middleware/auth.middleware";

const router = express.Router();

router.post("/create_ticket", validateKey, TicketController.createTicket);
router.get("/view_ticket", validateKey, TicketController.viewTicket);
router.get("/view_vendor_ticket", validateKey, TicketController.viewVendorTicket);
router.get("/list_titkets", validateKey, TicketController.listAllTickets);
router.post("/update_ticket", validateKey, TicketController.updateTicket);
router.post("/assign_ticket", validateKey, TicketController.assignTicket);
router.post("/add_reply", validateKey, TicketController.addReplyToTicket);

router.get("/list_tickets_vendor", validateKey, TicketController.listAllTicketsVendor);

export default router;