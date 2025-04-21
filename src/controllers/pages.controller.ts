import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class PageController {
  static async getPage(req: Request, res: Response): Promise<void> {
    try {
      const slug: string = req.query.slug as string;

      const pageData = await prisma.pages.findFirst({
        where: { slug }
      });

      if (!pageData) {
        res.status(200).json({
          success: true,
          data: {
            name: slug
              .split('-')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' '),
            slug,
            title: '',
            content: '',
            contentSp: ''
          },
          message: "Page not found"
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Page data fetched successfully',
        data: pageData,
      });

    } catch (error) {
      console.error("Error fetching page:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }

  static async addOrUpdatePage(req: Request, res: Response): Promise<void> {
    try {
      const { name, slug, content, contentSp } = req.body;

      const existingPage = await prisma.pages.findFirst({
        where: { slug }
      });

      if (!existingPage) {
        const newPage = await prisma.pages.create({
          data: {
            name: name || "",
            slug: slug || "",
            content: content || "",
            contentSp: contentSp || "",
          }
        });

        res.status(201).json({
          success: true,
          message: "New page created",
          data: newPage
        });
        return;
      } else {
        const updatedPage = await prisma.pages.update({
          where: { id: existingPage.id },
          data: {
            name: name || existingPage.name,
            content: content || existingPage.content,
            contentSp: contentSp || existingPage.contentSp,
          }
        });

        res.status(200).json({
          success: true,
          message: "Page updated successfully",
          data: updatedPage
        });
        return;
      }

    } catch (error) {
      console.error("Error handling page:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }
}
