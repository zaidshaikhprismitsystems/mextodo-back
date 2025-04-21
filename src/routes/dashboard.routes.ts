import express from "express";
import { DashboardController } from "../controllers/dashboard.controllers";
import { validateKey } from "../middleware/auth.middleware";

const router = express.Router();

router.get("/get_owner_data", validateKey, DashboardController.getOwnerDashData);
router.get("/get_admin_data", validateKey, DashboardController.getAdminDashData);

export default router;