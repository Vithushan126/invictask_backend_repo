import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import {
  Space,
  SpaceMember,
  SpaceInvitation,
  SpaceRole,
} from '../../../entities/space.entity';
import { User } from '../../../entities/user.entity';
import { Workspace, WorkspaceMember } from '../../../entities/workspace.entity';
import { NotificationService } from '../../notification/services/notification.service';
import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
} from '../../notification/enums/notification.enum';
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

@Injectable()
export class SpaceService {
  private readonly logger = new Logger(SpaceService.name);

  constructor(
    @InjectRepository(Space)
    private readonly spaceRepository: Repository<Space>,
    @InjectRepository(SpaceMember)
    private readonly spaceMemberRepository: Repository<SpaceMember>,
    @InjectRepository(SpaceInvitation)
    private readonly spaceInvitationRepository: Repository<SpaceInvitation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepository: Repository<WorkspaceMember>,
    private readonly notificationService: NotificationService,
  ) {}

  // ==================== SPACE CRUD ====================

  async create(
    createSpaceDto: CreateSpaceDto,
    userId: string,
  ): Promise<SpaceResponseDto> {
    // Verify workspace access
    const workspace = await this.workspaceRepository.findOne({
      where: { id: createSpaceDto.workspaceId },
      relations: ['members'],
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Check if user has permission to create spaces in this workspace
    const workspaceMember = await this.workspaceMemberRepository.findOne({
      where: { workspaceId: createSpaceDto.workspaceId, userId },
    });

    if (!workspaceMember) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    // Generate unique slug
    const slug = await this.generateUniqueSlug(
      createSpaceDto.name,
      createSpaceDto.workspaceId,
    );

    // Create space
    const space = this.spaceRepository.create({
      ...createSpaceDto,
      slug,
      ownerId: userId,
      settings: {
        ...this.getDefaultSpaceSettings(),
        ...createSpaceDto.settings,
      } as Space['settings'],
    });

    const savedSpace = await this.spaceRepository.save(space);

    // Add creator as space admin
    const spaceMember = this.spaceMemberRepository.create({
      spaceId: savedSpace.id,
      userId,
      role: SpaceRole.ADMIN,
      joinedAt: new Date(),
    });
    await this.spaceMemberRepository.save(spaceMember);

    this.logger.log(`Space created: ${savedSpace.name} by user ${userId}`);

    return this.mapToResponseDto(savedSpace);
  }

  async findAll(query: SpaceSearchDto, userId: string): Promise<SpaceListDto> {
    const {
      search,
      workspaceId,
      visibility,
      status,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      page = 1,
      limit = 10,
      includeArchived = false,
    } = query;

    const queryBuilder = this.spaceRepository
      .createQueryBuilder('space')
      .leftJoinAndSelect('space.workspace', 'workspace')
      .leftJoinAndSelect('space.owner', 'owner')
      .leftJoinAndSelect('space.members', 'members')
      .leftJoinAndSelect('members.user', 'memberUser')
      .where('members.userId = :userId', { userId });

    // Apply filters
    if (search) {
      queryBuilder.andWhere(
        '(space.name ILIKE :search OR space.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (workspaceId) {
      queryBuilder.andWhere('space.workspaceId = :workspaceId', {
        workspaceId,
      });
    }

    if (visibility) {
      queryBuilder.andWhere('space.visibility = :visibility', { visibility });
    }

    if (status) {
      queryBuilder.andWhere('space.status = :status', { status });
    }

    if (!includeArchived) {
      queryBuilder.andWhere('space.archivedAt IS NULL');
    }

    // Apply sorting
    const validSortFields = ['createdAt', 'updatedAt', 'name', 'sortOrder'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    queryBuilder.orderBy(`space.${sortField}`, sortOrder);

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [spaces, total] = await queryBuilder.getManyAndCount();

    const spaceDtos = await Promise.all(
      spaces.map((space) => this.mapToResponseDto(space)),
    );

    return {
      spaces: spaceDtos,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, userId: string): Promise<SpaceResponseDto> {
    const space = await this.spaceRepository.findOne({
      where: { id },
      relations: ['workspace', 'owner', 'members', 'members.user'],
    });

    if (!space) {
      throw new NotFoundException('Space not found');
    }

    // Check if user has access to this space
    const member = space.members?.find((m) => m.userId === userId);
    if (!member) {
      throw new ForbiddenException('You do not have access to this space');
    }

    return this.mapToResponseDto(space);
  }

  async update(
    id: string,
    updateSpaceDto: UpdateSpaceDto,
    userId: string,
  ): Promise<SpaceResponseDto> {
    const space = await this.spaceRepository.findOne({
      where: { id },
      relations: ['members'],
    });

    if (!space) {
      throw new NotFoundException('Space not found');
    }

    // Check permissions
    await this.checkSpacePermissions(id, userId, ['admin']);

    // Update space
    Object.assign(space, updateSpaceDto);
    const updatedSpace = await this.spaceRepository.save(space);

    this.logger.log(`Space updated: ${space.name} by user ${userId}`);

    return this.mapToResponseDto(updatedSpace);
  }

  async remove(id: string, userId: string): Promise<{ message: string }> {
    const space = await this.spaceRepository.findOne({
      where: { id },
      relations: ['members'],
    });

    if (!space) {
      throw new NotFoundException('Space not found');
    }

    // Check permissions (only admin can delete)
    await this.checkSpacePermissions(id, userId, ['admin']);

    // Soft delete - mark as archived
    space.archivedAt = new Date();
    space.archivedBy = userId;
    space.isActive = false;
    await this.spaceRepository.save(space);

    this.logger.log(`Space archived: ${space.name} by user ${userId}`);

    return { message: 'Space archived successfully' };
  }

  // ==================== SPACE MEMBERS ====================

  async getMembers(spaceId: string, userId: string): Promise<SpaceMemberDto[]> {
    await this.checkSpacePermissions(spaceId, userId, ['admin', 'member']);

    const members = await this.spaceMemberRepository.find({
      where: { spaceId, isActive: true },
      relations: ['user'],
      order: { joinedAt: 'ASC' },
    });

    return members.map((member) => ({
      id: member.id,
      userId: member.userId,
      role: member.role,
      permissions: member.permissions || [],
      joinedAt: member.joinedAt,
      lastActiveAt: member.lastActiveAt,
      isActive: member.isActive,
      user: {
        id: member.user.id,
        firstName: member.user.firstName,
        lastName: member.user.lastName,
        email: member.user.email,
        avatar: member.user.avatar ?? undefined,
      },
    }));
  }

  async inviteMember(
    spaceId: string,
    inviteDto: InviteSpaceMemberDto,
    userId: string,
  ): Promise<{ message: string }> {
    await this.checkSpacePermissions(spaceId, userId, ['admin']);

    const space = await this.spaceRepository.findOne({
      where: { id: spaceId },
    });
    if (!space) {
      throw new NotFoundException('Space not found');
    }

    // Check if user exists
    const user = await this.userRepository.findOne({
      where: { email: inviteDto.email },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user is already a member
    const existingMember = await this.spaceMemberRepository.findOne({
      where: { spaceId, userId: user.id },
    });

    if (existingMember) {
      throw new BadRequestException('User is already a member of this space');
    }

    // Add member
    const member = this.spaceMemberRepository.create({
      spaceId,
      userId: user.id,
      role: inviteDto.role,
      joinedAt: new Date(),
      invitedBy: userId,
    });

    await this.spaceMemberRepository.save(member);

    // Send notification
    await this.notificationService.sendNotification({
      type: NotificationType.SPACE_MEMBER_ADDED,
      title: 'Added to Space',
      message: `You have been added to space "${space.name}"${inviteDto.message ? `. Message: ${inviteDto.message}` : ''}`,
      recipientId: user.id,
      senderId: userId,
      channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      priority: NotificationPriority.MEDIUM,
      data: {
        spaceId,
        spaceName: space.name,
        role: inviteDto.role,
      },
    });

    this.logger.log(`User ${user.id} added to space ${spaceId} by ${userId}`);

    return { message: 'Member invited successfully' };
  }

  async updateMember(
    spaceId: string,
    memberId: string,
    updateDto: UpdateSpaceMemberDto,
    userId: string,
  ): Promise<SpaceMemberDto> {
    await this.checkSpacePermissions(spaceId, userId, ['admin']);

    const member = await this.spaceMemberRepository.findOne({
      where: { id: memberId, spaceId },
      relations: ['user'],
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    Object.assign(member, updateDto);
    const updatedMember = await this.spaceMemberRepository.save(member);

    return {
      id: updatedMember.id,
      userId: updatedMember.userId,
      role: updatedMember.role,
      permissions: updatedMember.permissions || [],
      joinedAt: updatedMember.joinedAt,
      lastActiveAt: updatedMember.lastActiveAt,
      isActive: updatedMember.isActive,
      user: {
        id: updatedMember.user.id,
        firstName: updatedMember.user.firstName,
        lastName: updatedMember.user.lastName,
        email: updatedMember.user.email,
        avatar: updatedMember.user.avatar ?? undefined,
      },
    };
  }

  async removeMember(
    spaceId: string,
    memberId: string,
    userId: string,
  ): Promise<{ message: string }> {
    await this.checkSpacePermissions(spaceId, userId, ['admin']);

    const member = await this.spaceMemberRepository.findOne({
      where: { id: memberId, spaceId },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    await this.spaceMemberRepository.remove(member);

    this.logger.log(
      `Member ${memberId} removed from space ${spaceId} by ${userId}`,
    );

    return { message: 'Member removed successfully' };
  }

  // ==================== HELPER METHODS ====================

  private async checkSpacePermissions(
    spaceId: string,
    userId: string,
    allowedRoles: string[],
  ): Promise<void> {
    const member = await this.spaceMemberRepository.findOne({
      where: { spaceId, userId },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this space');
    }

    if (!allowedRoles.includes(member.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }

  private async generateUniqueSlug(
    name: string,
    workspaceId: string,
  ): Promise<string> {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    let slug = baseSlug;
    let counter = 1;

    while (
      await this.spaceRepository.findOne({ where: { slug, workspaceId } })
    ) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  private async mapToResponseDto(space: Space): Promise<SpaceResponseDto> {
    const memberCount = await this.spaceMemberRepository.count({
      where: { spaceId: space.id, isActive: true },
    });

    return {
      id: space.id,
      name: space.name,
      slug: space.slug,
      description: space.description,
      color: space.color,
      icon: space.icon,
      avatar: space.avatar,
      visibility: space.visibility,
      status: space.status,
      settings: space.settings || {},
      isActive: space.isActive,
      isArchived: space.isArchived,
      sortOrder: space.sortOrder,
      createdAt: space.createdAt,
      updatedAt: space.updatedAt,
      workspace: {
        id: space.workspace.id,
        name: space.workspace.name,
        slug: space.workspace.slug,
      },
      owner: {
        id: space.owner.id,
        firstName: space.owner.firstName,
        lastName: space.owner.lastName,
        email: space.owner.email,
        avatar: space.owner.avatar ?? undefined,
      },
      memberCount,
      folderCount: 0, // TODO: Implement when Folder entity is ready
      taskCount: 0, // TODO: Implement when Task counting is ready
    };
  }

  private getDefaultSpaceSettings() {
    return {
      features: {
        timeTracking: true,
        customFields: true,
        goals: true,
        milestones: true,
        dependencies: true,
        automations: true,
      },
      permissions: {
        whoCanCreateFolders: 'members',
        whoCanEditSpace: 'admins',
        whoCanDeleteTasks: 'admins',
        whoCanInviteMembers: 'admins',
      },
      views: {
        defaultView: 'list',
        enabledViews: ['list', 'board', 'gantt', 'calendar'],
      },
      notifications: {
        emailDigest: true,
        slackIntegration: false,
      },
      customFields: [],
    };
  }

  // ==================== SPACE STATISTICS ====================

  async getStats(spaceId: string, userId: string): Promise<SpaceStatsDto> {
    await this.checkSpacePermissions(spaceId, userId, ['admin', 'member']);

    // TODO: Implement actual statistics when Folder and Task entities are ready
    return {
      totalFolders: 0,
      activeFolders: 0,
      completedFolders: 0,
      totalTasks: 0,
      completedTasks: 0,
      inProgressTasks: 0,
      overdueTasks: 0,
      totalMembers: await this.spaceMemberRepository.count({
        where: { spaceId, isActive: true },
      }),
      activeMembers: await this.spaceMemberRepository.count({
        where: { spaceId, isActive: true },
      }),
      recentActivity: [],
    };
  }

  // ==================== SPACE ACTIONS ====================

  async archive(spaceId: string, userId: string): Promise<{ message: string }> {
    await this.checkSpacePermissions(spaceId, userId, ['admin']);

    const space = await this.spaceRepository.findOne({
      where: { id: spaceId },
    });
    if (!space) {
      throw new NotFoundException('Space not found');
    }

    space.archivedAt = new Date();
    space.archivedBy = userId;
    space.isActive = false;
    await this.spaceRepository.save(space);

    return { message: 'Space archived successfully' };
  }

  async restore(spaceId: string, userId: string): Promise<{ message: string }> {
    await this.checkSpacePermissions(spaceId, userId, ['admin']);

    const space = await this.spaceRepository.findOne({
      where: { id: spaceId },
    });
    if (!space) {
      throw new NotFoundException('Space not found');
    }

    space.archivedAt = null;
    space.archivedBy = null;
    space.isActive = true;
    await this.spaceRepository.save(space);

    return { message: 'Space restored successfully' };
  }

  async bulkActions(
    bulkDto: BulkSpaceActionDto,
    userId: string,
  ): Promise<{ message: string; processed: number }> {
    let processed = 0;

    for (const spaceId of bulkDto.spaceIds) {
      try {
        switch (bulkDto.action) {
          case 'archive':
            await this.archive(spaceId, userId);
            break;
          case 'restore':
            await this.restore(spaceId, userId);
            break;
          case 'delete':
            await this.remove(spaceId, userId);
            break;
          case 'update_status':
            if (bulkDto.data?.status) {
              await this.update(
                spaceId,
                { status: bulkDto.data.status },
                userId,
              );
            }
            break;
        }
        processed++;
      } catch (error) {
        this.logger.error(
          `Failed to process space ${spaceId}: ${error.message}`,
        );
      }
    }

    return {
      message: `Bulk action completed. ${processed} spaces processed.`,
      processed,
    };
  }
}
