import {
  Controller,
  Post,
  Delete,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Body,
  Param,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { FileUploadService } from '../services/file-upload.service';
import {
  FileUploadResponseDto,
  MultipleFileUploadResponseDto,
} from '../dto/file-upload.dto';

@Controller('file-upload')
export class FileUploadController {
  constructor(private readonly fileUploadService: FileUploadService) {}

  @Post('single')
  @UseInterceptors(FileInterceptor('file'))
  async uploadSingleFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
    @Body('transformation') transformation?: string,
  ): Promise<FileUploadResponseDto> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    let parsedTransformation;
    if (transformation) {
      try {
        parsedTransformation = JSON.parse(transformation);
      } catch (error) {
        throw new BadRequestException('Invalid transformation format');
      }
    }

    return this.fileUploadService.uploadSingleFile(
      {
        fieldname: file.fieldname,
        originalname: file.originalname,
        encoding: file.encoding,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer,
      },
      folder,
      parsedTransformation,
    );
  }

  @Post('multiple')
  @UseInterceptors(FilesInterceptor('files', 10)) // Max 10 files
  async uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Query('folder') folder?: string,
    @Body('transformation') transformation?: string,
  ): Promise<MultipleFileUploadResponseDto> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    let parsedTransformation;
    if (transformation) {
      try {
        parsedTransformation = JSON.parse(transformation);
      } catch (error) {
        throw new BadRequestException('Invalid transformation format');
      }
    }

    const fileUploadDtos = files.map((file) => ({
      fieldname: file.fieldname,
      originalname: file.originalname,
      encoding: file.encoding,
      mimetype: file.mimetype,
      size: file.size,
      buffer: file.buffer,
    }));

    return this.fileUploadService.uploadMultipleFiles(
      fileUploadDtos,
      folder,
      parsedTransformation,
    );
  }

  @Post('image')
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
    @Query('width') width?: string,
    @Query('height') height?: string,
    @Query('quality') quality?: string,
  ): Promise<FileUploadResponseDto> {
    if (!file) {
      throw new BadRequestException('No image uploaded');
    }

    // Check if it's an image
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed');
    }

    // Build transformation object
    const transformation: any = {};
    if (width) transformation.width = parseInt(width);
    if (height) transformation.height = parseInt(height);
    if (quality) transformation.quality = quality;

    return this.fileUploadService.uploadSingleFile(
      {
        fieldname: file.fieldname,
        originalname: file.originalname,
        encoding: file.encoding,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer,
      },
      folder || 'images',
      Object.keys(transformation).length > 0 ? transformation : undefined,
    );
  }

  @Post('video')
  @UseInterceptors(FileInterceptor('video'))
  async uploadVideo(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
  ): Promise<FileUploadResponseDto> {
    if (!file) {
      throw new BadRequestException('No video uploaded');
    }

    // Check if it's a video
    if (!file.mimetype.startsWith('video/')) {
      throw new BadRequestException('Only video files are allowed');
    }

    return this.fileUploadService.uploadSingleFile(
      {
        fieldname: file.fieldname,
        originalname: file.originalname,
        encoding: file.encoding,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer,
      },
      folder || 'videos',
    );
  }

  @Post('document')
  @UseInterceptors(FileInterceptor('document'))
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
  ): Promise<FileUploadResponseDto> {
    if (!file) {
      throw new BadRequestException('No document uploaded');
    }

    // Check if it's a document
    const allowedDocTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowedDocTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only PDF and Word documents are allowed');
    }

    return this.fileUploadService.uploadSingleFile(
      {
        fieldname: file.fieldname,
        originalname: file.originalname,
        encoding: file.encoding,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer,
      },
      folder || 'documents',
    );
  }
  
  @Delete()
  async deleteFile(@Query('publicId') publicId: string) {
    if (!publicId) throw new BadRequestException('publicId is required');
    return this.fileUploadService.deleteFile(publicId);
  }
}
