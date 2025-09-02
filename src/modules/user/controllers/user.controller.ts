import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserService } from '../services/user.service';
import { FileUploadService } from '../../file-upload/services/file-upload.service';
import {
  UpdateUserProfileDto,
  UpdateUserPreferencesDto,
  UpdateUserStatusDto,
  UserProfileResponseDto,
  UserListResponseDto,
  UserFilterDto,
  UserStatsDto,
  UserNotificationSettingsDto,
} from '../dto/user.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../../entities/user.entity';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async findAll(@Query() filter: UserFilterDto): Promise<UserListResponseDto> {
    return this.userService.findAll(filter);
  }

  @Get('search')
  async searchUsers(
    @Query('q') query: string,
    @Query('limit') limit: number = 10,
  ): Promise<UserProfileResponseDto[]> {
    return this.userService.searchUsers(query, limit);
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getStats(): Promise<UserStatsDto> {
    return this.userService.getStats();
  }

  @Get('me')
  async getProfile(@Request() req): Promise<UserProfileResponseDto> {
    return this.userService.findOne(req.user.id);
  }

  @Get('me/notification-settings')
  async getNotificationSettings(
    @Request() req,
  ): Promise<UserNotificationSettingsDto> {
    return this.userService.getNotificationSettings(req.user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<UserProfileResponseDto> {
    return this.userService.findOne(id);
  }

  @Patch('me/profile')
  async updateProfile(
    @Request() req,
    @Body() updateUserProfileDto: UpdateUserProfileDto,
  ): Promise<UserProfileResponseDto> {
    return this.userService.updateProfile(req.user.id, updateUserProfileDto);
  }

  @Patch('me/preferences')
  async updatePreferences(
    @Request() req,
    @Body() updateUserPreferencesDto: UpdateUserPreferencesDto,
  ): Promise<UserProfileResponseDto> {
    return this.userService.updatePreferences(
      req.user.id,
      updateUserPreferencesDto,
    );
  }

  @Patch('me/notification-settings')
  async updateNotificationSettings(
    @Request() req,
    @Body() settings: UserNotificationSettingsDto,
  ): Promise<UserNotificationSettingsDto> {
    return this.userService.updateNotificationSettings(req.user.id, settings);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateUserStatusDto,
  ): Promise<UserProfileResponseDto> {
    return this.userService.updateStatus(id, updateStatusDto);
  }

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  async uploadAvatar(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UserProfileResponseDto> {
    if (!file) {
      throw new Error('No avatar file uploaded');
    }

    // Check if it's an image
    if (!file.mimetype.startsWith('image/')) {
      throw new Error('Only image files are allowed for avatar');
    }

    // Upload avatar with specific transformations
    const result = await this.fileUploadService.uploadSingleFile(
      {
        fieldname: file.fieldname,
        originalname: file.originalname,
        encoding: file.encoding,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer,
      },
      `users/${req.user.id}/avatar`,
      {
        width: 200,
        height: 200,
        crop: 'fill',
        gravity: 'face',
        quality: 'auto',
        format: 'jpg',
      },
    );

    if (!result.data?.secure_url) {
      throw new Error('Failed to upload avatar');
    }

    return this.userService.uploadAvatar(req.user.id, result.data.secure_url);
  }

  @Delete('me/avatar')
  async removeAvatar(@Request() req): Promise<UserProfileResponseDto> {
    return this.userService.removeAvatar(req.user.id);
  }

  @Post('me/activity')
  @HttpCode(HttpStatus.OK)
  async updateActivity(@Request() req): Promise<{ message: string }> {
    await this.userService.updateLastActive(req.user.id);
    return { message: 'Activity updated' };
  }

  @Post('me/deactivate')
  @HttpCode(HttpStatus.OK)
  async deactivateAccount(@Request() req): Promise<{ message: string }> {
    return this.userService.deactivateAccount(req.user.id);
  }

  @Post('me/reactivate')
  @HttpCode(HttpStatus.OK)
  async reactivateAccount(@Request() req): Promise<{ message: string }> {
    return this.userService.reactivateAccount(req.user.id);
  }
}
