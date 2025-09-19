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
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SpaceService } from '../services/space.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../../entities/user.entity';
import {
  CreateSpaceDto,
  UpdateSpaceDto,
  SpaceResponseDto,
  SpaceListDto,
  SpaceSearchDto,
  SpaceStatsDto,
  InviteSpaceMemberDto,
  UpdateSpaceMemberDto,
  SpaceMemberDto,
  BulkSpaceActionDto,
} from '../dto/space.dto';

@Controller('spaces')
@UseGuards(JwtAuthGuard)
export class SpaceController {
  constructor(private readonly spaceService: SpaceService) {}

  // ==================== SPACE CRUD ====================

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createSpaceDto: CreateSpaceDto,
    @Request() req,
  ): Promise<SpaceResponseDto> {
    return this.spaceService.create(createSpaceDto, req.user.id);
  }

  @Get()
  async findAll(
    @Query() query: SpaceSearchDto,
    @Request() req,
  ): Promise<SpaceListDto> {
    return this.spaceService.findAll(query, req.user.id);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Request() req,
  ): Promise<SpaceResponseDto> {
    return this.spaceService.findOne(id, req.user.id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateSpaceDto: UpdateSpaceDto,
    @Request() req,
  ): Promise<SpaceResponseDto> {
    return this.spaceService.update(id, updateSpaceDto, req.user.id);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Request() req,
  ): Promise<{ message: string }> {
    return this.spaceService.remove(id, req.user.id);
  }

  // ==================== SPACE MEMBERS ====================

  @Get(':id/members')
  async getMembers(
    @Param('id') id: string,
    @Request() req,
  ): Promise<SpaceMemberDto[]> {
    return this.spaceService.getMembers(id, req.user.id);
  }

  @Post(':id/members/invite')
  async inviteMember(
    @Param('id') id: string,
    @Body() inviteDto: InviteSpaceMemberDto,
    @Request() req,
  ): Promise<{ message: string }> {
    return this.spaceService.inviteMember(id, inviteDto, req.user.id);
  }

  @Patch(':id/members/:memberId')
  async updateMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() updateDto: UpdateSpaceMemberDto,
    @Request() req,
  ): Promise<SpaceMemberDto> {
    return this.spaceService.updateMember(id, memberId, updateDto, req.user.id);
  }

  @Delete(':id/members/:memberId')
  async removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Request() req,
  ): Promise<{ message: string }> {
    return this.spaceService.removeMember(id, memberId, req.user.id);
  }

  // ==================== SPACE STATISTICS ====================

  @Get(':id/stats')
  async getStats(
    @Param('id') id: string,
    @Request() req,
  ): Promise<SpaceStatsDto> {
    return this.spaceService.getStats(id, req.user.id);
  }

  // ==================== SPACE ACTIONS ====================

  @Post(':id/archive')
  async archive(
    @Param('id') id: string,
    @Request() req,
  ): Promise<{ message: string }> {
    return this.spaceService.archive(id, req.user.id);
  }

  @Post(':id/restore')
  async restore(
    @Param('id') id: string,
    @Request() req,
  ): Promise<{ message: string }> {
    return this.spaceService.restore(id, req.user.id);
  }

  @Post('bulk-actions')
  async bulkActions(
    @Body() bulkDto: BulkSpaceActionDto,
    @Request() req,
  ): Promise<{ message: string; processed: number }> {
    return this.spaceService.bulkActions(bulkDto, req.user.id);
  }

  // ==================== SUPER_ADMIN ENDPOINTS ====================

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async getAllSpaces(@Query() query: SpaceSearchDto): Promise<SpaceListDto> {
    // For SUPER_ADMIN, we need a different method that doesn't filter by user
    // This would be implemented in the service
    throw new Error('Not implemented yet - requires admin service method');
  }

  @Patch('admin/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async adminUpdate(
    @Param('id') id: string,
    @Body() updateDto: UpdateSpaceDto,
    @Request() req,
  ): Promise<SpaceResponseDto> {
    // For SUPER_ADMIN, bypass permission checks
    throw new Error('Not implemented yet - requires admin service method');
  }

  @Delete('admin/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async adminDelete(
    @Param('id') id: string,
    @Request() req,
  ): Promise<{ message: string }> {
    // For SUPER_ADMIN, bypass permission checks
    throw new Error('Not implemented yet - requires admin service method');
  }
}
