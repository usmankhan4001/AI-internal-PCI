import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly storageDir = path.join(process.cwd(), 'storage', 'assets');

  onModuleInit() {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
      this.logger.log(`Created asset storage directory: ${this.storageDir}`);
    }
  }

  saveAsset(filename: string, buffer: Buffer): { filepath: string; filename: string; size: number } {
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const targetPath = path.join(this.storageDir, sanitizedFilename);

    fs.writeFileSync(targetPath, buffer);
    this.logger.log(`Saved cached asset: ${sanitizedFilename} (${buffer.length} bytes)`);

    return {
      filepath: targetPath,
      filename: sanitizedFilename,
      size: buffer.length,
    };
  }

  getCachedAsset(filename: string): Buffer | null {
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const targetPath = path.join(this.storageDir, sanitizedFilename);

    if (fs.existsSync(targetPath)) {
      this.logger.log(`Cache hit for asset: ${sanitizedFilename}`);
      return fs.readFileSync(targetPath);
    }

    return null;
  }

  getFileHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }
}
