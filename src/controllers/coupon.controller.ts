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

export class CouponController  {
    static async createCoupon(req: Request, res: Response) {
        try {
          const {
            code,
            description,
            discountType,
            discountValue,
            minOrderAmount,
            maxDiscount,
            startDate,
            endDate,
            usageLimit,
            isActive
          } = req.body;
    
          const newCoupon = await prisma.coupons.create({
            data: {
              code,
              description,
              discountType,
              discountValue: parseFloat(discountValue),
              minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : undefined,
              maxDiscount: maxDiscount ? parseFloat(maxDiscount) : undefined,
              startDate: new Date(startDate),
              endDate: new Date(endDate),
              usageLimit: usageLimit ? parseInt(usageLimit) : undefined,
              isActive: isActive !== undefined ? isActive : true
            }
          });
    
          res.status(201).json({ success: true, data: newCoupon });
        } catch (error) {
          console.error("Error creating coupon:", error);
          res.status(500).json({ success: false, message: "Error creating coupon" });
        }
    }
    
    static async getAllCoupons(req: Request, res: Response) {
        try {
            const { search, status, page = 0, rowsPerPage = 10 } = req.query;
        
            let where: any = {};
        
            // Search across code and description (you can adjust fields as needed)
            if (search) {
            where = {
                ...where,
                OR: [
                { code: { contains: search as string, mode: 'insensitive' } },
                { description: { contains: search as string, mode: 'insensitive' } },
                ],
            };
            }
        
            // Handle status: "enabled" or "disabled" mapped to isActive
            if (status) {
            where = {
                ...where,
                isActive: status === "active" ? true : false,
            };
            }
        
            const coupons = await prisma.coupons.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: parseInt(page as string) * parseInt(rowsPerPage as string),
            take: parseInt(rowsPerPage as string),
            });
        
            const totalCount = await prisma.coupons.count({ where });
        
