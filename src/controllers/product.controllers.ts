import { NextFunction, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { EmailService } from '../utils/email';
import { imageUpload } from "../utils/uploadImage"
import path from "path"
import { videoUpload } from '../utils/uploadVideo';

const emailService = EmailService.getInstance();
const prisma = new PrismaClient();

export class ProductController {

    // get home products
    // static async getHomeProducts(req: Request, res: Response, next: NextFunction) {
    //     try {
    //       const limit = 10;
      
    //       // 1. Get discounted products
    //       const discountedProducts = await prisma.products.findMany({
    //         where: {  
    //             discountPrice: {
    //                 not: null,
    //                 lt: prisma.products.fields.price,
    //             },
    //             status: "approved",
    //         },
    //         orderBy: {
    //           updated_at: "desc",
    //         },
    //         take: limit
    //       });
      
    //       const discountedIds = discountedProducts.map(p => p.id);
      
    //       if (discountedProducts.length < limit) {
    //         const fallbackDiscounted = await prisma.products.findMany({
    //           where: {
    //             id: { notIn: discountedIds },
    //             // discountPrice: null,
    //             status: "approved",
    //           },
    //           orderBy: {
    //             createdAt: "desc",
    //           },
    //           take: limit - discountedProducts.length,
    //         });
      
    //         discountedProducts.push(...fallbackDiscounted);
    //       }
      
    //       // 2. Get best-selling product IDs
    //       const bestSellingGrouped = await prisma.order_items.groupBy({
    //         by: ['productId'],
    //         _sum: {
    //           quantity: true,
    //         },
    //         orderBy: {
    //           _sum: {
    //             quantity: 'desc',
    //           },
    //         },
    //         take: limit,
    //       });
      
    //       const bestSellingIds: any = bestSellingGrouped.map(item => item.productId);
      
    //       let bestSellingProducts = await prisma.products.findMany({
    //         where: {
    //           id: { in: bestSellingIds },
    //           status: "approved",
    //         },
    //       });
      
    //       // Sort to match order of bestSellingIds
    //       bestSellingProducts = bestSellingIds.map(
    //         (id: any) => bestSellingProducts.find(p => p.id === id)
    //       ).filter(Boolean);
      
    //       if (bestSellingProducts.length < limit) {
    //         const extraBestSellers = await prisma.products.findMany({
    //           where: {
    //             id: { notIn: bestSellingIds },
    //             status: "approved",
    //           },
    //           orderBy: {
    //             createdAt: "desc",
    //           },
    //           take: limit - bestSellingProducts.length,
    //         });
      
    //         bestSellingProducts.push(...extraBestSellers);
    //       }
      
    //       res.status(200).json({
    //         success: true,
    //         data: {
    //           discounted: discountedProducts,
    //           bestSelling: bestSellingProducts,
    //         },
    //       });
    //     } catch (error) {
    //       console.error("Error getting home products:", error);
    //       res.status(500).json({ success: false, message: "Error getting products" });
    //     }
    // }
    static async getHomeProducts(req: Request, res: Response, next: NextFunction) {
        try {
          const limit = 10;
    
          // 1. Get discounted products
          const discountedProducts = await prisma.products.findMany({
            where: {
              discountPrice: {
                not: null,
                lt: prisma.products.fields.price, // Assuming Prisma Middleware handles this, otherwise do it in JS
              },
              status: "approved",
            },
            orderBy: {
              updated_at: "desc",
            },
            take: limit,
          });
    
          const discountedIds = discountedProducts.map(p => p.id);
    
          if (discountedProducts.length < limit) {
            const fallbackDiscounted = await prisma.products.findMany({
              where: {
                id: { notIn: discountedIds },
                status: "approved",
                category:{
                    nameEn: {
                        in: ["digital", "physical", "Digital", "Physical"],
                      },
                }
              },
              orderBy: {
                createdAt: "desc",
              },
              take: limit - discountedProducts.length,
            });
    
            discountedProducts.push(...fallbackDiscounted);
          }
    
          // 2. Best-selling products
          const bestSellingGrouped = await prisma.order_items.groupBy({
            by: ['productId'],
            _sum: {
              quantity: true,
            },
            orderBy: {
              _sum: {
                quantity: 'desc',
              },
            },
            take: limit,
          });
    
          const bestSellingIds = bestSellingGrouped.map(item => item.productId);
    
          let bestSellingProducts = await prisma.products.findMany({
            where: {
              id: { in: bestSellingIds },
              status: "approved",
              category:{
                nameEn: {
                    in: ["digital", "physical", "Digital", "Physical"],
                  },
                }
            },
          });
    
          // Maintain order by sales
          bestSellingProducts = bestSellingIds.map(id =>
            bestSellingProducts.find(p => p.id === id)
          ).filter(Boolean) as typeof bestSellingProducts;
    
          if (bestSellingProducts.length < limit) {
            const extraBestSellers = await prisma.products.findMany({
              where: {
                id: { notIn: bestSellingIds },
                status: "approved",
              },
              orderBy: {
                createdAt: "desc",
              },
              take: limit - bestSellingProducts.length,
            });
    
            bestSellingProducts.push(...extraBestSellers);
          }
    
          // 3. Ratings
          const allProductIds = [
            ...new Set([
              ...discountedProducts.map(p => p.id),
              ...bestSellingProducts.map(p => p.id),
            ]),
          ];
    
          const ratingAggregates = await prisma.reviews.groupBy({
            by: ['productId'],
            _avg: {
              rating: true,
            },
            where: {
              productId: { in: allProductIds },
            },
          });
    
          const ratingMap = new Map(
            ratingAggregates.map((r: any) => [r.productId, r._avg.rating ?? 0])
          );
    
          const attachRatings = (products: any[]) =>
            products.map(product => ({
              ...product,
              avgRating: ratingMap.get(product.id) || 0,
            }));
    
          // Response
          res.status(200).json({
            success: true,
            data: {
              discounted: attachRatings(discountedProducts),
              bestSelling: attachRatings(bestSellingProducts),
            },
          });
          return;
        } catch (error) {
          console.error("Error getting home products:", error);
          res.status(500).json({
            success: false,
            message: "Error getting products",
          });
        }
    }
      

    // Create Category
    static async createCategory(req: Request, res: Response, next: NextFunction) {
        try {
            const { nameEn, nameSp, descriptionEn, descriptionSp, image } = req.body;
            
            const buffer = Buffer.from(image.image, "base64");
            const uploadPath = path.join(__dirname, "../../uploads/categories");
            const filePath = await imageUpload({ data: buffer, mimetype: image.mimetype }, uploadPath);
    
            if(filePath){
                const category = await prisma.categories.create({
                    data: { nameEn, nameSp, descriptionEn, descriptionSp, image: filePath }
                });
                res.status(201).json({ success: true, data: category, message: "category created successfully" });
            }
            // res.status(201).json({ success: true,  message: "category created successfully" });
        } catch (error) {
            console.error("Error creating category:", error);
            res.status(500).json({ success: false, message: "Error creating category" });
        }
    }

    // Update Category
    static async updateCategory(req: Request, res: Response, next: NextFunction) {
        try {
            const { id, nameEn, nameSp, descriptionEn, descriptionSp, image, status } = req.body;
            
            let filePath = image;
            if(typeof image !== "string"){
                const buffer = Buffer.from(image.image, "base64");
                const uploadPath = path.join(__dirname, "../../uploads/categories");
                filePath = await imageUpload({ data: buffer, mimetype: image.mimetype }, uploadPath);
            }
    
            const category = await prisma.categories.update({
                where: { id },
                data: { nameEn, nameSp, descriptionEn, descriptionSp, image: filePath, status }
            });
            res.status(201).json({ success: true, data: category, message: "category updated successfully" });
        } catch (error) {
            console.error("Error updating category:", error);
            res.status(500).json({ success: false, message: "Error updating category" });
        }
    }

    // Get All Categories every one
    static async getCategories(req: any, res: Response) {
        try {
            const categories = await prisma.categories.findMany({
                where:{
                    status: "enabled"
                }
            });
            res.status(200).json({ success: true, data: categories });
        } catch (error) {
            console.error("Error fetching products:", error);
            res.status(500).json({ success: false, message: "Error fetching products" });
        }
    }

    // Get All Categories admin
    static async getAllCategories(req: any, res: Response) {
        try {
            const { search, status, page, rowsPerPage } = req.query;
            let where = {};
            if (search) {
                where = {
                    ...where,
                    OR: [
                        { nameEn: { contains: search, mode: 'insensitive' } }, 
                        { nameSp: { contains: search, mode: 'insensitive' } },
                    ]
                };
            }

            if (status) {
                where = {
                    ...where,
                    status: status
                };
            }

            const categories = await prisma.categories.findMany({ 
                where: where,
                orderBy: {
                    createdAt: "desc"
                },
                skip: parseInt(page ? page?.toString() : "1")*parseInt(rowsPerPage ? rowsPerPage.toString() : '10'),
                take: parseInt(rowsPerPage ? rowsPerPage.toString() : '10'),
                include: {
                    _count: {
                        select: { products: true }
                    }
                }
            });
            const totalCount = await prisma.categories.count({ where });
            res.status(200).json({ success: true, data: categories, totalCount });
        } catch (error) {
            console.error("Error fetching products:", error);
            res.status(500).json({ success: false, message: "Error fetching products" });
        }
    }

    static async deleteCategory(req: any, res: Response) {
        try {
            let ids = req.query.ids.split(",");
            const idList = ids.map((id: any) => parseInt(id, 10)); 
            const deleteCategories = await prisma.categories.updateMany({ 
                where:{
                    id: {
                        in: idList
                    }
                },
                data:{
                    status: "disabled"
                },
            });
            res.status(200).json({ success: true, data: deleteCategories });
        } catch (error) {
            console.error("Error fetching products:", error);
            res.status(500).json({ success: false, message: "Error fetching products" });
        }
    }

    // Create Attribute
    static async createAttribute(req: Request, res: Response) {
        try {
            const { nameEn, nameSp } = req.body;
            const attribute = await prisma.attributes.create({
                data: { nameEn, nameSp }
            });
            res.status(201).json({ success: true, data: attribute });
        } catch (error) {
            console.error("Error creating attribute:", error);
            res.status(500).json({ success: false, message: "Error creating attribute" });
        }
    }

    static async getAttributes(req: Request, res: Response) {
        try {
            const attributes = await prisma.attributes.findMany({});
            res.status(200).json({ success: true, data: attributes });
        } catch (error) {
            console.error("Error fetching categories:", error);
            res.status(500).json({ success: false, message: "Error fetching categories" });
        }
    }

    // Get All Attributes
    static async getAllAttributes(req: any, res: Response) {
        try {
            const { search, status, page, rowsPerPage } = req.query;
            let where = {};
            if (search) {
                where = {
                    ...where,
                    OR: [
                        { nameEn: { contains: search, mode: 'insensitive' } }, 
                        { nameSp: { contains: search, mode: 'insensitive' } },
                    ]
                };
            }

            if (status) {
                where = {
                    ...where,
                    status: status
                };
            }

            const attributes = await prisma.attributes.findMany({ 
                where: where,
                orderBy: {
                    createdAt: "desc"
                },
                skip: parseInt(page ? page?.toString() : "1")*parseInt(rowsPerPage ? rowsPerPage.toString() : '10'),
                take: parseInt(rowsPerPage ? rowsPerPage.toString() : '10'),
                include: {
                    _count: {
                        select:{
                            categoriesAttribute: true
                        }
                    }
                }
            });
            const totalCount = await prisma.attributes.count({ where });
            res.status(200).json({ success: true, data: attributes, totalCount });
        } catch (error) {
            console.error("Error fetching products:", error);
            res.status(500).json({ success: false, message: "Error fetching products" });
        }
    }
    
    static async deleteAttributes(req: any, res: Response) {
        try {
            let ids = req.query.ids.split(",");
            const idList = ids.map((id: any) => parseInt(id, 10)); 
            const deleteAttributes = await prisma.attributes.updateMany({ 
                where:{
                    id: {
                        in: idList
                    }
                },
                data:{
                    status: "disabled"
                },
            });
            res.status(200).json({ success: true, data: deleteAttributes });
        } catch (error) {
            console.error("Error fetching products:", error);
            res.status(500).json({ success: false, message: "Error fetching products" });
        }
    }

    static async updateAttribute(req: Request, res: Response, next: NextFunction) {
        try {
            const { id, nameEn, nameSp, status } = req.body;
            
            const attribute = await prisma.attributes.update({
                where: { id },
                data: { nameEn, nameSp, status }
            });
            res.status(201).json({ success: true, data: attribute, message: "attribute updated successfully" });
        } catch (error) {
            console.error("Error updating attribute:", error);
            res.status(500).json({ success: false, message: "Error updating attribute" });
        }
    }

    static async getCategoryAttributesData(req: Request, res: Response) {
        try {
            const categoryId = req.query.category;
            if(categoryId && categoryId !== null && categoryId !== undefined){
                const attributes = await prisma.category_attributes.findMany({
                    where:{
                        categoryId: parseInt(categoryId.toString())
                    }
                });
                res.status(200).json({ success: true, data: attributes });
            }
        } catch (error) {
            console.error("Error fetching categories:", error);
            res.status(500).json({ success: false, message: "Error fetching categories" });
        }
    }

    // Create Category-Attribute Relationship
    static async addAttributeToCategory(req: Request, res: Response) {
        try {
            const { category, attributes } = req.body;

            const dataToInsertdeleteRelation = await prisma.category_attributes.deleteMany({
                where:{
                    categoryId: category
                }
            })

            const dataToInsert = attributes.map((attributeId: number) => ({
                categoryId: category,
                attributeId,
            }));

            const relations = await prisma.category_attributes.createMany({
                data: dataToInsert,
                skipDuplicates: true
            });
            
            res.status(201).json({ success: true, data: relations });
        } catch (error) {
            console.error("Error linking attribute to category:", error);
            res.status(500).json({ success: false, message: "Error linking attribute to category" });
        }
    }

    // Get Category Attributes
    static async getCategoryAttributes(req: Request, res: Response) {
        try {
            const { category } = req.query;
            if(category){
                console.log('categoryId: ', category);
                const relation = await prisma.category_attributes.findMany({
                    where: { categoryId: parseInt(category.toString()) },
                    include: {
                        category: true,
                        attribute: true
                    }
                });
                res.status(201).json({ success: true, data: relation });
            }
        } catch (error) {
            console.error("Category Attributes Fetched Successfully:", error);
            res.status(500).json({ success: false, message: "Failed To Fetched Category Attributes" });
        }
    }

    // Create Product
    static async createProduct(req: any, res: Response) {
        try {
            let vendor: any = await prisma.vendor_profiles.findFirst({
                where: {
                    userId: req.user.id
                }
            })

            const { 
                categoryId, titleEn, titleSp, descriptionEn, descriptionSp, attributes, images, 
                price, discountPrice, stock, featuredImage, video, rentOrSale, cityId, stateId, 
                digitalProductType, digitalProduct, content, packType,boxQuantity, whatsappNumber
            } = req.body;
           
            let imageArray: any = [];
            
            // Thumbnail Images
            const uploadPath = path.join(__dirname, "../../uploads/products");
            for(let i = 0; i < images.length; i++){
                const buffer = Buffer.from(images[i].image, "base64");
                const filePath = await imageUpload({ data: buffer, mimetype: images[i].mimetype }, uploadPath);
                console.log('filePath: ', filePath);
                imageArray.push(filePath);
            }

            // Featured Image
            const buffer = Buffer.from(featuredImage.image, "base64");
            const filePath = await imageUpload({ data: buffer, mimetype: featuredImage.mimetype }, uploadPath);
            let featuredImageData: any = filePath;
            
            // Video Upload
            const fileName: any = await videoUpload(video, uploadPath);

            // // Digital Product
            // const bufferDigital = Buffer.from(featuredImage.data, "base64");
            // const filePathDigital: any = await imageUpload({ data: bufferDigital, mimetype: digitalProduct.mimetype }, uploadPath);

            // Digital Product
            let filePathDigital: any = '';
            if(typeof digitalProduct !== "string"){
                let bufferDigital = Buffer.from(digitalProduct.data, "base64");
                if(digitalProductType === "image"){
                    filePathDigital = await imageUpload({ data: bufferDigital, mimetype: digitalProduct.mimetype }, uploadPath);
                }
                else if(digitalProductType === "video"){
                    filePathDigital = await videoUpload(digitalProduct, uploadPath);
                }
                else if(digitalProductType === "audio"){
                    filePathDigital = await imageUpload({ data: bufferDigital, mimetype: digitalProduct.mimetype }, uploadPath);
                }
                else if(digitalProductType === "documents"){
                    filePathDigital = await imageUpload({ data: bufferDigital, mimetype: digitalProduct.mimetype }, uploadPath);
                }
                else if(digitalProductType === "compresed_files"){
                    filePathDigital = await imageUpload({ data: bufferDigital, mimetype: digitalProduct.mimetype }, uploadPath);
                }
            }
            
            // if(filePath){
            const product = await prisma.products.create({
                data: {
                    vendorId: vendor.id,
                    stock,
                    categoryId,
                    titleEn,
                    titleSp,
                    descriptionEn,
                    descriptionSp,
                    attributes,
                    images: imageArray,
                    price,
                    discountPrice,
                    featuredImage: featuredImageData,
                    video: video ? fileName : '',
                    rentOrSale,
                    stateId: stateId,
                    cityId: cityId,
                    digitalProduct: filePathDigital,
                    digitalProductType,
                    content,
                    packType,
                    whatsappNumber,
                    boxQuantity
                }
            });

            res.status(201).json({ success: true, data: product });
            // res.status(201).json({ success: true });
        } catch (error) {
            console.error("Error creating product:", error);
            res.status(500).json({ success: false, message: "Error creating product" });
        }
    }

    static async updateProduct(req: any, res: Response){
        try {
            const { product_id, categoryId, titleEn, titleSp, descriptionEn, descriptionSp, 
                attributes, images, price, discountPrice, stock, featuredImage, video, 
                rentOrSale, stateId, cityId, digitalProductType, digitalProduct, content, packType, boxQuantity, status, whatsappNumber } = req.body;
                
            let imageArray: any = [];
            // Thumbnail Images
            const uploadPath = path.join(__dirname, "../../uploads/products");
            for(let i = 0; i < images.length; i++){
                if(typeof images[i] !== "string"){
                    const buffer = Buffer.from(images[i].image, "base64");
                    const filePath = await imageUpload({ data: buffer, mimetype: images[i].mimetype }, uploadPath);
                    imageArray.push(filePath);
                }else{
                    imageArray.push(images[i]);
                }
            }

            // Featured Image
            let featuredImageData: any = featuredImage;
            if(typeof featuredImage !== "string"){
                const buffer = Buffer.from(featuredImage.image, "base64");
                const filePath = await imageUpload({ data: buffer, mimetype: featuredImage.mimetype }, uploadPath);
                featuredImageData = filePath;
            }
            
            // Video Upload
            let videoName: any = video;
            if(typeof video !== "string"){
                videoName = await videoUpload(video, uploadPath);
            }

            // Digital Product
            let filePathDigital: any = digitalProduct;
            if(typeof digitalProduct !== "string"){
                let bufferDigital = Buffer.from(digitalProduct.data, "base64");
                if(digitalProductType === "image"){
                    filePathDigital = await imageUpload({ data: bufferDigital, mimetype: digitalProduct.mimetype }, uploadPath);
                }
                else if(digitalProductType === "video"){
                    filePathDigital = await videoUpload(digitalProduct, uploadPath);
                }
                else if(digitalProductType === "audio"){
                    filePathDigital = await imageUpload({ data: bufferDigital, mimetype: digitalProduct.mimetype }, uploadPath);
                }
                else if(digitalProductType === "documents"){
                    filePathDigital = await imageUpload({ data: bufferDigital, mimetype: digitalProduct.mimetype }, uploadPath);
                }
                else if(digitalProductType === "compresed_files"){
                    filePathDigital = await imageUpload({ data: bufferDigital, mimetype: digitalProduct.mimetype }, uploadPath);
                }
            }
                 
            const dataToUpdate: any = {
                stock,
                categoryId,
                titleEn,
                titleSp,
                descriptionEn,
                descriptionSp,
                attributes,
                images: imageArray,
                price,
                discountPrice,
                featuredImage: featuredImageData,
                video: videoName,
                rentOrSale,
                stateId: stateId,
                cityId: cityId,
                digitalProduct: filePathDigital,
                digitalProductType,
                content,
                packType,
                boxQuantity,
                status,
                whatsappNumber
            };
            
            // Conditionally add images to the update data if imageArray is not empty
            if (imageArray.length > 0) {
                dataToUpdate.images = imageArray;
            }
            
            // if(filePath){
            const product = await prisma.products.update({
                where:{
                    id: product_id
                },
                data: {
                    ...dataToUpdate
                }
            });
            res.status(200).json({ success: true, data: product });
        } catch (error) {
            console.error("Error updating product:", error);
            res.status(500).json({ success: false, message: "Error creating product" });
        }
    }

    // Get All Products
    static async getProducts(req: Request, res: Response) {
        try {
            const { search, status } = req.query;
            let where: any = {};
            
            if (search) {
                where = {
                    ...where,
                    OR: [
                        { titleEn: { contains: search, mode: 'insensitive' } }, 
                        { titleSp: { contains: search, mode: 'insensitive' } },
                    ]
                };
            }

            if (status) {
                console.log('status: ', status);
                where = {
                    ...where,
                    status: status
                };
            }
            console.log('where: ', where);
            const products = await prisma.products.findMany({ 
                where: where,
                include: { 
                    category: true,
                    vendor: true
                }
            });
            res.status(200).json({ success: true, data: products });
        } catch (error) {
            console.error("Error fetching products:", error);
            res.status(500).json({ success: false, message: "Error fetching products" });
        }
    }

    static async getOwnerProducts(req: any, res: Response) {
        try {
            const { search, status, stock, page, rowsPerPage } = req.query;

            let vendor: any = await prisma.vendor_profiles.findFirst({
                where: {
                    userId: req.user.id
                }
            })
            
            let where: any = req.user.role === 'super_admin' ? {} : {
                vendorId: vendor.id
            };

            if (search) {
                where = {
                    ...where,
                    OR: [
                        { titleEn: { contains: search, mode: 'insensitive' } }, 
                        { titleSp: { contains: search, mode: 'insensitive' } },
                    ]
                };
            }

            if (status) {
                where = {
                    ...where,
                    status: status
                };
            }else{
                where = {
                    ...where,
                    status: {
                        not: "disabled"
                    }
                };
            }

            if(stock){
                where = {
                    ...where,
                    stock: stock === "stock" ? { gt: 0} : { lt: 1 }
                };
            }

            const products = await prisma.products.findMany({ 
                where: where,
                orderBy: {
                    createdAt: "desc"
                },
                include: { category: true, vendor: true },
                skip: parseInt(page)*parseInt(rowsPerPage),
                take: parseInt(rowsPerPage)
            });
            const totalCount = await prisma.products.count({ where });
            res.status(200).json({ success: true, data: products, totalCount });
            return;
        } catch (error) {
            console.error("Error fetching products:", error);
            res.status(500).json({ success: false, message: "Error fetching products" });
        }
    }

    static async getAllOwnerProducts(req: any, res: Response) {
        try {
          
            let vendor: any = await prisma.vendor_profiles.findFirst({
                where: {
                    userId: req.user.id
                }
            })
            
            let where: any = req.user.role === 'super_admin' ? {} : {
                vendorId: vendor.id
            };

            const products = await prisma.products.findMany({ 
                where: where,
                orderBy: {
                    createdAt: "desc"
                },
                select: { titleEn: true, titleSp: true, id: true, status: true, createdAt: true }
            });

            res.status(200).json({ success: true, data: products });
            return;
        } catch (error) {
            console.error("Error fetching products:", error);
            res.status(500).json({ success: false, message: "Error fetching products" });
        }
    }

    // static async getProduct(req: any, res: Response) {
    //     try {
    //         const { id } = req.query;
    //         const products = await prisma.products.findFirst({ 
    //             where: {
    //                 id: parseInt(id)
    //             },
    //             include: { category: true, vendor: true, reviews: {
    //                 include:{
    //                     users: true
    //                 }
    //             } }
    //         });
    //         res.status(200).json({ success: true, data: products });
    //     } catch (error) {
    //         console.error("Error fetching products:", error);
    //         res.status(500).json({ success: false, message: "Error fetching products" });
    //     }
    // }
    static async getProduct(req: any, res: Response) {
        try {
          const { id } = req.query;
      
          const productId = parseInt(id);
      
          // Get product with related data
          const product = await prisma.products.findFirst({
            where: { id: productId },
            include: {
              category: true,
              vendor: true,
              reviews: {
                include: {
                  users: true,
                },
              },
            },
          });
      
          if (!product) {
            res.status(404).json({ success: false, message: "Product not found" });
            return;
          }
      
          // Get rating analytics
          const ratingStats = await prisma.reviews.groupBy({
            by: ['rating'],
            where: { productId },
            _count: { rating: true },
          });
      
          // Build star-wise breakdown (1 to 5)
          const ratingsBreakdown = [1, 2, 3, 4, 5].map(star => {
            const found = ratingStats.find(r => r.rating === star);
            return {
              star,
              count: found ? found._count.rating : 0,
            };
          });
      
          // Get average rating
          const avgRatingData = await prisma.reviews.aggregate({
            where: { productId },
            _avg: { rating: true },
            _count: { rating: true },
          });
      
          res.status(200).json({
            success: true,
            data: {
              ...product,
              ratingSummary: {
                averageRating: avgRatingData._avg.rating || 0,
                totalCount: avgRatingData._count.rating || 0,
                starCounts: ratingsBreakdown,
              },
            },
          });
          return;
        } catch (error) {
          console.error("Error fetching product:", error);
          res.status(500).json({ success: false, message: "Error fetching product" });
          return;
        }
      }
      

    static async deleteProducts(req: any, res: Response) {
        try {
            let ids = req.query.ids.split(",");
            console.log('ids: ', ids);
            const idList = ids.map((id: any) => parseInt(id, 10)); 
            console.log('idList: ', idList);
            const products = await prisma.products.updateMany({ 
                where:{
                    id: {
                        in: idList
                    }
                },
                data:{
                    status: "disabled"
                },
            });
            console.log('products: ', products);
            res.status(200).json({ success: true, data: products });
        } catch (error) {
            console.error("Error fetching products:", error);
            res.status(500).json({ success: false, message: "Error fetching products" });
        }
    }

    static async addFavoriteProduct(req: Request, res: Response) {
        try {
            const { userId, productId } = req.body;
            const favorite = await prisma.favorite_products.create({
                data: { userId, productId }
            });
            res.status(201).json({ success: true, data: favorite });
        } catch (error) {
            console.error("Error adding favorite product:", error);
            res.status(500).json({ success: false, message: "Error adding favorite product" });
        }
    }

    static async getFavoriteProduct(req: Request, res: Response) {
        try {
            const { userId } = req.body;
            const favorite = await prisma.favorite_products.findMany({
                where:{ userId }
            });
            res.status(201).json({ success: true, data: favorite });
        } catch (error) {
            console.error("Error fetching favorite product:", error);
            res.status(500).json({ success: false, message: "Error fetching favorite product" });
        }
    }

    static async rejectProduct(req: Request, res: Response) {
        try {
            const { id, reason } = req.body;
            const products = await prisma.products.update({
                data:{
                    status: "rejected"
                },
                include: { 
                    category: true,
                    vendor: true
                },
                where:{ id }
            });
            console.log('products.vendor: ', products.vendor);
            await emailService.sendEmail(products.vendor?.email ? products.vendor?.email : '', "Product Rejected", `Reason: \n ${reason} `);
            res.status(200).json({ success: true, data: products });
        } catch (error) {
            console.error("Error fetching favorite product:", error);
            res.status(500).json({ success: false, message: "Error fetching favorite product" });
        }
    }

    static async acceptProduct(req: Request, res: Response) {
        try {
            const { id } = req.body;
            const products = await prisma.products.update({
                data:{
                    status: "approved"
                },
                include: { 
                    category: true,
                    vendor: true
                },
                where:{ id }
            });
            res.status(200).json({ success: true, data: products });
        } catch (error) {
            console.error("Error fetching favorite product:", error);
            res.status(500).json({ success: false, message: "Error fetching favorite product" });
        }
    }

    // Add Review
    static async addReview(req: Request, res: Response) {
        try {
            const { userId, productId, rating, comment } = req.body;
            const review = await prisma.reviews.create({
                data: { userId, productId, rating, comment }
            });
            res.status(201).json({ success: true, data: review });
        } catch (error) {
            console.error("Error adding review:", error);
            res.status(500).json({ success: false, message: "Error adding review" });
        }
    }

    static async getProductReviews(req: Request, res: Response) {
        try {
            const { productId } = req.body;
            const review = await prisma.reviews.findMany({
                where: {
                    productId
                }
            });
            res.status(201).json({ success: true, data: review });
        } catch (error) {
            console.error("Error fetching review:", error);
            res.status(500).json({ success: false, message: "Error fetching review" });
        }
    }
}