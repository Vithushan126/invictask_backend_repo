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
  Request,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../../entities/user.entity';
import { WorkspaceService } from '../services/workspace.service';
import {
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  InviteWorkspaceMemberDto,
  UpdateMemberRoleDto,
  WorkspaceResponseDto,
  WorkspaceMemberResponseDto,
  WorkspaceInvitationResponseDto,
  WorkspaceStatsDto,
  WorkspaceFilterDto,
  AcceptWorkspaceInvitationDto,
} from '../dto/workspace.dto';

@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ transform: true }))
  async create(
    @Body() createWorkspaceDto: CreateWorkspaceDto,
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Request() req: any,
  ): Promise<WorkspaceResponseDto> {
    return this.workspaceService.create(createWorkspaceDto, req.user.id, organizationId);
  }

  @Get('my-workspaces')
  async findUserWorkspaces(
    @Query() filter: WorkspaceFilterDto,
    @Request() req: any,
  ): Promise<{ workspaces: WorkspaceResponseDto[]; total: number; page: number; limit: number }> {
    const result = await this.workspaceService.findUserWorkspaces(req.user.id, filter);
    return {
      ...result,
      page: filter.page || 1,
      limit: filter.limit || 20,
    };
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<WorkspaceResponseDto> {
    return this.workspaceService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @UsePipes(new ValidationPipe({ transform: true }))
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateWorkspaceDto: UpdateWorkspaceDto,
    @Request() req: any,
  ): Promise<WorkspaceResponseDto> {
    return this.workspaceService.update(id, updateWorkspaceDto, req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<void> {
    return this.workspaceService.remove(id, req.user.id);
  }

  @Post(':id/invite')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ transform: true }))
  async inviteMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() inviteMemberDto: InviteWorkspaceMemberDto,
    @Request() req: any,
  ): Promise<WorkspaceInvitationResponseDto> {
    return this.workspaceService.inviteMember(id, inviteMemberDto, req.user.id);
  }

  @Post('accept-invitation')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  async acceptInvitation(
    @Body() acceptInvitationDto: AcceptWorkspaceInvitationDto,
    @Request() req: any,
  ): Promise<{ message: string }> {
    return this.workspaceService.acceptInvitation(acceptInvitationDto.token, req.user.id);
  }

  @Get(':id/members')
  async getMembers(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<WorkspaceMemberResponseDto[]> {
    return this.workspaceService.getMembers(id, req.user.id);
  }

  @Patch(':id/members/:memberId')
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateMemberRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() updateMemberRoleDto: UpdateMemberRoleDto,
    @Request() req: any,
  ): Promise<WorkspaceMemberResponseDto> {
    return this.workspaceService.updateMemberRole(id, memberId, updateMemberRoleDto, req.user.id);
  }

  @Delete(':id/members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Request() req: any,
  ): Promise<void> {
    return this.workspaceService.removeMember(id, memberId, req.user.id);
  }

  @Get(':id/stats')
  async getStats(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<WorkspaceStatsDto> {
    return this.workspaceService.getStats(id, req.user.id);
  }

  @Get(':id/invitations')
  async getInvitations(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<WorkspaceInvitationResponseDto[]> {
    return this.workspaceService.getInvitations(id, req.user.id);
  }

  @Delete(':id/invitations/:invitationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelInvitation(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
    @Request() req: any,
  ): Promise<void> {
    return this.workspaceService.cancelInvitation(id, invitationId, req.user.id);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  async archive(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    return this.workspaceService.archive(id, req.user.id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  async restore(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    return this.workspaceService.restore(id, req.user.id);
  }

  @Post(':id/duplicate')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ transform: true }))
  async duplicate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() duplicateDto: { name: string; includeMembers?: boolean },
    @Request() req: any,
  ): Promise<WorkspaceResponseDto> {
    return this.workspaceService.duplicate(id, duplicateDto, req.user.id);
  }

  @Get(':id/activity')
  async getActivity(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Request() req: any,
  ): Promise<{ activities: any[]; total: number; page: number; limit: number }> {
    return this.workspaceService.getActivity(id, req.user.id, { page, limit });
  }

  @Post(':id/leave')
  @HttpCode(HttpStatus.OK)
  async leave(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    return this.workspaceService.leave(id, req.user.id);
  }

  @Get(':id/templates')
  async getTemplates(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<any[]> {
    return this.workspaceService.getTemplates(id, req.user.id);
  }

  @Post(':id/templates')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ transform: true }))
  async createTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() templateDto: any,
    @Request() req: any,
  ): Promise<any> {
    return this.workspaceService.createTemplate(id, templateDto, req.user.id);
  }

  // SUPER_ADMIN only endpoints
  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  async findAll(
    @Query() filter: WorkspaceFilterDto,
  ): Promise<{ workspaces: WorkspaceResponseDto[]; total: number; page: number; limit: number }> {
    const result = await this.workspaceService.findAll(filter);
    return {
      ...result,
      page: filter.page || 1,
      limit: filter.limit || 20,
    };
  }

  @Patch(':id/force-update')
  @Roles(UserRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async forceUpdate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateWorkspaceDto: UpdateWorkspaceDto,
  ): Promise<WorkspaceResponseDto> {
    return this.workspaceService.forceUpdate(id, updateWorkspaceDto);
  }
}
