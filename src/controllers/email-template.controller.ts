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

export class EmailPatternController  {
  static async getEmailPattern(req: Request, res: Response): Promise<void> {
      try {
        const template: any = req.query.template ;

        const templateData = await prisma.email_patterns.findFirst({
          where: {
            slug: template as string,
          }
        });

        if (!templateData) {
          res.status(200).json({ success: true, data: {
            name: template.split('_')
            .map((word: any) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' '),
            slug: template,
            subject: '',
            html: '',
            subjectSp: '',
            htmlSp: ''
          },
          message: "Template not found" });
          return;
        }

        res.status(200).json({
          success: true,
          message: 'Template data fetched successfully',
          data: { ...templateData },
      });
    
      } catch (error) {
        console.error("Error generating report:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
      }
  }
  
  static async addEmailPattern(req: Request, res: Response): Promise<void> {
    try {
      const { name, subject, subjectSp, slug, html, htmlSp } = req.body;
  
      const existingTemplate = await prisma.email_patterns.findFirst({
        where: { slug }
      });
  
      if (!existingTemplate) {
        const newTemplate = await prisma.email_patterns.create({
          data: {
            name: name || "",
            slug: slug || "",
            subject: subject || "",
            html: html || "",
            subjectSp: subjectSp || "",
            htmlSp: htmlSp || "",
          }
        });
  
        res.status(201).json({
          success: true,
          message: "New template created",
          data: newTemplate
        });
        return;
      }else{
        // If template exists, update it
        const updatedTemplate = await prisma.email_patterns.update({
          where: { id: existingTemplate.id },
          data: {
            name: name || existingTemplate.name,
            subject: subject || existingTemplate.subject,
            html: html || existingTemplate.html,
            subjectSp: subjectSp || existingTemplate.subjectSp,
            htmlSp: htmlSp || existingTemplate.htmlSp
          }
        });
        res.status(200).json({
          success: true,
          message: "Template updated successfully",
          data: updatedTemplate
        });
        return;
      }
  
    } catch (error) {
      console.error("Error handling template:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }
  

}