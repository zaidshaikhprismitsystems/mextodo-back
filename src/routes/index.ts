import { Router } from "express";
import authRoutes from "./auth.routes";
import locationRoutes from "./location.routes";
import productRoutes from "./product.routes";
import orderRoutes from "./order.routes";
import dashboardRoutes from "./dashboard.routes";
import ticketsRoutes from "./ticket.routes";
import usersRoutes from "./user.routes";
import settingRoutes from "./setting.routes";
import couponRoutes from "./coupon.routes";
import reportRoutes from "./reportings.routes";
import emailpatternRoutes from "./email-pattern.routes";
import pagesRoutes from "./pages.routes";
import visitorRoutes from "./visitors.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/location", locationRoutes);
router.use("/product", productRoutes);
router.use("/orders", orderRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/tickets", ticketsRoutes);
router.use("/users", usersRoutes);
router.use("/settings", settingRoutes);
router.use("/coupons", couponRoutes);
router.use("/reports", reportRoutes);
router.use("/email_template", emailpatternRoutes);
router.use("/pages", pagesRoutes);
router.use("/visitor", visitorRoutes);

export default router;