import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  /**
   * Generates a basic Payment Plan PDF dynamically using pdf-lib.
   * Later, this can be swapped out to load a pre-designed template and stamp over it.
   */
  async generatePaymentPlan(leadName: string, unitDetails: any): Promise<Buffer> {
    this.logger.log(`Generating payment plan PDF for ${leadName}`);

    // Create a new PDFDocument
    const pdfDoc = await PDFDocument.create();
    
    // Add a blank page (A4 size)
    const page = pdfDoc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();

    // Embed fonts
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // PCI Branding Header
    page.drawRectangle({
      x: 0,
      y: height - 100,
      width: width,
      height: 100,
      color: rgb(0.1, 0.2, 0.4), // Dark blue
    });

    page.drawText('PREMIER CHOICE INTERNATIONAL', {
      x: 50,
      y: height - 60,
      size: 24,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    page.drawText('Payment Plan Proposal', {
      x: 50,
      y: height - 80,
      size: 14,
      font,
      color: rgb(0.8, 0.8, 0.8),
    });

    // Customer & Unit Details
    let yPos = height - 150;
    
    page.drawText(`Prepared for: ${leadName}`, { x: 50, y: yPos, size: 14, font: fontBold, color: rgb(0, 0, 0) });
    yPos -= 40;

    page.drawText('Unit Details:', { x: 50, y: yPos, size: 16, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
    yPos -= 25;
    page.drawText(`Project: ${unitDetails.projectName}`, { x: 50, y: yPos, size: 12, font });
    yPos -= 20;
    page.drawText(`Unit: ${unitDetails.name} (${unitDetails.type})`, { x: 50, y: yPos, size: 12, font });
    yPos -= 20;
    page.drawText(`Floor: ${unitDetails.floor}`, { x: 50, y: yPos, size: 12, font });
    yPos -= 20;
    page.drawText(`Area: ${unitDetails.area}`, { x: 50, y: yPos, size: 12, font });
    yPos -= 40;

    // Pricing & Payment Plan
    const totalPrice = parseFloat(unitDetails.totalPrice) || 0;
    const downpayment = totalPrice * 0.30;
    const remaining = totalPrice - downpayment;
    const installments = remaining / 36; // Example 3 year plan

    const formatCurrency = (val: number) => `PKR ${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

    page.drawText('Pricing Summary:', { x: 50, y: yPos, size: 16, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
    yPos -= 25;
    page.drawText(`Total Price: ${formatCurrency(totalPrice)}`, { x: 50, y: yPos, size: 14, font: fontBold });
    yPos -= 20;
    page.drawText(`30% Downpayment: ${formatCurrency(downpayment)}`, { x: 50, y: yPos, size: 12, font });
    yPos -= 20;
    page.drawText(`36 Monthly Installments: ${formatCurrency(installments)}`, { x: 50, y: yPos, size: 12, font });
    
    // Disclaimer
    yPos -= 60;
    page.drawText('* This is a system generated proposal and subject to management approval.', { 
      x: 50, y: yPos, size: 10, font, color: rgb(0.5, 0.5, 0.5) 
    });

    // Footer
    page.drawRectangle({
      x: 0,
      y: 0,
      width: width,
      height: 40,
      color: rgb(0.9, 0.9, 0.9),
    });
    page.drawText('PCI WhatsApp Bot - Automated Delivery', {
      x: width / 2 - 100,
      y: 15,
      size: 10,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });

    // Serialize to Buffer
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }
}
