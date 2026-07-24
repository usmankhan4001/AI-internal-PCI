import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Type, Schema } from '@google/genai';
import { ISkill, SkillContext, SkillTool } from '../interfaces/skill.interface';
import { SkillRegistryService } from '../skill-registry.service';
import { PdfService } from '../../pdf/pdf.service';
import { DriveService } from '../../drive/drive.service';
import { BitrixService } from '../../bitrix/bitrix.service';

import * as docx from 'docx';
import * as ExcelJS from 'exceljs';
import PptxGenJS from 'pptxgenjs';

@Injectable()
export class DocumentGenerationSkill implements ISkill, OnModuleInit {
  private readonly logger = new Logger(DocumentGenerationSkill.name);

  readonly id = 'document_generation';
  readonly name = 'Multi-Format Document & Drive Generation Skill';
  readonly description = 'Generates branded custom documents in PDF, Word (.docx), Excel (.xlsx), PowerPoint (.pptx), and Markdown (.md) formats, and integrates with Google Drive & Bitrix Drive.';

  readonly systemPromptSnippet = `
- **Multi-Format Document Generation**: You can dynamically generate downloadable files for clients or internal staff in various formats:
  - **PDF**: Payment proposals, official contracts, project summary sheets.
  - **Excel (.xlsx)**: Payment schedules, inventory exports, financial breakdowns.
  - **Word (.docx)**: Formal proposal letters, agreements, project specifications.
  - **PowerPoint (.pptx)**: Project pitch slides, executive presentation decks.
  - **Markdown (.md)**: Technical SOPs and knowledge summaries.
- When generating a document, tell the user the file is ready and provide key highlights in your message.
  `.trim();

  constructor(
    private readonly registry: SkillRegistryService,
    private readonly pdfService: PdfService,
    private readonly driveService: DriveService,
    private readonly bitrixService: BitrixService,
  ) {}

  onModuleInit() {
    this.registry.registerSkill(this);
  }

  isEligible(): boolean {
    return true;
  }

