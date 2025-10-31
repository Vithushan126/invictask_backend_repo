import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Project,
  ProjectMember,
  ProjectRole,
  ProjectStatus,
} from '../../../entities/project.entity';
import { User } from '../../../entities/user.entity';
import { Workspace, WorkspaceMember } from '../../../entities/workspace.entity';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { AddProjectMemberDto } from '../dto/add-member.dto';
import { Space, SpaceMember } from '../../../entities/space.entity';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(ProjectMember)
    private projectMemberRepository: Repository<ProjectMember>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Workspace)
    private workspaceRepository: Repository<Workspace>,
    @InjectRepository(WorkspaceMember)
    private workspaceMemberRepository: Repository<WorkspaceMember>,
    @InjectRepository(Space)
    private spaceRepository: Repository<Space>,
    @InjectRepository(SpaceMember)
    private spaceMemberRepository: Repository<SpaceMember>,
  ) {}

  async create(
    createProjectDto: CreateProjectDto,
    userId: string,
  ): Promise<Project> {
    // Verify space exists and user has access
    const space = await this.spaceRepository.findOne({
      where: { id: createProjectDto.spaceId },
      relations: ['workspace'],
    });

    if (!space) {
      throw new NotFoundException('Space not found');
    }

    const spaceMember = await this.spaceMemberRepository.findOne({
      where: { spaceId: createProjectDto.spaceId, userId },
    });

    if (!spaceMember) {
      throw new ForbiddenException('You are not a member of this space');
    }

    // Create project
    const project = this.projectRepository.create({
      ...createProjectDto,
      ownerId: userId,
      spaceId: space.id,
      settings: createProjectDto.settings || this.getDefaultSettings(),
    });

    const savedProject = await this.projectRepository.save(project);

    // Add creator as admin member
    await this.projectMemberRepository.save({
      projectId: savedProject.id,
      userId,
      role: ProjectRole.ADMIN,
      addedBy: userId,
      addedAt: new Date(),
    });

    return this.findOne(savedProject.id);
  }

  async findAll(
    userId: string,
    // workspaceId?: string,
    spaceId?: string,
  ): Promise<Project[]> {
    const query = this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.members', 'member')
      .leftJoinAndSelect('member.user', 'user')
      .leftJoinAndSelect('project.space', 'space')
      // .leftJoinAndSelect('project.workspace', 'workspace')
      .leftJoinAndSelect('project.owner', 'owner')
      .where('member.userId = :userId', { userId });

    // if (workspaceId) {
    //   query.andWhere('project.workspaceId = :workspaceId', { workspaceId });
    // }

    if (spaceId) {
      query.andWhere('project.spaceId = :spaceId', { spaceId });
    }

    return query.getMany();
  }

  async findOne(id: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: [
        'members',
        'members.user',
        // 'workspace',
        'owner',
        'tasks',
        'files',
      ],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
    userId: string,
  ): Promise<Project> {
    const project = await this.findOne(id);

    // Check if user has permission to update
    const member = await this.projectMemberRepository.findOne({
      where: { projectId: id, userId },
    });

    if (
      !member ||
      (member.role !== ProjectRole.ADMIN && project.ownerId !== userId)
    ) {
      throw new ForbiddenException(
        'You do not have permission to update this project',
      );
    }

    await this.projectRepository.update(id, updateProjectDto);
    return this.findOne(id);
  }

  async remove(id: string, userId: string): Promise<void> {
    const project = await this.findOne(id);

    // Only owner or admin can delete
    const member = await this.projectMemberRepository.findOne({
      where: { projectId: id, userId },
    });

    if (
      !member ||
      (member.role !== ProjectRole.ADMIN && project.ownerId !== userId)
    ) {
      throw new ForbiddenException(
        'You do not have permission to delete this project',
      );
    }

    await this.projectRepository.softDelete(id);
  }

  async addMember(
    projectId: string,
    addMemberDto: AddProjectMemberDto,
    addedBy: string,
  ): Promise<ProjectMember> {
    // Check if user has permission to add members
    const adminMember = await this.projectMemberRepository.findOne({
      where: { projectId, userId: addedBy },
    });

    if (!adminMember || adminMember.role !== ProjectRole.ADMIN) {
      throw new ForbiddenException('Only admins can add members');
    }

    // Check if user exists
    const user = await this.userRepository.findOne({
      where: { id: addMemberDto.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if already a member
    const existingMember = await this.projectMemberRepository.findOne({
      where: { projectId, userId: addMemberDto.userId },
    });

    if (existingMember) {
      throw new BadRequestException('User is already a member of this project');
    }

    const member = this.projectMemberRepository.create({
      projectId,
      userId: addMemberDto.userId,
      role: addMemberDto.role || ProjectRole.MEMBER,
      permissions: addMemberDto.permissions,
      addedBy,
      addedAt: new Date(),
    });

    return this.projectMemberRepository.save(member);
  }

  async removeMember(
    projectId: string,
    userId: string,
    removedBy: string,
  ): Promise<void> {
    const adminMember = await this.projectMemberRepository.findOne({
      where: { projectId, userId: removedBy },
    });

    if (!adminMember || adminMember.role !== ProjectRole.ADMIN) {
      throw new ForbiddenException('Only admins can remove members');
    }

    const result = await this.projectMemberRepository.delete({
      projectId,
      userId,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Member not found');
    }
  }

  async getProjectStats(projectId: string): Promise<any> {
    const project = await this.findOne(projectId);

    const memberCount = await this.projectMemberRepository.count({
      where: { projectId },
    });

    // TODO: Add task counts when Task module is implemented

    return {
      id: project.id,
      name: project.name,
      status: project.status,
      memberCount,
      taskCount: 0, // TODO: Implement
      completedTasks: 0, // TODO: Implement
      progress: project.progress || { percentage: 0 },
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }

  private getDefaultSettings() {
    return {
      features: {
        timeTracking: true,
        customFields: true,
        subtasks: true,
        dependencies: true,
        milestones: true,
        ganttChart: true,
      },
      permissions: {
        whoCanCreateTasks: 'members',
        whoCanEditTasks: 'members',
        whoCanDeleteTasks: 'admins',
        whoCanInviteMembers: 'admins',
      },
      taskStatuses: [
        { id: '1', name: 'To Do', color: '#f56565', type: 'open', order: 1 },
        {
          id: '2',
          name: 'In Progress',
          color: '#ed8936',
          type: 'in_progress',
          order: 2,
        },
        { id: '3', name: 'Done', color: '#48bb78', type: 'closed', order: 3 },
      ],
      taskPriorities: [
        { id: '1', name: 'Low', color: '#68d391', order: 1 },
        { id: '2', name: 'Medium', color: '#fbd38d', order: 2 },
        { id: '3', name: 'High', color: '#fc8181', order: 3 },
        { id: '4', name: 'Urgent', color: '#f56565', order: 4 },
      ],
      customFields: [],
    };
  }
}
