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
import { Project } from './project.entity';

export enum SpaceVisibility {
  PRIVATE = 'private',
  INTERNAL = 'internal',
  PUBLIC = 'public',
}

export enum SpaceStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  TEMPLATE = 'template',
}

@Entity('spaces')
export class Space {
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
  workspaceId: string;

  @ManyToOne(() => Workspace, (workspace) => workspace.spaces, { eager: true })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Workspace;

  @Column('uuid')
  ownerId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column({
    type: 'enum',
    enum: SpaceVisibility,
    default: SpaceVisibility.PRIVATE,
  })
  visibility: SpaceVisibility;

  @Column({
    type: 'enum',
    enum: SpaceStatus,
    default: SpaceStatus.ACTIVE,
  })
  status: SpaceStatus;

  @Column({ type: 'jsonb', nullable: true })
  settings: {
    features: {
      timeTracking: boolean;
      customFields: boolean;
      goals: boolean;
      milestones: boolean;
      dependencies: boolean;
      automations: boolean;
    };
    permissions: {
      whoCanCreateFolders: 'admins' | 'members' | 'everyone';
      whoCanEditSpace: 'admins' | 'members';
      whoCanDeleteTasks: 'admins' | 'members' | 'task_creators';
      whoCanInviteMembers: 'admins' | 'members';
    };
    views: {
      defaultView: 'list' | 'board' | 'gantt' | 'calendar';
      enabledViews: string[];
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

  @Column({ type: 'timestamp', nullable: true })
  archivedAt: Date | null;

  @Column('uuid', { nullable: true })
  archivedBy: string | null;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Project, (project) => project.space)
  projects: Project[];

  // Relations
  @OneToMany(() => SpaceMember, (member) => member.space)
  members: SpaceMember[];

  // Virtual properties
  get memberCount(): number {
    return this.members?.length || 0;
  }

  get projectCount(): number {
    return this.projects?.length || 0;
  }

  get isArchived(): boolean {
    return this.archivedAt !== null;
  }
}

// Space Member Entity
export enum SpaceRole {
  ADMIN = 'admin',
  MEMBER = 'member',
  GUEST = 'guest',
}

@Entity('space_members')
export class SpaceMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  spaceId: string;

  @ManyToOne(() => Space, (space) => space.members)
  @JoinColumn({ name: 'spaceId' })
  space: Space;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: SpaceRole,
    default: SpaceRole.MEMBER,
  })
  role: SpaceRole;

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

// Space Invitation Entity
@Entity('space_invitations')
export class SpaceInvitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  spaceId: string;

  @ManyToOne(() => Space)
  @JoinColumn({ name: 'spaceId' })
  space: Space;

  @Column()
  email: string;

  @Column({
    type: 'enum',
    enum: SpaceRole,
    default: SpaceRole.MEMBER,
  })
  role: SpaceRole;

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
