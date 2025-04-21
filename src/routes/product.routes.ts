import express from "express";
import { ProductController } from "../controllers/product.controllers";
import { validateKey } from "../middleware/auth.middleware";

const router = express.Router();

router.post("/add_category", ProductController.createCategory);
router.get("/get_categories", ProductController.getCategories);
router.get("/get_all_categories", validateKey, ProductController.getAllCategories);
router.post("/update_category", validateKey, ProductController.updateCategory);
router.delete("/delete_categories", validateKey, ProductController.deleteCategory);

router.post("/add_attribute", validateKey, ProductController.createAttribute);
router.get("/get_attributes", validateKey, ProductController.getAttributes);
router.get("/get_all_attributes", validateKey, ProductController.getAllAttributes);
router.delete("/delete_attributes", validateKey, ProductController.deleteAttributes);
router.post("/update_attribute", validateKey, ProductController.updateAttribute);

router.get("/get_selected_category_attributes", ProductController.getCategoryAttributesData);
router.post("/add_attribute_to_category", ProductController.addAttributeToCategory);
router.get("/get_category_attributes", ProductController.getCategoryAttributes);

router.post("/add_product", validateKey, ProductController.createProduct);
router.post("/update_product", validateKey, ProductController.updateProduct);
router.get("/get_owner_products", validateKey, ProductController.getOwnerProducts);
router.get("/get_all_products", validateKey, ProductController.getAllOwnerProducts);
router.get("/get_product", validateKey, ProductController.getProduct);
router.delete("/delete_products", validateKey, ProductController.deleteProducts);

router.post("/product_reject", validateKey, ProductController.rejectProduct);
router.post("/product_approve", validateKey, ProductController.acceptProduct);

router.get("/get_home_products", ProductController.getHomeProducts)


export default router;