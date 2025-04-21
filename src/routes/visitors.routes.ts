import express from "express";
import { VisitorsController } from "../controllers/visitors.controller";
import { validateLogin, validateRegister } from "../validations/auth.validations";
import { validateKey } from "../middleware/auth.middleware";

const router = express.Router();

router.get("/get_all_visitors", validateKey, VisitorsController.getAllVisitors);


export default router;