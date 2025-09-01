import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { CloudinaryConfig } from '../config/cloudinary.config';
import { 
  FileUploadDto, 
  FileUploadResponseDto, 
  MultipleFileUploadResponseDto,
  CloudinaryUploadResponseDto 
} from '../dto/file-upload.dto';

@Injectable()
export class FileUploadService {
  constructor(private readonly cloudinaryConfig: CloudinaryConfig) {}

  private readonly allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  private readonly allowedVideoTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv'];
  private readonly allowedDocumentTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB

  async uploadSingleFile(
    file: FileUploadDto, 
    folder?: string,
    transformation?: any
  ): Promise<FileUploadResponseDto> {
    try {
      // Validate file
      this.validateFile(file);

      const cloudinary = this.cloudinaryConfig.getCloudinary();
      
      // Determine resource type
      const resourceType = this.getResourceType(file.mimetype);
      
      // Upload options
      const uploadOptions: any = {
        resource_type: resourceType,
        folder: folder || 'uploads',
        use_filename: true,
        unique_filename: true,
      };

      // Add transformation if provided (mainly for images)
      if (transformation && resourceType === 'image') {
        uploadOptions.transformation = transformation;
      }

      // Upload to Cloudinary
      const result: CloudinaryUploadResponseDto = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result as CloudinaryUploadResponseDto);
            }
          }
        ).end(file.buffer);
      });

      return {
        success: true,
        message: 'File uploaded successfully',
        data: {
          url: result.url,
          secure_url: result.secure_url,
          public_id: result.public_id,
          format: result.format,
          resource_type: result.resource_type,
          bytes: result.bytes,
          width: result.width,
          height: result.height,
          original_filename: file.originalname,
        },
      };
    } catch (error) {
      throw new InternalServerErrorException({
        success: false,
        message: 'Failed to upload file',
        error: error.message,
      });
    }
  }

  async uploadMultipleFiles(
    files: FileUploadDto[], 
    folder?: string,
    transformation?: any
  ): Promise<MultipleFileUploadResponseDto> {
    const uploaded: FileUploadResponseDto['data'][] = [];
    const failed: { filename: string; error: string }[] = [];

    for (const file of files) {
      try {
        const result = await this.uploadSingleFile(file, folder, transformation);
        if (result.data) {
          uploaded.push(result.data);
        }
      } catch (error) {
        failed.push({
          filename: file.originalname,
          error: error.message,
        });
      }
    }

    return {
      success: uploaded.length > 0,
      message: `${uploaded.length} files uploaded successfully, ${failed.length} failed`,
      data: {
        uploaded,
        failed,
      },
    };
  }

  async deleteFile(publicId: string): Promise<{ success: boolean; message: string }> {
    try {
      const cloudinary = this.cloudinaryConfig.getCloudinary();
      const result = await cloudinary.uploader.destroy(publicId);
      
      return {
        success: result.result === 'ok',
        message: result.result === 'ok' ? 'File deleted successfully' : 'Failed to delete file',
      };
    } catch (error) {
      throw new InternalServerErrorException({
        success: false,
        message: 'Failed to delete file',
        error: error.message,
      });
    }
  }

  private validateFile(file: FileUploadDto): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(`File size exceeds maximum limit of ${this.maxFileSize / (1024 * 1024)}MB`);
    }

    const allAllowedTypes = [
      ...this.allowedImageTypes,
      ...this.allowedVideoTypes,
      ...this.allowedDocumentTypes,
    ];

    if (!allAllowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} is not allowed`);
    }
  }

  private getResourceType(mimetype: string): 'image' | 'video' | 'raw' {
    if (this.allowedImageTypes.includes(mimetype)) {
      return 'image';
    }
    if (this.allowedVideoTypes.includes(mimetype)) {
      return 'video';
    }
    return 'raw';
  }

  // Utility method to get file info without uploading
  getFileInfo(file: FileUploadDto) {
    return {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      resourceType: this.getResourceType(file.mimetype),
    };
  }
}
