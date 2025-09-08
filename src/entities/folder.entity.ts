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
import { Space } from './space.entity';
import { List } from './list.entity';

export enum FolderStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ON_HOLD = 'on_hold',
  CANCELLED = 'cancelled',
  ARCHIVED = 'archived',
}

export enum FolderPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum FolderVisibility {
  PRIVATE = 'private',
  INTERNAL = 'internal',
  PUBLIC = 'public',
}

@Entity('folders')
export class Folder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  name: string;

  @Column({ nullable: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  color: string;

  @Column({ nullable: true })
  icon: string;

  @Column({ nullable: true })
  avatar: string;

  @Column('uuid')
  spaceId: string;

  @ManyToOne(() => Space, { eager: true })
  @JoinColumn({ name: 'spaceId' })
  space: Space;

  @Column('uuid')
  ownerId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column({
    type: 'enum',
    enum: FolderStatus,
    default: FolderStatus.ACTIVE,
  })
  status: FolderStatus;

  @Column({
    type: 'enum',
    enum: FolderPriority,
    default: FolderPriority.NORMAL,
  })
  priority: FolderPriority;

  @Column({
    type: 'enum',
    enum: FolderVisibility,
    default: FolderVisibility.PRIVATE,
  })
  visibility: FolderVisibility;

  @Column({ type: 'int', default: 0 })
  progress: number;

  @Column({ nullable: true })
  startDate: Date;

  @Column({ nullable: true })
  dueDate: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  budget: number;

  @Column({ nullable: true })
  currency: string;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ type: 'jsonb', nullable: true })
  customFields: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  settings: {
    features: {
      timeTracking: boolean;
      customFields: boolean;
      subtasks: boolean;
      dependencies: boolean;
      milestones: boolean;
      ganttChart: boolean;
      budgetTracking: boolean;
    };
    permissions: {
      whoCanCreateLists: 'admins' | 'members' | 'everyone';
      whoCanEditTasks: 'admins' | 'members' | 'assignees';
      whoCanDeleteTasks: 'admins' | 'members' | 'task_creators';
      whoCanInviteMembers: 'admins' | 'members';
    };
    automation: {
      autoAssignTasks: boolean;
      autoUpdateStatus: boolean;
      notifyOnDeadlines: boolean;
      escalateOverdueTasks: boolean;
    };
    views: {
      defaultView: 'list' | 'board' | 'gantt' | 'calendar' | 'timeline';
      enabledViews: string[];
    };
    notifications: {
      emailDigest: boolean;
      slackIntegration: boolean;
      webhookUrl?: string;
    };
  };

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  archivedAt: Date;

  @Column('uuid', { nullable: true })
  archivedBy: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ nullable: true })
  templateId: string;

  @Column({ default: false })
  isTemplate: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => FolderMember, (member) => member.folder)
  members: FolderMember[];

  @OneToMany(() => List, (list) => list.folder)
  lists: List[];

  @OneToMany(() => FolderMilestone, (milestone) => milestone.folder)
  milestones: FolderMilestone[];

  // Virtual properties
  get memberCount(): number {
    return this.members?.length || 0;
  }

  get listCount(): number {
    return this.lists?.length || 0;
  }

  get isArchived(): boolean {
    return this.archivedAt !== null;
  }

  get isOverdue(): boolean {
    return (
      this.dueDate &&
      new Date() > this.dueDate &&
      this.status !== FolderStatus.COMPLETED
    );
  }
}

// Folder Member Entity
export enum FolderRole {
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer',
}

@Entity('folder_members')
export class FolderMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  folderId: string;

  @ManyToOne(() => Folder, (folder) => folder.members)
  @JoinColumn({ name: 'folderId' })
  folder: Folder;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: FolderRole,
    default: FolderRole.MEMBER,
  })
  role: FolderRole;

  @Column({ type: 'simple-array', nullable: true })
  permissions: string[];

  @Column('uuid', { nullable: true })
  invitedBy: string;

  @Column({ nullable: true })
  joinedAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// Folder Milestone Entity
@Entity('folder_milestones')
export class FolderMilestone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  folderId: string;

  @ManyToOne(() => Folder, (folder) => folder.milestones)
  @JoinColumn({ name: 'folderId' })
  folder: Folder;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column()
  dueDate: Date;

  @Column({ default: false })
  isCompleted: boolean;

  @Column({ nullable: true })
  completedAt: Date;

  @Column('uuid', { nullable: true })
  completedBy: string;

  @Column({ nullable: true })
  color: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