  getTools(): SkillTool[] {
    return [
      {
        declaration: {
          name: 'generate_pdf_proposal',
          description: 'Generates a PCI-branded PDF payment proposal for a given unit.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              unitIdOrName: { type: Type.STRING, description: 'Unit ID or Name (e.g., RCY-101)' },
              clientName: { type: Type.STRING, description: 'Client full name' },
              downPaymentPercent: { type: Type.NUMBER, description: 'Down payment percentage (e.g. 15, 20, 25)' },
              installmentMonths: { type: Type.NUMBER, description: 'Plan tenure in months (e.g. 36, 48)' },
            },
            required: ['unitIdOrName', 'clientName'],
          } as Schema,
        },
        handler: async (args, context) => {
          const unit = await this.bitrixService.getNormalizedUnit(args.unitIdOrName);
          const pdfBuffer = await this.pdfService.generatePaymentPlan(args.clientName, {
            name: unit?.name || args.unitIdOrName,
            projectName: unit?.projectName || 'PCI Real Estate',
            type: unit?.typeName || 'Residential',
            floor: unit?.floorName || 'Ground Floor',
            area: unit?.grossArea ? `${unit.grossArea} Sq Ft` : 'Standard',
            totalPrice: unit?.totalPrice || 25000000,
          });

          return {
            status: 'GENERATED',
            format: 'PDF',
            filename: `PCI_Proposal_${unit?.name || args.unitIdOrName}.pdf`,
            fileBuffer: pdfBuffer.toString('base64'),
          };
        },
      },
      {
        declaration: {
          name: 'generate_excel_schedule',
          description: 'Generates an Excel spreadsheet (.xlsx) containing an itemized payment schedule, installment dates, and totals.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: 'Schedule title' },
              clientName: { type: Type.STRING, description: 'Client name' },
              totalPricePkr: { type: Type.NUMBER, description: 'Total property price in PKR' },
              downPaymentPkr: { type: Type.NUMBER, description: 'Down payment amount in PKR' },
              monthlyInstallmentPkr: { type: Type.NUMBER, description: 'Monthly installment amount in PKR' },
              tenureMonths: { type: Type.NUMBER, description: 'Total months (e.g. 36)' },
            },
            required: ['title', 'totalPricePkr', 'tenureMonths'],
          } as Schema,
        },
        handler: async (args) => {
          const workbook = new ExcelJS.Workbook();
          const sheet = workbook.addWorksheet('Payment Schedule');

          // Header Styling
          sheet.columns = [
            { header: 'Installment #', key: 'num', width: 15 },
            { header: 'Due Date', key: 'dueDate', width: 20 },
            { header: 'Payment Type', key: 'type', width: 25 },
            { header: 'Amount (PKR)', key: 'amount', width: 25 },
            { header: 'Remaining Balance (PKR)', key: 'balance', width: 30 },
          ];

          let balance = args.totalPricePkr;
          let currentDate = new Date();

          // Row 1: Down payment
          const downPayment = args.downPaymentPkr || args.totalPricePkr * 0.15;
          balance -= downPayment;
          sheet.addRow({
            num: 0,
            dueDate: currentDate.toISOString().split('T')[0],
            type: 'Down Payment (15%)',
            amount: downPayment,
            balance: balance,
          });

          const monthly = args.monthlyInstallmentPkr || balance / args.tenureMonths;

          for (let i = 1; i <= args.tenureMonths; i++) {
            currentDate.setMonth(currentDate.getMonth() + 1);
            balance -= monthly;
            if (balance < 0) balance = 0;

            sheet.addRow({
              num: i,
              dueDate: currentDate.toISOString().split('T')[0],
              type: `Monthly Installment ${i}`,
              amount: Math.round(monthly),
              balance: Math.round(balance),
            });
          }

          const buffer = await workbook.xlsx.writeBuffer();
          const filename = `PCI_Payment_Schedule_${args.clientName || 'Client'}.xlsx`;

          return {
            status: 'GENERATED',
            format: 'EXCEL',
            filename,
            fileBuffer: Buffer.from(buffer).toString('base64'),
          };
        },
      },
      {
        declaration: {
          name: 'generate_docx_proposal',
          description: 'Generates a formal Microsoft Word (.docx) proposal letter or agreement document.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: 'Document Title' },
              clientName: { type: Type.STRING, description: 'Client Name' },
              projectName: { type: Type.STRING, description: 'PCI Project Name' },
              detailsMarkdown: { type: Type.STRING, description: 'Main proposal body text or terms' },
            },
            required: ['title', 'clientName', 'projectName', 'detailsMarkdown'],
          } as Schema,
        },
        handler: async (args) => {
          const doc = new docx.Document({
            sections: [
              {
                properties: {},
                children: [
                  new docx.Paragraph({
                    text: 'PREMIER CHOICE INTERNATIONAL',
                    heading: docx.HeadingLevel.HEADING_1,
                    alignment: docx.AlignmentType.CENTER,
                  }),
                  new docx.Paragraph({
                    text: args.title,
                    heading: docx.HeadingLevel.HEADING_2,
                    alignment: docx.AlignmentType.CENTER,
                  }),
                  new docx.Paragraph({ text: `Date: ${new Date().toLocaleDateString()}` }),
                  new docx.Paragraph({ text: `Client Name: ${args.clientName}` }),
                  new docx.Paragraph({ text: `Project: ${args.projectName}` }),
                  new docx.Paragraph({ text: '' }), // Spacer
                  new docx.Paragraph({
                    text: 'Proposal Overview & Terms:',
                    heading: docx.HeadingLevel.HEADING_3,
                  }),
                  new docx.Paragraph({
                    text: args.detailsMarkdown.replace(/[*#_]/g, ''),
                  }),
                  new docx.Paragraph({ text: '' }),
                  new docx.Paragraph({
                    text: 'Thank you for choosing Premier Choice International.',
                    alignment: docx.AlignmentType.CENTER,
                  }),
                ],
              },
            ],
          });

          const buffer = await docx.Packer.toBuffer(doc);
          const filename = `PCI_Proposal_${args.projectName.replace(/\s+/g, '_')}.docx`;

          return {
            status: 'GENERATED',
            format: 'DOCX',
            filename,
            fileBuffer: buffer.toString('base64'),
          };
        },
      },
      {
        declaration: {
          name: 'generate_pptx_slides',
          description: 'Generates a Microsoft PowerPoint (.pptx) presentation deck for a PCI project or property offer.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: 'Presentation Title (e.g., Grand Orchard Overview)' },
              subtitle: { type: Type.STRING, description: 'Presentation Subtitle' },
              highlights: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Bullet point highlights' },
            },
            required: ['title', 'highlights'],
          } as Schema,
        },
        handler: async (args) => {
          const pptx = new PptxGenJS();
          pptx.layout = 'LAYOUT_16x9';

          // Slide 1: Title Slide
          const slide1 = pptx.addSlide();
          slide1.background = { color: '1E293B' }; // Dark Slate Blue
          slide1.addText('PREMIER CHOICE INTERNATIONAL', {
            x: 1.0,
            y: 1.5,
            fontSize: 24,
            bold: true,
            color: '38BDF8',
          });
          slide1.addText(args.title, {
            x: 1.0,
            y: 2.5,
            fontSize: 36,
            bold: true,
            color: 'FFFFFF',
          });
          if (args.subtitle) {
            slide1.addText(args.subtitle, {
              x: 1.0,
              y: 3.5,
              fontSize: 20,
              color: '94A3B8',
            });
          }

          // Slide 2: Key Highlights
          const slide2 = pptx.addSlide();
          slide2.addText('Key Project Features & Highlights', {
            x: 0.8,
            y: 0.8,
            fontSize: 28,
            bold: true,
            color: '0F172A',
          });

          const bulletItems = args.highlights.map((h: string) => ({ text: h, options: { bullet: true, fontSize: 18 } }));
          slide2.addText(bulletItems, {
            x: 0.8,
            y: 1.8,
            w: 8.5,
            h: 4.5,
            color: '334155',
          });

          const base64Data = (await pptx.write({ outputType: 'base64' })) as string;
          const filename = `PCI_Presentation_${args.title.replace(/\s+/g, '_')}.pptx`;

          return {
            status: 'GENERATED',
            format: 'PPTX',
            filename,
            fileBuffer: base64Data,
          };
        },
      },
    ];
  }
}
