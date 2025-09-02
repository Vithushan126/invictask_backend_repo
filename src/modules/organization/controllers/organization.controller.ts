import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OrganizationService } from '../services/organization.service';
import { FileUploadService } from '../../file-upload/services/file-upload.service';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  InviteMemberDto,
  UpdateMemberRoleDto,
  AcceptInvitationDto,
  OrganizationResponseDto,
  OrganizationMemberResponseDto,
  OrganizationStatsDto,
} from '../dto/organization.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../../entities/user.entity';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationController {
  constructor(
    private readonly organizationService: OrganizationService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createOrganizationDto: CreateOrganizationDto,
    @Request() req,
  ): Promise<OrganizationResponseDto> {
    return this.organizationService.create(createOrganizationDto, req.user.id);
  }

  @Get('my-organizations')
  async findUserOrganizations(
    @Request() req,
  ): Promise<OrganizationResponseDto[]> {
    return this.organizationService.findUserOrganizations(req.user.id);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Request() req,
  ): Promise<OrganizationResponseDto> {
    return this.organizationService.findOne(id, req.user.id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
    @Request() req,
  ): Promise<OrganizationResponseDto> {
    return this.organizationService.update(
      id,
      updateOrganizationDto,
      req.user.id,
    );
  }

  @Post(':id/invite')
  async inviteMember(
    @Param('id') id: string,
    @Body() inviteMemberDto: InviteMemberDto,
    @Request() req,
  ) {
    return this.organizationService.inviteMember(
      id,
      inviteMemberDto,
      req.user.id,
    );
  }

  @Post('accept-invitation')
  async acceptInvitation(
    @Body() acceptInvitationDto: AcceptInvitationDto,
    @Request() req,
  ): Promise<{ message: string }> {
    return this.organizationService.acceptInvitation(
      acceptInvitationDto.token,
      req.user.id,
    );
  }

  @Get(':id/members')
  async getMembers(
    @Param('id') id: string,
    @Request() req,
  ): Promise<OrganizationMemberResponseDto[]> {
    return this.organizationService.getMembers(id, req.user.id);
  }

  @Patch(':id/members/:memberId')
  async updateMemberRole(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() updateMemberRoleDto: UpdateMemberRoleDto,
    @Request() req,
  ): Promise<OrganizationMemberResponseDto> {
    return this.organizationService.updateMemberRole(
      id,
      memberId,
      updateMemberRoleDto,
      req.user.id,
    );
  }

  @Delete(':id/members/:memberId')
  async removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Request() req,
  ): Promise<{ message: string }> {
    return this.organizationService.removeMember(id, memberId, req.user.id);
  }

  @Get(':id/stats')
  async getStats(
    @Param('id') id: string,
    @Request() req,
  ): Promise<OrganizationStatsDto> {
    return this.organizationService.getStats(id, req.user.id);
  }

  @Post(':id/logo')
  @UseInterceptors(FileInterceptor('logo'))
  async uploadLogo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ): Promise<{ logoUrl: string; message: string }> {
    if (!file) {
      throw new Error('No logo file uploaded');
    }

    // Check if it's an image
    if (!file.mimetype.startsWith('image/')) {
      throw new Error('Only image files are allowed for organization logo');
    }

    // Upload logo with specific transformations
    const result = await this.fileUploadService.uploadSingleFile(
      {
        fieldname: file.fieldname,
        originalname: file.originalname,
        encoding: file.encoding,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer,
      },
      `organizations/${id}/logo`,
      {
        width: 200,
        height: 200,
        crop: 'fill',
        quality: 'auto',
        format: 'png',
      },
    );

    if (!result.data?.secure_url) {
      throw new Error('Failed to upload logo');
    }

    // Update organization with new logo URL
    await this.organizationService.update(
      id,
      { logo: result.data.secure_url },
      req.user.id,
    );

    return {
      logoUrl: result.data.secure_url,
      message: 'Organization logo uploaded successfully',
    };
  }

  @Delete(':id/logo')
  async removeLogo(
    @Param('id') id: string,
    @Request() req,
  ): Promise<{ message: string }> {
    await this.organizationService.update(id, { logo: null }, req.user.id);
    return { message: 'Organization logo removed successfully' };
  }
}
