import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Type, Schema } from '@google/genai';
import { ISkill, SkillContext, SkillTool } from '../interfaces/skill.interface';
import { SkillRegistryService } from '../skill-registry.service';
import { DriveService } from '../../drive/drive.service';
import { StorageService } from '../../storage/storage.service';

const MAX_WHATSAPP_DIRECT_SIZE_BYTES = 16 * 1024 * 1024; // 16 MB WhatsApp direct attachment limit

@Injectable()
export class DriveAssetDeliverySkill implements ISkill, OnModuleInit {
  private readonly logger = new Logger(DriveAssetDeliverySkill.name);

  readonly id = 'live_drive_asset_delivery';
  readonly name = 'Live Drive Asset & Media Delivery Skill';
  readonly description = 'Searches and delivers real layout maps, brochures, video walkthroughs, PPTX decks, and payment spreadsheets directly from Google Drive and storage to WhatsApp users.';

  readonly systemPromptSnippet = `
- **Live Asset Delivery**: When a user asks for an actual brochure, floor layout map image, video tour, or pitch deck for a project (e.g. Buraq Heights, River Courtyard, Grand Orchard, Box Park 3):
  1. First call \`search_live_drive_assets\` to find matching real files.
  2. Then call \`fetch_and_send_drive_asset\` with the file ID or path to send the file directly to the user's WhatsApp chat.
  `.trim();

  constructor(
    private readonly registry: SkillRegistryService,
    private readonly driveService: DriveService,
    private readonly storageService: StorageService,
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
          name: 'search_live_drive_assets',
          description: 'Searches Google Drive for actual project files: layout plans, high-res brochure PDFs, MP4 video tours, or PPTX presentation decks.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              projectName: { type: Type.STRING, description: 'Project name (e.g., Buraq Heights, River Courtyard, Grand Orchard, Box Park 3)' },
              assetType: { type: Type.STRING, description: 'Asset category: Layout_Plans, Brochures, Payment_Plans, Presentations, Media_Videos' },
              searchTerm: { type: Type.STRING, description: 'Optional specific file term (e.g. 2Bed, Penthouse, Layout, Video)' },
            },
            required: ['projectName'],
          } as Schema,
        },
        handler: async (args) => {
          this.logger.log(`Searching live Drive assets for project [${args.projectName}], type [${args.assetType || 'ALL'}]`);

          if (!this.driveService.isConfigured) {
            return {
              status: 'DRIVE_DISABLED',
              message: 'Google Drive integration is currently unconfigured. Local generated document tools remain active.',
            };
          }

          const query = `${args.projectName} ${args.searchTerm || ''}`.trim();
          const files = await this.driveService.searchFiles(query);

          return {
            projectName: args.projectName,
            matchCount: files.length,
            assets: files.map((f: any) => ({
              fileId: f.id,
              filename: f.name,
              mimeType: f.mimeType,
              sizeBytes: f.size ? Number(f.size) : null,
            })),
          };
        },
      },
      {
        declaration: {
          name: 'fetch_and_send_drive_asset',
          description: 'Downloads a real file from Google Drive and sends it live to the WhatsApp user.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              fileId: { type: Type.STRING, description: 'Google Drive File ID returned from search_live_drive_assets' },
              filename: { type: Type.STRING, description: 'Filename for the attachment' },
              caption: { type: Type.STRING, description: 'Brief accompanying text caption for the WhatsApp message' },
            },
            required: ['fileId', 'filename'],
          } as Schema,
        },
        handler: async (args) => {
          this.logger.log(`Fetching Drive file [${args.fileId}] for live WhatsApp dispatch`);

          if (!this.driveService.isConfigured) {
            return { error: 'Google Drive is not configured.' };
          }

          // Check if file is already in local disk cache
          let fileBuffer = this.storageService.getCachedAsset(args.filename);

          if (!fileBuffer) {
            const downloaded = await this.driveService.downloadFileBuffer(args.fileId);
            fileBuffer = downloaded.buffer;
            this.storageService.saveAsset(args.filename, fileBuffer);
          }

          const sizeBytes = fileBuffer.length;

          if (sizeBytes > MAX_WHATSAPP_DIRECT_SIZE_BYTES) {
            return {
              status: 'LARGE_FILE_LINK',
              filename: args.filename,
              sizeMB: (sizeBytes / (1024 * 1024)).toFixed(1),
              message: `The file '${args.filename}' exceeds the 16MB direct WhatsApp media limit. Provide the user with a direct download link or summary.`,
            };
          }

          return {
            status: 'READY_TO_SEND',
            filename: args.filename,
            fileBuffer: fileBuffer.toString('base64'),
            caption: args.caption || `Here is your requested document: ${args.filename}`,
          };
        },
      },
    ];
  }
}
