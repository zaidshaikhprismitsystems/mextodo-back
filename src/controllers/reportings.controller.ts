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

export class ReportingController  {

    static async getReportData(req: Request, res: Response): Promise<void> {
        try {
          const { entityType, startDate, endDate } = req.query;
      
          // Date filters (optional)
          const dateFilter: any = {};
          if (startDate) dateFilter.gte = new Date(startDate as string);
          if (endDate) dateFilter.lte = new Date(endDate as string);
      
          let data: any = {};
          const parsedEntityType = (entityType as string)?.toLowerCase();
      
          switch (parsedEntityType) {
            case 'orders':
              data = await prisma.orders.findMany({
                where: {
                  // createdAt: dateFilter,
                },
                include: {
                  customer: true,
                  vendor: true,
                  payment: true,
                },
                orderBy: { createdAt: 'desc' },
              });
      
              // Summarize
              const totalOrders = data.length;
              const totalRevenue = data.reduce((sum: any, o: any) => sum + o.totalPrice, 0);
      
              res.json({
                success: true,
                data,
                summary: {
                  totalOrders,
                  totalRevenue,
                },
              });
              break;
      
            case 'products':
              data = await prisma.products.findMany({
                // where: {
                //   createdAt: dateFilter,
                // },
                include: {
                  category: true,
                  vendor: true,
                },
                orderBy: {
                  createdAt: 'desc',
                },
              });
      
              const totalProducts = data.length;
              const statusBreakdown = data.reduce((acc: any, p: any) => {
                acc[p.status] = (acc[p.status] || 0) + 1;
                return acc;
              }, {});
      
              res.json({
                success: true,
                data,
                summary: {
                  totalProducts,
                  statusBreakdown,
                },
              });
              break;
      
            case 'users':
              data = await prisma.users.findMany({
                where: {
                  // createdAt: dateFilter,
                  role: 'customer',
                },
                orderBy: { createdAt: 'desc' },
              });
      
              res.json({
                success: true,
                summary: {
                  totalUsers: data.length,
                },
                data,
              });
              break;
      
            case 'owners':
              data = await prisma.users.findMany({
                where: {
                  // createdAt: dateFilter,
                  role: 'seller',
                },
                orderBy: { createdAt: 'desc' },
              });
      
              res.json({
                success: true,
                summary: {
                  totalVendors: data.length,
                },
                data,
              });
              break;
      
            default:
              res.status(400).json({
                success: false,
                message: "Invalid entity type. Use 'orders', 'products', 'users', or 'vendors'",
              });
          }
        } catch (error) {
          console.error("Error generating report:", error);
          res.status(500).json({ success: false, message: "Internal server error" });
        }
      }      

}