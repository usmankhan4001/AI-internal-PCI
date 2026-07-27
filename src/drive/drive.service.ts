import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { google, drive_v3 } from 'googleapis';
import { KnowledgeService } from '../knowledge/knowledge.service';

@Injectable()
export class DriveService {
  private readonly logger = new Logger(DriveService.name);
  private drive: drive_v3.Drive | null = null;

  constructor(private readonly knowledgeService: KnowledgeService) {
    this.initDriveClient();
  }

  private initDriveClient() {
    try {
      const credentialsString = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
      if (!credentialsString) {
        this.logger.warn('GOOGLE_SERVICE_ACCOUNT_JSON is not set. Drive integration is disabled.');
        return;
      }

      const credentials = JSON.parse(credentialsString);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      });

      this.drive = google.drive({ version: 'v3', auth });
      this.logger.log('Google Drive client initialized successfully.');
    } catch (error) {
      this.logger.error(`Failed to initialize Google Drive client: ${(error as Error).message}`);
    }
  }

  get isConfigured(): boolean {
    return !!this.drive;
  }

  private ensureDrive() {
    if (!this.drive) {
      throw new HttpException('Google Drive integration is not configured', HttpStatus.SERVICE_UNAVAILABLE);
    }
    return this.drive;
  }

  async listFolders() {
    const drive = this.ensureDrive();
    try {
      const res = await drive.files.list({
        q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
        fields: 'files(id, name)',
        orderBy: 'name',
        pageSize: 100,
      });
      return res.data.files || [];
    } catch (error) {
      this.logger.error('Error listing folders', error);
      throw new HttpException('Failed to list folders', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async listFilesInFolder(folderId: string) {
    const drive = this.ensureDrive();
    try {
      const sanitizedFolderId = folderId.replace(/'/g, "\\'");
      const res = await drive.files.list({
        q: `'${sanitizedFolderId}' in parents and trashed=false`,
        fields: 'files(id, name, mimeType, size)',
        orderBy: 'name',
        pageSize: 100,
      });
      return res.data.files || [];
    } catch (error) {
      this.logger.error('Error listing files', error);
      throw new HttpException('Failed to list files', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async searchFiles(term: string) {
    const drive = this.ensureDrive();
    try {
      const sanitizedTerm = term.replace(/'/g, "\\'");
      const res = await drive.files.list({
        q: `name contains '${sanitizedTerm}' and trashed=false`,
        fields: 'files(id, name, mimeType, size, parents)',
        pageSize: 50,
      });
      return res.data.files || [];
    } catch (error) {
      this.logger.error(`Error searching Drive files for '${term}'`, error);
      return [];
    }
  }

  async downloadFileBuffer(fileId: string): Promise<{ buffer: Buffer; filename: string; mimeType: string; size: number }> {
    const drive = this.ensureDrive();
    try {
      const fileMeta = await drive.files.get({ fileId, fields: 'id, name, mimeType, size' });
      const filename = fileMeta.data.name || 'document.pdf';
      const mimeType = fileMeta.data.mimeType || 'application/pdf';

      const response = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'arraybuffer' }
      );

      const buffer = Buffer.from(response.data as ArrayBuffer);
      return {
        buffer,
        filename,
        mimeType,
        size: buffer.length,
      };
    } catch (error: any) {
      this.logger.error(`Error downloading file ${fileId} from Drive: ${error.message}`);
      throw error;
    }
  }

  async syncFile(
    fileId: string,
    filename: string,
    department: string,
    category: string,
    project: string,
  ) {
    try {
      const { buffer, mimeType } = await this.downloadFileBuffer(fileId);

      const mockFile = {
        originalname: filename,
        mimetype: mimeType,
        buffer,
        size: buffer.length,
      } as Express.Multer.File;

      const result = await this.knowledgeService.ingestFile(mockFile, department, category, project);

      return {
        message: 'File synced and ingested successfully',
        result,
      };
    } catch (error) {
      this.logger.error(`Error syncing file ${fileId}`, error);
      throw new HttpException('Failed to sync file from Drive', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