            res.status(200).json({ success: true, data: coupons, totalCount });
        } catch (error) {
            console.error("Error fetching coupons:", error);
            res.status(500).json({ success: false, message: "Error fetching coupons" });
        }
    }
      

    static async updateCoupon(req: Request, res: Response) {
    try {
        const {
            id,
            code,
            description,
            discountType,
            discountValue,
            minOrderAmount,
            maxDiscount,
            startDate,
            endDate,
            usageLimit,
            isActive
        } = req.body;

        const updatedCoupon = await prisma.coupons.update({
        where: { id: parseInt(id) },
        data: {
            code,
            description,
            discountType,
            discountValue: parseFloat(discountValue),
            minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : 0.0,
            maxDiscount: maxDiscount ? parseFloat(maxDiscount) : 0.0,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            usageLimit: usageLimit ? parseInt(usageLimit) : undefined,
            isActive: isActive !== undefined ? isActive : true
        },
        });
        res.status(200).json({ success: true, data: updatedCoupon });
    } catch (error) {
        console.error("Error updating coupon:", error);
        res.status(500).json({ success: false, message: "Error updating coupon" });
    }
    }

    static async deleteCoupon(req: any, res: Response) {
    try {
        
        let ids: any = req?.query?.ids?.split(",");
        const idList = ids.map((id: any) => parseInt(id, 10));
        const deleteCoupon = await prisma.coupons.updateMany({ 
            where:{
                id: {
                    in: idList
                }
            },
            data:{
                isActive: false
            },
        });
        res.status(200).json({ success: true, message: "Coupon deleted successfully" });
    } catch (error) {
        console.error("Error deleting coupon:", error);
        res.status(500).json({ success: false, message: "Error deleting coupon" });
    }
    }

    // vendor create coupon part

    static async createVendorCoupon(req: any, res: Response) {
        try {
            let vendor: any = await prisma.vendor_profiles.findFirst({
                where: {
                userId: req.user.id
                }
            })
            const {
                code,
                description,
                discountType,
                discountValue,
                startDate,
                endDate,
                usageLimit,
                isActive,
                product_id
            } = req.body;
        
            const newCoupon = await prisma.vendorCoupon.create({
                data: {
                    code,
                    description,
                    discountType,
                    discountValue: parseFloat(discountValue),
                    startDate: new Date(startDate),
                    endDate: new Date(endDate),
                    usageLimit: usageLimit ? parseInt(usageLimit) : undefined,
                    isActive: isActive !== undefined ? isActive : true,
                    vendorId: parseInt(vendor.id),
                    product_id: parseInt(product_id)
                },
            });
        
            res.status(201).json({ success: true, data: newCoupon });
        } catch (error) {
          console.error("Error creating vendor coupon:", error);
          res.status(500).json({ success: false, message: "Error creating vendor coupon" });
        }
      }
    
      static async getAllVendorCoupons(req: any, res: Response) {
        try {
            let vendor: any = await prisma.vendor_profiles.findFirst({
                where: {
                    userId: req.user.id
                }
            })
            
            const {
                search,
                status,
                page = 0,
                rowsPerPage = 10,
            } = req.query;
            
            let where: any = {
                vendorId: vendor.id
            };
        
            // Search by code or description
            if (search) {
            where.OR = [
                { code: { contains: search as string, mode: 'insensitive' } },
                { description: { contains: search as string, mode: 'insensitive' } }
            ];
            }
        
            // Status filter: "active" or "inactive"
            if (status) {
            where.isActive = status === "active";
            }
        
            const coupons = await prisma.vendorCoupon.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: parseInt(page as string) * parseInt(rowsPerPage as string),
            take: parseInt(rowsPerPage as string),
            });
        
            const totalCount = await prisma.vendorCoupon.count({ where });
        
            res.status(200).json({ success: true, data: coupons, totalCount });
        } catch (error) {
          console.error("Error fetching vendor coupons:", error);
          res.status(500).json({ success: false, message: "Error fetching vendor coupons" });
        }
      }
    
      static async updateVendorCoupon(req: Request, res: Response) {
        try {
          const {
            id,
            code,
            description,
            discountType,
            discountValue,
            startDate,
            endDate,
            usageLimit,
            isActive,
            product_id
          } = req.body;
    
          const updatedCoupon = await prisma.vendorCoupon.update({
            where: { id: parseInt(id) },
            data: {
              code,
              description,
              discountType,
              discountValue: parseFloat(discountValue),
              startDate: new Date(startDate),
              endDate: new Date(endDate),
              usageLimit: usageLimit ? parseInt(usageLimit) : undefined,
              isActive: isActive !== undefined ? isActive : true,
              product_id: parseInt(product_id)
            },
          });
    
          res.status(200).json({ success: true, data: updatedCoupon });
        } catch (error) {
          console.error("Error updating vendor coupon:", error);
          res.status(500).json({ success: false, message: "Error updating vendor coupon" });
        }
      }
    
      static async deleteVendorCoupon(req: Request, res: Response) {
        try {
          let ids: any = req?.query?.ids?.toString().split(",");
          const idList = ids.map((id: any) => parseInt(id, 10));
    
          await prisma.vendorCoupon.updateMany({
            where: {
              id: { in: idList },
            },
            data: {
              isActive: false,
            },
          });
    
          res.status(200).json({ success: true, message: "Vendor coupons deleted successfully" });
        } catch (error) {
          console.error("Error deleting vendor coupon:", error);
          res.status(500).json({ success: false, message: "Error deleting vendor coupon" });
        }
      }

    // static async validCouponShow(req: Request, res: Response){
    //     const today = new Date();
    //     const validCoupons = await prisma.coupons.findMany({
    //     where: {
    //         startDate: { lte: today },
    //         endDate: { gte: today },
    //         isActive: true,
    //         OR: [
    //         { usageLimit: null },
    //         { usageLimit: { gt: { usedCount: true } } } // optional
    //         ]
    //     }
    //     });
    // }
}