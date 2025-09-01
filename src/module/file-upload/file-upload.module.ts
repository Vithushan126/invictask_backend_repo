import { Module } from '@nestjs/common';
import { FileUploadController } from './controllers/file-upload.controller';
import { FileUploadService } from './services/file-upload.service';
import { CloudinaryConfig } from './config/cloudinary.config';

@Module({
  controllers: [FileUploadController],
  providers: [FileUploadService, CloudinaryConfig],
  exports: [FileUploadService, CloudinaryConfig],
})
export class FileUploadModule {}
