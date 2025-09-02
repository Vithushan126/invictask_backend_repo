import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Workspace } from './workspace.entity';

export enum ProjectStatus {
  PLANNING = 'planning',
  ACTIVE = 'active',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum ProjectVisibility {
  PRIVATE = 'private',
  INTERNAL = 'internal', // Visible to all workspace members
  PUBLIC = 'public',
}

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  name: string;

  @Column({ nullable: true })
  key: string; // Project key like "PROJ", "DEV", etc.

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true })
  coverImage: string;

  @Column('uuid')
  workspaceId: string;

  @ManyToOne(() => Workspace, workspace => workspace.projects, { eager: true })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Workspace;

  @Column('uuid')
  ownerId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column({
    type: 'enum',
    enum: ProjectStatus,
    default: ProjectStatus.PLANNING,
  })
  status: ProjectStatus;

  @Column({
    type: 'enum',
    enum: ProjectVisibility,
    default: ProjectVisibility.PRIVATE,
  })
  visibility: ProjectVisibility;

  @Column({ nullable: true })
  startDate: Date;

  @Column({ nullable: true })
  dueDate: Date;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  budget: number;

  @Column({ nullable: true })
  currency: string;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ type: 'jsonb', nullable: true })
  settings: {
    features: {
      timeTracking: boolean;
      customFields: boolean;
      subtasks: boolean;
      dependencies: boolean;
      milestones: boolean;
      ganttChart: boolean;
    };
    permissions: {
      whoCanCreateTasks: 'admins' | 'members' | 'everyone';
      whoCanEditTasks: 'admins' | 'members' | 'assignees';
      whoCanDeleteTasks: 'admins' | 'members' | 'task_creators';
      whoCanInviteMembers: 'admins' | 'members';
    };
    taskStatuses: Array<{
      id: string;
      name: string;
      color: string;
      type: 'open' | 'in_progress' | 'closed';
      order: number;
    }>;
    taskPriorities: Array<{
      id: string;
      name: string;
      color: string;
      order: number;
    }>;
    customFields: Array<{
      id: string;
      name: string;
      type: 'text' | 'number' | 'date' | 'dropdown' | 'checkbox' | 'user' | 'label';
      required: boolean;
      options?: string[];
      defaultValue?: any;
    }>;
  };

  @Column({ type: 'jsonb', nullable: true })
  progress: {
    totalTasks: number;
    completedTasks: number;
    percentage: number;
    lastUpdated: Date;
  };

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  archivedAt: Date;

  @Column('uuid', { nullable: true })
  archivedBy: string;

  @Column({ nullable: true })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => ProjectMember, member => member.project)
  members: ProjectMember[];

  @OneToMany(() => Task, task => task.project)
  tasks: Task[];

  @OneToMany(() => ProjectFile, file => file.project)
  files: ProjectFile[];

  // Virtual properties
  get memberCount(): number {
    return this.members?.length || 0;
  }

  get taskCount(): number {
    return this.tasks?.length || 0;
  }

  get isArchived(): boolean {
    return this.archivedAt !== null;
  }

  get isCompleted(): boolean {
    return this.status === ProjectStatus.COMPLETED;
  }

  get progressPercentage(): number {
    return this.progress?.percentage || 0;
  }
}

// Project Member Entity
export enum ProjectRole {
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer',
  GUEST = 'guest',
}

@Entity('project_members')
@Index(['projectId', 'userId'], { unique: true })
export class ProjectMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  projectId: string;

  @ManyToOne(() => Project, project => project.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: ProjectRole,
    default: ProjectRole.MEMBER,
  })
  role: ProjectRole;

  @Column({ type: 'simple-array', nullable: true })
  permissions: string[];

  @Column('uuid', { nullable: true })
  addedBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'addedBy' })
  adder: User;

  @Column({ nullable: true })
  addedAt: Date;

  @Column({ nullable: true })
  lastActiveAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// Project File Entity
@Entity('project_files')
export class ProjectFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  projectId: string;

  @ManyToOne(() => Project, project => project.files, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column()
  fileName: string;

  @Column()
  originalName: string;

  @Column()
  fileUrl: string;

  @Column({ nullable: true })
  thumbnailUrl: string;

  @Column()
  mimeType: string;

  @Column('bigint')
  fileSize: number;

  @Column('uuid')
  uploadedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploadedBy' })
  uploader: User;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ default: 0 })
  downloadCount: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// Import Task here to avoid circular dependency
import { Task } from './task.entity';
