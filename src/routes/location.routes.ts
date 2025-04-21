import express from "express";
import { LocationService } from "../controllers/location.controller";

const router = express.Router();

router.get("/getcountries", LocationService.getAllCountries);
router.get("/getstates", LocationService.getAllStates);
router.get("/getcities", LocationService.getAllCities);

export default router;