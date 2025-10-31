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
import { Organization } from './organization.entity';
import { Space } from './space.entity';

export enum WorkspaceVisibility {
  PRIVATE = 'private',
  INTERNAL = 'internal', // Visible to all organization members
  PUBLIC = 'public',
}

@Entity('workspaces')
export class Workspace {
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
  avatar: string;

  @Column({ nullable: true })
  coverImage: string;

  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => Organization, (org) => org.workspaces, { eager: true })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column('uuid')
  ownerId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column({
    type: 'enum',
    enum: WorkspaceVisibility,
    default: WorkspaceVisibility.PRIVATE,
  })
  visibility: WorkspaceVisibility;

  @Column({ type: 'jsonb', nullable: true })
  settings: {
    allowGuestAccess: boolean;
    defaultProjectVisibility: 'private' | 'internal' | 'public';
    features: {
      timeTracking: boolean;
      customFields: boolean;
      goals: boolean;
      portfolios: boolean;
      dashboards: boolean;
      automations: boolean;
    };
    permissions: {
      whoCanCreateProjects: 'admins' | 'members' | 'everyone';
      whoCanInviteMembers: 'admins' | 'members' | 'everyone';
      whoCanDeleteTasks: 'admins' | 'members' | 'task_creators';
    };
    notifications: {
      emailDigest: boolean;
      slackIntegration: boolean;
      webhookUrl?: string;
    };
    customFields: Array<{
      id: string;
      name: string;
      type:
        | 'text'
        | 'number'
        | 'date'
        | 'dropdown'
        | 'checkbox'
        | 'user'
        | 'label';
      required: boolean;
      options?: string[];
      defaultValue?: any;
    }>;
  };

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  archivedAt: Date;

  @Column('uuid', { nullable: true })
  archivedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => WorkspaceMember, (member) => member.workspace)
  members: WorkspaceMember[];

  @OneToMany(() => Space, (space) => space.workspace)
  spaces: Space[];

  // Virtual properties
  get memberCount(): number {
    return this.members?.length || 0;
  }

  get isArchived(): boolean {
    return this.archivedAt !== null;
  }
}

// Workspace Member Entity
export enum WorkspaceRole {
  ADMIN = 'admin',
  MEMBER = 'member',
  GUEST = 'guest',
}

@Entity('workspace_members')
@Index(['workspaceId', 'userId'], { unique: true })
export class WorkspaceMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  workspaceId: string;

  @ManyToOne(() => Workspace, (workspace) => workspace.members, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Workspace;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: WorkspaceRole,
    default: WorkspaceRole.MEMBER,
  })
  role: WorkspaceRole;

  @Column({ type: 'simple-array', nullable: true })
  permissions: string[];

  @Column('uuid', { nullable: true })
  invitedBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'invitedBy' })
  inviter: User;

  @Column({ nullable: true })
  invitedAt: Date;

  @Column({ nullable: true })
  joinedAt: Date;

  @Column({ nullable: true })
  lastActiveAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// Workspace Invitation Entity
@Entity('workspace_invitations')
export class WorkspaceInvitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Workspace;

  @Column()
  email: string;

  @Column({
    type: 'enum',
    enum: WorkspaceRole,
    default: WorkspaceRole.MEMBER,
  })
  role: WorkspaceRole;

  @Column('uuid')
  invitedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'invitedBy' })
  inviter: User;

  @Column()
  token: string;

  @Column({ nullable: true })
  message: string;

  @Column()
  expiresAt: Date;

  @Column({ default: false })
  isAccepted: boolean;

  @Column({ nullable: true })
  acceptedAt: Date;

  @Column('uuid', { nullable: true })
  acceptedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// Import Project here to avoid circular dependency
import { Project } from './project.entity';
