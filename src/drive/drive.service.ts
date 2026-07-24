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
      // List PDF, Word, CSV, TXT files
      const res = await drive.files.list({
        q: `'${folderId}' in parents and trashed=false and (mimeType='application/pdf' or mimeType='application/vnd.openxmlformats-officedocument.wordprocessingml.document' or mimeType='text/csv' or mimeType='text/plain')`,
        fields: 'files(id, name, mimeType)',
        orderBy: 'name',
      });
      return res.data.files || [];
    } catch (error) {
      this.logger.error('Error listing files', error);
      throw new HttpException('Failed to list files', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async syncFile(
    fileId: string,
    filename: string,
    department: string,
    category: string,
    project: string,
  ) {
    const drive = this.ensureDrive();
    try {
      // 1. Get file metadata for mimeType
      const fileMeta = await drive.files.get({ fileId, fields: 'mimeType' });
      const mimeType = fileMeta.data.mimeType || 'application/octet-stream';

      // 2. Download the file
      const response = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'arraybuffer' }
      );
      
      const downloadedBuffer = Buffer.from(response.data as ArrayBuffer);

      // 3. Create mock Multer file to pass to KnowledgeService
      const mockFile = {
        originalname: filename,
        mimetype: mimeType,
        buffer: downloadedBuffer,
        size: downloadedBuffer.length,
      } as Express.Multer.File;

      // 4. Ingest via KnowledgeService
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
