import { NextFunction, Request, Response } from 'express';
import { hashPassword, comparePassword } from "../utils/hash";
import jwt from "jsonwebtoken";
import { PrismaClient } from '@prisma/client';
import { EmailService } from '../utils/email';
import Stripe from "stripe";
import crypto from "crypto";
import axios from 'axios';

const emailService = EmailService.getInstance();
const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-01-27.acacia" });
import { Utils } from '../utils/utils';

export class VisitorsController {
    static async getAllVisitors(req: any, res: Response) {
        try {
          const { search, country, region, city, page = 0, rowsPerPage = 10 } = req.query;
      
          const where: any = {};
      
          // Filter by location fields
          if (country) where.country = country;
          if (region) where.region = region;
          if (city) where.city = city;
      
          // Search by IP (with partial match)
          if (search) {
            where.OR = [
              { ip: { contains: search, mode: 'insensitive' } }
            ];
          }
      
          const visitors = await prisma.visitor.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: parseInt(page) * parseInt(rowsPerPage),
            take: parseInt(rowsPerPage)
          });
      
          const totalCount = await prisma.visitor.count({ where });
      
          res.status(200).json({ success: true, data: visitors, totalCount });
      
        } catch (error) {
          console.error("Error fetching visitors:", error);
          res.status(500).json({ success: false, message: "Error fetching visitors" });
        }
      }
      

}