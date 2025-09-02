import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileUploadService } from '../services/file-upload.service';

// Example controller showing how to use FileUploadService in your application
@Controller('user-profile')
export class UserProfileController {
  constructor(private readonly fileUploadService: FileUploadService) {}

  @Post('avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Body('userId') userId: string,
  ) {
    if (!file) {
      throw new BadRequestException('No avatar file uploaded');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed for avatar');
    }

    // Upload with specific transformations for avatar
    const result = await this.fileUploadService.uploadSingleFile(
      {
        fieldname: file.fieldname,
        originalname: file.originalname,
        encoding: file.encoding,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer,
      },
      `users/${userId}/avatar`, // Organize by user ID
      {
        width: 200,
        height: 200,
        crop: 'fill',
        gravity: 'face',
        quality: 'auto',
        format: 'jpg',
      },
    );

    // Here you would typically save the avatar URL to your user database
    // await this.userService.updateAvatar(userId, result.data.secure_url);

    return {
      message: 'Avatar uploaded successfully',
      avatarUrl: result.data?.secure_url,
      publicId: result.data?.public_id,
    };
  }

  @Post('cover-photo')
  @UseInterceptors(FileInterceptor('coverPhoto'))
  async uploadCoverPhoto(
    @UploadedFile() file: Express.Multer.File,
    @Body('userId') userId: string,
  ) {
    if (!file) {
      throw new BadRequestException('No cover photo uploaded');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed for cover photo');
    }

    // Upload with specific transformations for cover photo
    const result = await this.fileUploadService.uploadSingleFile(
      {
        fieldname: file.fieldname,
        originalname: file.originalname,
        encoding: file.encoding,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer,
      },
      `users/${userId}/cover`, // Organize by user ID
      {
        width: 1200,
        height: 400,
        crop: 'fill',
        quality: 'auto',
        format: 'jpg',
      },
    );

    return {
      message: 'Cover photo uploaded successfully',
      coverPhotoUrl: result.data?.secure_url,
      publicId: result.data?.public_id,
    };
  }

  @Post('documents')
  @UseInterceptors(FileInterceptor('document'))
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body('userId') userId: string,
    @Body('documentType') documentType: string,
  ) {
    if (!file) {
      throw new BadRequestException('No document uploaded');
    }

    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only PDF and Word documents are allowed');
    }

    const result = await this.fileUploadService.uploadSingleFile(
      {
        fieldname: file.fieldname,
        originalname: file.originalname,
        encoding: file.encoding,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer,
      },
      `users/${userId}/documents/${documentType}`,
    );

    return {
      message: 'Document uploaded successfully',
      documentUrl: result.data?.secure_url,
      publicId: result.data?.public_id,
      documentType,
    };
  }
}
