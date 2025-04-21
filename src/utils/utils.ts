import puppeteer from "puppeteer";
import { UAParser } from 'ua-parser-js';

export class Utils {
    static getExtension(mimetype: string): string | null {
        console.log('mimetype: ', mimetype);
        switch (mimetype) {
            case 'image/jpeg':
                return '.jpg';
            case 'image/png':
                return '.png';
            case 'image/gif':
                return '.gif';
            case 'image/webp':
                return '.webp';
            case 'video/mp4':
                return '.mp4';
            case 'video/wav':
                return '.wav';
            case 'application/pdf':
                return '.pdf';
            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                return '.docx';
            case 'text/plain':
                return '.txt';
            case 'application/vnd.ms-excel':
                return '.xls';
            case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
                return '.xlsx';
            case 'application/x-rar-compressed':
            case 'application/vnd.rar':
                return '.rar';
            case 'application/zip':
            case 'application/x-zip-compressed':
                return '.zip';
            default:
                return '';
        }
    }

    static genrateRandomNumber = () => {
        let minm = 10000;
        let maxm = 99999;
        return Math.floor(Math.random() * (maxm - minm + 1)) + minm;
    };

    static generateInvoiceHTML = async(invoiceData: any) => {
        console.log('invoiceData: ', invoiceData);
        const {
            customer,
            order_items,
            transactionId,
            payment,
            createdAt,
            totalPrice,
            discountAmount,
            id,
            vendor_profile
        } = invoiceData;
        let html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invoice #${id}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    background-color: #f4f6f9;
                    color: #333;
                    display: flex;
                    justify-content: center;
                    min-height: 100vh;
                    margin: 0;
                }
                .container {
                    width: 100%;
                    padding: 30px;
                }
                .invoice-footer {
                    text-align: center;
                    margin-top: 20px;
                }
                .invoice-wrapper p {
                    margin: 16px 0;
                    line-height: 1.3;
                }
                .invoice-wrapper h2, .invoice-wrapper h3 {
                    color: #024042;
                    margin-top: 0;
                }
                .invoice-detail-box {
                    text-align: left;
                    background-color: #f4f6f9;
                    margin-bottom: 16px;
                    border-radius: 8px;
                }
                .invoice-detail-box h3 {
                    padding-bottom: 10px;
                    border-bottom: 1px solid #d3d3d3;
                    font-size: 18px;
                }
                .booking-deatis-table-wrap {
                    overflow-x: auto;
                }
                .booking-deatis-table-wrap-inner {
                    border-radius: 8px;
                    border: 1px solid #d3d3d3;
                    overflow-x: auto;
                }
                .bookings-details-table {
                    min-width: 500px;
                }
                .bookings-details-table .booking-headings {
                    display: flex;
                    font-weight: bold;
                }
                .bookings-details-table .booking-heading-1 {
                    background-color: #024042;
                    color: #fff;
                }
                .bookings-details-table .booking-headings span,
                .booking-service span {
                    flex: 1;
                    padding: 10px;
                    border-right: 1px solid #d3d3d3;
                }
                    .booking-service-wrap {
                    border-bottom: 1px solid #d3d3d3;
                }
                .bookings-details-table .booking-headings span:last-child,
                .booking-service span:last-child {
                    border-right: none;
                }
                .booking-service {
                    display: flex;
                }
                .invoice-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 10px;
                }
                .invoice-header .logo img {
                    height: 90px;
                }
                .customer-info p {
                    margin: 10px 0;
                }
                .total {
                    text-align: right;
                    font-size: 18px;
                    color: #024042;
                    font-weight: 700;
                }
            </style>
            </head>
            <body>
            <div class="container invoice-wrapper">
                <div class="invoice-header">
                    <div class="customer-info">
                        <h2>Invoice #${id}</h2>
                        <p><strong>Name:</strong> ${customer.firstName == null && customer.lastName == null ? customer.username : customer.firstName + ' ' + customer.last_name }</p>
                        <p><strong>Email:</strong> ${customer.email}</p>
                    </div>
                    <div class="logo">
                        <img src="${`http://localhost:5173/logo.png`}" alt="Company Logo">
                    </div>
                </div>
    
                <div class="invoice-detail-box">
                    <h3>Store Information</h3>
                    <p><strong>Owner Name: </strong>${vendor_profile.vendorFullName}</p>
                    <p><strong>Address: </strong>${vendor_profile.storeLocation}</p>
                </div>
    
                <div class="invoice-detail-box">
                    <h3>Order Details</h3>
                    <div class="booking-deatis-table-wrap">
                        <div class="booking-deatis-table-wrap-inner">
                            <div class="bookings-details-table">
                                <div class="booking-headings booking-heading-1">
                                    <span class="cell">Product</span>
                                    <span class="cell">Quantity</span>
                                    <span class="cell">Price</span>
                                    <span class="cell">Total</span></div>`;
    
                order_items.forEach((item: any) => {
                    html += `
                    <div class="booking-headings">
                        <span class="cell">${item.product.titleEn}</span>
                        <span class="cell">${item.quantity}</span>
                        <span class="cell">${item.product.price}</span>
                        <span class="cell">₹${item.total}</span>
                    </div>`;
                });
    
                html += `
                            </div>
                        </div>
                    </div>
                </div>
    
                <div class="invoice-detail-box">
                    <h3>Payment Information</h3>
                    <p><strong>Order ID:</strong> ${payment.stripeId || "-"}</p>
                    <p><strong>Transaction ID:</strong> ${transactionId || "-"}</p>
                    <p><strong>Payment Method:</strong> ${payment.paymentMethod || "-"}</p>
                    <p><strong>Payment Date:</strong> ${createdAt || "-"}</p>
                    <p><strong>Discount Amount:</strong> ₹${discountAmount || "0"}</p>
                    <p><strong>Total Amount:</strong> ₹${totalPrice || "0"}</p>
                </div>
    
                <div class="invoice-footer">
                    <p>Thank you for purchase with ${vendor_profile.storeName}. We look forward to serving you again.</p>
                </div>
            </div>
            </body>
            </html>`;
        return html;
    };

    static generateInvoicePDF = async (invoiceHTML: any, outputPath: any) => {
        try {
            // Launch Puppeteer browser instance
            // const browser = await puppeteer.launch();
            const browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-software-rasterizer', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();

            // Set the content of the page to the HTML generated
            await page.setContent(invoiceHTML, {
                waitUntil: 'networkidle0',
            });

            // Optional: You can set the page size (e.g., A4 size)
            const options: any = {
                path: outputPath,  // Where the PDF will be saved
                format: 'A4',      // Set the page size to A4
                printBackground: true,
                scale: 0.9,// Include background graphics in the PDF
                // margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' } // Adjust margins if needed
            };

            // Generate the PDF
            await page.pdf(options);
            console.log('PDF generated successfully!');

            // Close the browser instance
            await browser.close();
            return true;
        } catch (error) {
            console.error('Error generating PDF:', error);
        }
    };

    // utils/parseUserAgent.ts
    static parseUserAgent(userAgent: string) {
      const parser = new UAParser(userAgent);
      const result = parser.getResult();
    
      return {
        device: result.device.type || 'desktop', // mobile, tablet, or desktop
        os: result.os.name || 'unknown',
        browser: result.browser.name || 'unknown',
      };
    }
}