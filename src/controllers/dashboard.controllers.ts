import { NextFunction, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import axios from 'axios';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-01-27.acacia" });

export class DashboardController {

    static async getOwnerDashData(req: any, res: Response): Promise<void> {
        try {
            // Get Vendor Profile
            const vendor = await prisma.vendor_profiles.findFirst({
                where: { userId: req.user.id }
            });
    
            if (!vendor) {
                res.status(404).json({ success: false, message: "Vendor not found" });
                return;
            }
    
            const vendorId = vendor.id;
            const currentYear = new Date().getFullYear(); // Default to the current year
            const selectedYear = Number(req.query.year) || currentYear; // Allow selecting a different year via query param
    
            // Fetch Orders Data (including customer and payment details)
            const orders = await prisma.orders.findMany({
                where: { vendorId },
                include: {
                    order_items: true,
                    payment: true,
                    customer: true
                },
                orderBy: {
                    createdAt: 'desc' // Sort by most recent orders
                }
            });

            // Total Orders
            const totalOrders = orders.length;

            // Fetch Orders for Monthly Breakdown
            const ordersByMonth = Array.from({ length: 12 }, (_, i) => ({
                month: i + 1,
                totalOrders: 0
            }));

            // Iterate through orders to fill ordersByMonth
            orders.forEach(order => {
                const orderMonth = new Date(order.createdAt).getMonth(); // Get month (0-11)
                const orderYear = new Date(order.createdAt).getFullYear(); // Get year (e.g. 2025)

                // Check if the order's year matches the selected year
                if (orderYear === selectedYear) {
                    ordersByMonth[orderMonth].totalOrders += 1;
                }
            });

            // Ensure all 12 months are included in the response
            const formattedOrdersByMonth = ordersByMonth.map(item => ({
                month: item.month,
                totalOrders: item.totalOrders
            }));
    
            // Total Revenue
            const totalRevenue = orders.reduce((acc, order) => acc + order.totalPrice, 0);

            // Total Products
            const totalProducts: any = await prisma.products.count({
                where:{
                    vendorId: vendorId
                }
            })
            
            // Fetch reviews for the popular products
            const products = await prisma.products.findMany({
                where: {
                  vendorId: vendorId // Ensure this is the correct vendor ID
                }
              });
              
            // Step 2: Extract product IDs
            const productIds = products.map(product => product.id);
            
            // Step 3: Fetch all reviews related to these products
            const reviews = await prisma.reviews.findMany({
            where: {
                productId: { in: productIds } // This will fetch all reviews for the vendor's products
            }
            });

            const totalRatings = reviews.reduce((acc, review) => acc + review.rating, 0);
            const averageRating = totalRatings / reviews.length;

            // 2. Calculate the average of each rating (e.g., how many 5s, 4s, etc.)
            // const ratingCounts = reviews.reduce((acc: any, review: any) => {
            // acc[review.rating] = (acc[review.rating] || 0) + 1;
            // return acc;
            // }, {});
            // Initialize the rating counts for all ratings from 1 to 5
            const ratingCounts = reviews.reduce((acc: any, review: any) => {
                // Ensure each rating (1-5) exists in the accumulator
                if (!acc[review.rating]) acc[review.rating] = 0;
            
                // Count the occurrences of each rating
                acc[review.rating] += 1;
                return acc;
            }, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }); // Initialize with all ratings set to 0
    
            // Average Order Value (AOV)
            const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
            // Repeat Purchase Rate
            const customerOrders: Record<number, number> = {};
            orders.forEach(order => {
                customerOrders[order.customerId] = (customerOrders[order.customerId] || 0) + 1;
            });
            // const repeatPurchaseCustomers = Object.values(customerOrders).filter(count => count > 1).length;
            // const repeatPurchaseRate = totalOrders > 0 ? (repeatPurchaseCustomers / Object.keys(customerOrders).length) * 100 : 0;
    
            // Earnings By Month Query (Trend)
            
            const earningsByMonth: any = await prisma.$queryRaw`
                SELECT 
                EXTRACT(MONTH FROM "createdAt") AS month,
                COALESCE(SUM(amount), 0) AS totalEarnings
                FROM payments
                WHERE "vendorId" = ${vendorId}
                AND status = 'paid'
                AND EXTRACT(YEAR FROM "createdAt") = ${selectedYear}
                GROUP BY month
                ORDER BY month ASC;
            `;

            // Ensure all 12 months are included for the trend, even if no earnings for a particular month
            const earningsByMonthMap = earningsByMonth.reduce((acc: any, e: any) => {
                acc[parseInt(e.month)] = e.totalearnings; // Convert month to number to avoid string comparison
                return acc;
            }, {});
            
            const formattedEarnings = Array.from({ length: 12 }, (_, i) => {
                return earningsByMonthMap[i + 1] || 0
            });

            const currentWeek = DashboardController.getCurrentWeek(new Date()); // Get the current week number
            const selectedWeek = Number(req.query.week) || currentWeek; // Allow selecting a different week via query param

            // Query for earnings by day in the current week
            const earningsByDay: any = await prisma.$queryRaw`
            SELECT 
            EXTRACT(DAY FROM "createdAt") AS day,
            COALESCE(SUM(amount), 0) AS totalEarnings
            FROM payments
            WHERE "vendorId" = ${vendorId}
            AND status = 'paid'
            AND EXTRACT(WEEK FROM "createdAt") = ${selectedWeek}
            AND EXTRACT(YEAR FROM "createdAt") = ${currentYear}
            GROUP BY day
            ORDER BY day ASC;
            `;
            console.log('earningsByDay: ', earningsByDay);

            // Ensure all 7 days are included for the current week, even if no earnings for a particular day
            const earningsByDayMap = earningsByDay.reduce((acc: any, e: any) => {
                acc[parseInt(e.day)] = e.totalearnings;
                return acc;
            }, {});
            console.log('earningsByDayMap: ', earningsByDayMap);

            const currentDate = new Date();
            const currentMonth = currentDate.getMonth() + 1;
            const currentDayOfWeek = currentDate.getDay();
            
            const daysInCurrentWeek = Array.from({ length: 7 }, (_, i) => {
                const dayOffset = i - currentDayOfWeek; // Offset from today to get the specific day in the current week
                const date = new Date(currentDate);
                date.setDate(date.getDate() + dayOffset);  // Adjust the date for the current week
                return date.getDate();  // Get the day of the month for that specific day of the week
            });
            
            // Map the earnings by day of the month
            const formattedEarningsDay = earningsByDay.reduce((acc: any, e: any) => {
                // Find the day of the week for the current day of the month
                const date = new Date(currentYear, currentMonth - 1, e.day);  // Assuming currentYear and currentMonth are available
                const dayOfWeek = date.getDay();  // Get the day of the week (0-6)
            
                acc[dayOfWeek] = e.totalearnings;
                return acc;
            }, {0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0});
            const formattedEarningsDayData = Object.values(earningsByDayMap);
    
            // Orders Trend (Total Orders per Month)
            // const ordersByMonth = Array.from({ length: 12 }, (_, i) => ({
            //     month: i + 1,
            //     totalOrders: orders.filter(order => new Date(order.createdAt).getMonth() === i).length
            // }));
    
            // Fetch Popular Products (Top 5 Most Ordered)
            const popularProducts = await prisma.order_items.groupBy({
                by: ['productId'],
                _sum: {
                    quantity: true
                },
                where: {
                    vendorId: vendorId
                },
                orderBy: {
                    _sum: {
                        quantity: 'desc'
                    }
                },
                take: 5
            });
    
            // Fetch products for popular product details
            const popularProductIds = popularProducts.map(item => item.productId);
            const productDetails = await prisma.products.findMany({
                where: {
                    id: { in: popularProductIds },
                },
                include:{
                    category: true
                }
            });
    
            const popularProductsData = popularProducts.map(item => {
                const product = productDetails.find(p => p.id === item.productId);
                return {
                    productId: item.productId,
                    nameEn: product ? product.titleEn : 'Unknown Product',
                    nameSp: product ? product.titleSp : 'Unknown Product',
                    image: product ? product.featuredImage : '',
                    categoryEn: product ? product.category.nameEn : '',
                    categorySp: product ? product.category.nameSp : '',
                    quantitySold: item._sum.quantity,
                    date: product ? product.createdAt : '',
                    price: product ? product.price : '',
                    status: product ? product.status : '',
                };
            });
    
            // Fetch Recent 5 Orders
            const recentOrders = await prisma.orders.findMany({
                where: { vendorId },
                include: {
                    order_items: {
                        include:{
                            product: true
                        }
                    },
                    payment: true
                },
                orderBy: {
                    createdAt: 'desc'
                },
                take: 5
            });
    
            // Fetch Top 5 Customers (Highest Spend)
            const topCustomers = await prisma.orders.groupBy({
                by: ['customerId'],
                _sum: {
                    totalPrice: true
                },
                where: {
                    vendorId: vendorId
                },
                orderBy: {
                    _sum: {
                        totalPrice: 'desc'
                    }
                },
                take: 5
            });
    
            // Fetch customer details for top customers
            const topCustomerIds = topCustomers.map(customer => customer.customerId);
            const customerDetails = await prisma.users.findMany({
                where: {
                    id: { in: topCustomerIds }
                }
            });
    
            const topCustomersData = topCustomers.map(customer => {
                const customerInfo = customerDetails.find(u => u.id === customer.customerId);
                return {
                    customerId: customer.customerId,
                    customerName: customerInfo ? `${customerInfo.firstName} ${customerInfo.lastName}` : 'Unknown Customer',
                    customerEmail: customerInfo ? `${customerInfo.email}` : 'Unknown Customer',
                    customerUsername: customerInfo ? `${customerInfo.username}` : 'Unknown Customer',
                    totalSpent: customer._sum.totalPrice
                };
            });
    
            // Calculate Trends with Comparison (Placeholder for previous period)
            const previousRevenue = 45000; // Example: Revenue of the previous period (e.g., last year or last month)
            // const previousRepeatPurchaseRate = 18.5; // Example: Previous repeat purchase rate
            const previousAOV = 400; // Example: Previous Average Order Value
            const previousCustomers = 100; // Example: Previous new customers count

            const formatPercentage = (currentValue: number, previousValue: number): number => {
                const change = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0;
                return change < 0 ? 0 : parseFloat(change.toFixed(2)); // Set negative values to 0
            }

            const trends = [
                {
                    trend: totalRevenue >= previousRevenue ? 'up' : 'down',
                    title: 'Revenue',
                    amount: `${totalRevenue.toLocaleString()}`,
                    percentage: formatPercentage(totalRevenue, previousRevenue),
                    showCurrency: true
                },
                {
                    trend: totalProducts >= totalProducts ? 'up' : 'down',
                    title: 'Total Products',
                    amount: `${totalProducts}`,
                    percentage: formatPercentage(totalProducts, totalProducts),
                    showCurrency: false
                },
                {
                    trend: averageOrderValue >= previousAOV ? 'up' : 'down',
                    title: 'Average Order Value',
                    amount: `${averageOrderValue.toFixed(2)}`,
                    percentage: formatPercentage(averageOrderValue, previousAOV),
                    showCurrency: true
                },
                {
                    trend: totalOrders >= previousCustomers ? 'up' : 'down',
                    title: 'New Customers',
                    amount: totalOrders,  // Use `totalOrders` here or another variable for new customers
                    percentage: formatPercentage(totalOrders, previousCustomers),
                    showCurrency: false
                }
            ];

            const allOrders = await prisma.orders.findMany({
                where: { vendorId },
                include: {
                    order_items: true,
                    payment: true,
                    customer: true
                },
                orderBy: {
                    createdAt: 'desc' // Sort by most recent orders
                }
            });
    
            // Fetch all distinct years in which orders were placed
            const orderYears = Array.from(
                new Set(allOrders.map(order => new Date(order.createdAt).getFullYear()))
            ).sort((a, b) => b - a);

            // Response Data
            res.status(200).json({
                success: true,
                data: {
                    totalOrders,
                    totalRevenue,
                    averageOrderValue,
                    // repeatPurchaseRate,
                    earningsByMonth: formattedEarnings, // Trend data for earnings
                    ordersByMonth: ordersByMonth, // Trend data for orders
                    popularProducts: popularProductsData,
                    recentOrders,
                    topCustomers: topCustomersData,
                    trends, // Include trend data
                    ratingCounts,
                    averageRating,
                    totalRattings: reviews.length,
                    orderYears,
                    earningsByDay: formattedEarningsDayData,
                }
            });
    
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
            res.status(500).json({ success: false, message: "Error fetching dashboard data" });
        }
    }

    // Helper function to get the current week number
    static getCurrentWeek(date: Date): number {
        const startDate = new Date(date.getFullYear(), 0, 1);
        const diff = (date.getTime() - startDate.getTime()) + ((startDate.getDay() - 1) * 86400000);
        return Math.ceil(diff / 604800000); // 604800000 ms in a week
    }
    

    static async getAdminDashData(req: any, res: Response): Promise<void> {
        try {
            const currentYear = new Date().getFullYear(); // Default to the current year
            const selectedYear = Number(req.query.year) || currentYear; // Allow selecting a different year via query param
    
            // Fetch Orders Data (including customer and payment details)
            const orders = await prisma.orders.findMany({
                include: {
                    order_items: true,
                    payment: true,
                    customer: true,
                    vendor: true
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });
    
            // Total Orders
            const totalOrders = orders.length;
    
            // Total Revenue
            const totalRevenue = orders.reduce((acc, order) => acc + order.totalPrice, 0);
    
            // Total Users
            const totalUsers = await prisma.users.count();
    
            // Total Vendors (distinct vendorId from orders)
            const totalVendors = await prisma.vendor_profiles.aggregate({
                _count: {
                    id: true
                }
            }).then(result => result._count.id);
            
            const totalVisitors = await prisma.visitor.count();

            // Product Status Count (pending, approved, disabled)
            const productStatusCount = await prisma.products.groupBy({
                by: ['status'],
                _count: true
            });
    
            const productStatus = {
                pending: productStatusCount.find(item => item.status === 'pending')?._count || 0,
                approved: productStatusCount.find(item => item.status === 'approved')?._count || 0,
                disabled: productStatusCount.find(item => item.status === 'disabled')?._count || 0,
                rejected: productStatusCount.find(item => item.status === 'rejected')?._count || 0,
            };

            const topProducts = await prisma.order_items.groupBy({
                by: ['productId'],
                _sum: {
                  quantity: true,
                },
                orderBy: {
                  _sum: {
                    quantity: 'desc',
                  },
                },
                take: 5,
              });
              
              const topProductIds = topProducts.map(item => item.productId);
              
              const productDetails = await prisma.products.findMany({
                where: {
                  id: { in: topProductIds },
                },
                include: {
                  category: true,  // Include category details
                },
              });
              
            // Map the top products with their details
            const topProductsData = topProducts.map(item => {
            const product = productDetails.find(p => p.id === item.productId);
            return {
                productId: item.productId,
                nameEn: product ? product.titleEn : 'Unknown Product',
                nameSp: product ? product.titleSp : 'Unknown Product',
                image: product ? product.featuredImage : '',
                categoryEn: product ? product.category.nameEn : '',
                categorySp: product ? product.category.nameSp : '',
                quantitySold: item._sum.quantity,
                price: product ? product.price : 0,
                status: product ? product.status : '',
            };
            });
              
           
            const userCounts = Array(12).fill(0);
            const vendorCounts = Array(12).fill(0);

            // Fetch users and vendors created in the selected year
            const users = await prisma.users.findMany({
                where: {
                    createdAt: {
                        gte: new Date(`${selectedYear}-01-01T00:00:00.000Z`),
                        lt: new Date(`${selectedYear + 1}-01-01T00:00:00.000Z`),
                    },
                },
                select: { createdAt: true },
            });

            const vendors = await prisma.vendor_profiles.findMany({
                where: {
                    createdAt: {
                        gte: new Date(`${selectedYear}-01-01T00:00:00.000Z`),
                        lt: new Date(`${selectedYear + 1}-01-01T00:00:00.000Z`),
                    },
                },
                select: { createdAt: true },
            });

            // Count users by month
            users.forEach(user => {
                const month = new Date(user.createdAt).getMonth();
                userCounts[month] += 1;
            });

            // Count vendors by month
            vendors.forEach(vendor => {
                const month = new Date(vendor.createdAt).getMonth();
                vendorCounts[month] += 1;
            });

    
            // Top 5 Vendors by Order Amount
            const topVendors = await prisma.orders.groupBy({
                by: ['vendorId'],
                _sum: {
                    totalPrice: true
                },
                where: {
                    vendorId: { not: null }
                },
                orderBy: {
                    _sum: {
                        totalPrice: 'desc'
                    }
                },
                take: 5
            });
    
    
            const topVendorIds: any = topVendors.map(item => item.vendorId);
            const vendorDetails = await prisma.vendor_profiles.findMany({
                where: {
                    id: { in: topVendorIds }
                }
            });

            const orderDetails = await prisma.orders.findMany({
                where: {
                    vendorId: { in: topVendorIds }
                },
                select: {
                    vendorId: true,
                    totalPrice: true,
                    order_items:{
                        select:{
                            quantity: true
                        }
                    }
                }
            });

            const topVendorsData = topVendors.map(item => {
                const vendorInfo = vendorDetails.find(v => v.id === item.vendorId);
                
                // Filter orders for the current vendor
                const vendorOrders = orderDetails.filter(order => order.vendorId === item.vendorId);
                
                // Calculate total sales amount for the vendor
                const totalSalesAmount = vendorOrders.reduce((sum, order) => sum + order.totalPrice, 0);
                
                // Calculate total quantity sold for the vendor by summing quantities from order_items
                const totalQuantitySold = vendorOrders.reduce((sum, order) => {
                    // Sum quantities from all order items for this order
                    const orderQuantity = order.order_items.reduce((itemSum, item) => itemSum + item.quantity, 0);
                    return sum + orderQuantity;
                }, 0);
                
                return {
                    vendorName: vendorInfo ? vendorInfo.vendorFullName : 'Unknown Vendor',
                    totalSalesAmount: totalSalesAmount,
                    totalQuantitySold: totalQuantitySold
                };
            });
            
            // Top 5 Customers by Order Amount
            const topCustomers = await prisma.orders.groupBy({
                by: ['customerId'],
                _sum: {
                    totalPrice: true
                },
                orderBy: {
                    _sum: {
                        totalPrice: 'desc'
                    }
                },
                take: 5
            });
    
            // Fetch customer details for top customers
            const topCustomerIds = topCustomers.map(customer => customer.customerId);
            const customerDetails = await prisma.users.findMany({
                where: {
                    id: { in: topCustomerIds }
                }
            });
    
            const topCustomersData = topCustomers.map(customer => {
                const customerInfo = customerDetails.find(u => u.id === customer.customerId);
                return {
                    customerId: customer.customerId,
                    customerName: customerInfo ? `${customerInfo.firstName} ${customerInfo.lastName}` : 'Unknown Customer',
                    totalSpent: customer._sum.totalPrice
                };
            });
    
            // Response Data
            res.status(200).json({
                success: true,
                data: {
                    totalOrders,
                    totalRevenue,
                    totalUsers,
                    totalVendors,
                    totalVisitors,
                    productStatus,
                    monthlyUserCount: userCounts, 
                    monthlyVendorCount: vendorCounts,
                    topVendors: topVendorsData,
                    topCustomers: topCustomersData,
                    topProducts: topProductsData
                }
            });
    
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
            res.status(500).json({ success: false, message: "Error fetching dashboard data" });
        }
    }
    

}
