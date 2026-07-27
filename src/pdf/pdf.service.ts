import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  async generatePaymentPlan(leadName: string, unitDetails: any): Promise<Buffer> {
    this.logger.log(`Generating high-end PCI payment proposal PDF for ${leadName}`);

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 Size
    const { width, height } = page.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const primaryColor = rgb(0.08, 0.18, 0.36); // PCI Corporate Navy
    const goldColor = rgb(0.85, 0.65, 0.13); // Accent Gold
    const darkGray = rgb(0.2, 0.2, 0.2);
    const lightGray = rgb(0.95, 0.96, 0.98);

    // Header Background Card
    page.drawRectangle({
      x: 0,
      y: height - 110,
      width: width,
      height: 110,
      color: primaryColor,
    });

    // Gold Accent Stripe
    page.drawRectangle({
      x: 0,
      y: height - 114,
      width: width,
      height: 4,
      color: goldColor,
    });

    // Header Title Text
    page.drawText('PREMIER CHOICE INTERNATIONAL', {
      x: 40,
      y: height - 55,
      size: 22,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    page.drawText('OFFICIAL PAYMENT PLAN PROPOSAL', {
      x: 40,
      y: height - 80,
      size: 13,
      font,
      color: rgb(0.85, 0.9, 0.98),
    });

    let yPos = height - 150;

    // Client Info Box
    page.drawRectangle({
      x: 40,
      y: yPos - 35,
      width: width - 80,
      height: 45,
      color: lightGray,
      borderColor: rgb(0.85, 0.85, 0.9),
      borderWidth: 1,
    });

    page.drawText(`Prepared For: ${leadName}`, {
      x: 55,
      y: yPos - 15,
      size: 13,
      font: fontBold,
      color: primaryColor,
    });

    page.drawText(`Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, {
      x: width - 200,
      y: yPos - 15,
      size: 11,
      font,
      color: darkGray,
    });

    yPos -= 70;

    // Unit Specifications Section Header
    page.drawText('PROPERTY SPECIFICATIONS', {
      x: 40,
      y: yPos,
      size: 14,
      font: fontBold,
      color: primaryColor,
    });

    yPos -= 10;
    page.drawLine({
      start: { x: 40, y: yPos },
      end: { x: width - 40, y: yPos },
      thickness: 1,
      color: goldColor,
    });

    yPos -= 25;

    // Unit Detail Grid Table
    const details = [
      ['Project Name:', String(unitDetails.projectName || 'PCI Project')],
      ['Unit ID / Name:', String(unitDetails.name || 'Standard Unit')],
      ['Property Type:', String(unitDetails.type || 'Residential')],
      ['Floor Level:', String(unitDetails.floor || 'Standard Floor')],
      ['Gross / Net Area:', String(unitDetails.area || 'Standard Sq Ft')],
    ];

    for (const [label, val] of details) {
      page.drawText(label, { x: 50, y: yPos, size: 11, font: fontBold, color: darkGray });
      page.drawText(val, { x: 220, y: yPos, size: 11, font, color: darkGray });
      yPos -= 22;
    }

    yPos -= 20;

    // Financial Schedule Section Header
    page.drawText('FINANCIAL BREAKDOWN & INSTALLMENTS', {
      x: 40,
      y: yPos,
      size: 14,
      font: fontBold,
      color: primaryColor,
    });

    yPos -= 10;
    page.drawLine({
      start: { x: 40, y: yPos },
      end: { x: width - 40, y: yPos },
      thickness: 1,
      color: goldColor,
    });

    yPos -= 30;

    const totalPrice = Number(unitDetails.totalPrice) || 25000000;
    const downPayment = totalPrice * 0.15;
    const possessionFee = totalPrice * 0.10;
    const remainingBalance = totalPrice - downPayment - possessionFee;
    const monthlyInstallment = remainingBalance / 36;

    const formatCurrency = (val: number) =>
      `PKR ${Math.round(val).toLocaleString('en-US')}`;

    // Financial Table Header
    page.drawRectangle({
      x: 40,
      y: yPos - 5,
      width: width - 80,
      height: 25,
      color: primaryColor,
    });

    page.drawText('Payment Component', { x: 55, y: yPos, size: 11, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('Percentage / Details', { x: 260, y: yPos, size: 11, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('Amount (PKR)', { x: 430, y: yPos, size: 11, font: fontBold, color: rgb(1, 1, 1) });

    yPos -= 25;

    const scheduleRows = [
      ['Total Property Price', '100%', formatCurrency(totalPrice)],
      ['Upfront Down Payment', '15%', formatCurrency(downPayment)],
      ['36 Monthly Installments', '36 Months', `${formatCurrency(monthlyInstallment)} / mo`],
      ['Possession Payment', '10% on handover', formatCurrency(possessionFee)],
    ];

    for (const [comp, pct, amt] of scheduleRows) {
      page.drawRectangle({
        x: 40,
        y: yPos - 5,
        width: width - 80,
        height: 22,
        color: lightGray,
        borderColor: rgb(0.9, 0.9, 0.9),
        borderWidth: 0.5,
      });

      page.drawText(comp, { x: 55, y: yPos, size: 10, font: fontBold, color: darkGray });
      page.drawText(pct, { x: 260, y: yPos, size: 10, font, color: darkGray });
      page.drawText(amt, { x: 430, y: yPos, size: 10, font: fontBold, color: primaryColor });
      yPos -= 22;
    }

    yPos -= 40;

    // Disclaimer Notice
    page.drawText('* Note: This is an official automated proposal subject to final management verification and unit booking approval.', {
      x: 40,
      y: yPos,
      size: 9,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Footer
    page.drawRectangle({
      x: 0,
      y: 0,
      width: width,
      height: 35,
      color: primaryColor,
    });

    page.drawText('Premier Choice International • www.premierchoiceint.com • Tel: +92 51 111 000 724', {
      x: width / 2 - 210,
      y: 12,
      size: 9,
      font,
      color: rgb(0.9, 0.9, 0.95),
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }
}
