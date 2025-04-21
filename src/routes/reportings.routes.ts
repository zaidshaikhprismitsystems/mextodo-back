import express from "express";
import { ReportingController } from "../controllers/reportings.controller";
import { validateLogin, validateRegister } from "../validations/auth.validations";
import { validateKey } from "../middleware/auth.middleware";

const router = express.Router();

router.get("/get_reports", validateKey, ReportingController.getReportData);


export default router;