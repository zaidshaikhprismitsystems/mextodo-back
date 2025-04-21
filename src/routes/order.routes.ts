import express from "express";
import { OrderController } from "../controllers/order.controllers";
import { validateKey } from "../middleware/auth.middleware";

const router = express.Router();

router.post("/createorder", validateKey, OrderController.createOrder);
router.post("/create-checkout-session", validateKey, OrderController.createCheckoutSession);

router.get("/get_orders", validateKey, OrderController.listOrder);
router.get("/get_order_details", validateKey, OrderController.getOrder);
router.post("/get_shiiping_data", validateKey, OrderController.getShippingData);

router.delete("/cancel_orders", validateKey, OrderController.cancelOrder);

router.post("/generate_shipping", validateKey, OrderController.generateShipping);
router.post("/shedule_pickup", validateKey, OrderController.shedulePickup);
router.get("/get_all_carriers", validateKey, OrderController.getAllCarriers);

router.get("/generate_invoice", validateKey, OrderController.generateInvoice);

export default router;