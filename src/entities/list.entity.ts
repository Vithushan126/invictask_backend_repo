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
import { Folder } from './folder.entity';
import { Task, TaskStatus } from './task.entity';

export enum ListType {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  DONE = 'done',
  CUSTOM = 'custom',
}

export enum ListVisibility {
  PRIVATE = 'private',
  INTERNAL = 'internal',
  PUBLIC = 'public',
}

@Entity('lists')
export class List {
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

  @Column('uuid')
  folderId: string;

  @ManyToOne(() => Folder, (folder) => folder.lists, { eager: true })
  @JoinColumn({ name: 'folderId' })
  folder: Folder;

  @Column('uuid')
  createdBy: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @Column({
    type: 'enum',
    enum: ListType,
    default: ListType.CUSTOM,
  })
  type: ListType;

  @Column({
    type: 'enum',
    enum: ListVisibility,
    default: ListVisibility.INTERNAL,
  })
  visibility: ListVisibility;

  @Column({ type: 'jsonb', nullable: true })
  settings: {
    features: {
      timeTracking: boolean;
      customFields: boolean;
      subtasks: boolean;
      dependencies: boolean;
      comments: boolean;
      attachments: boolean;
    };
    automation: {
      autoAssignTasks: boolean;
      autoUpdateStatus: boolean;
      notifyOnDeadlines: boolean;
      moveCompletedTasks: boolean;
      moveCompletedToListId?: string;
    };
    views: {
      defaultView: 'list' | 'board' | 'gantt' | 'calendar';
      showSubtasks: boolean;
      showClosedTasks: boolean;
      groupBy: 'none' | 'assignee' | 'priority' | 'status' | 'due_date';
      sortBy: 'created' | 'updated' | 'due_date' | 'priority' | 'name';
      sortOrder: 'asc' | 'desc';
    };
    permissions: {
      whoCanCreateTasks: 'admins' | 'members' | 'everyone';
      whoCanEditTasks: 'admins' | 'members' | 'assignees';
      whoCanDeleteTasks: 'admins' | 'members' | 'task_creators';
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
    statuses: Array<{
      id: string;
      name: string;
      color: string;
      type: 'open' | 'closed';
      isDefault: boolean;
    }>;
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
  @OneToMany(() => Task, (task) => task.list)
  tasks: Task[];

  // Virtual properties
  get taskCount(): number {
    return this.tasks?.length || 0;
  }

  get completedTaskCount(): number {
    return (
      this.tasks?.filter((task) => task.status === TaskStatus.DONE).length || 0
    );
  }

  get isArchived(): boolean {
    return this.archivedAt !== null;
  }

  get completionPercentage(): number {
    if (!this.tasks || this.tasks.length === 0) return 0;
    return Math.round((this.completedTaskCount / this.taskCount) * 100);
  }
}

// List Template Entity
@Entity('list_templates')
export class ListTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  category: string;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ type: 'jsonb' })
  template: {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    type: ListType;
    settings: any;
    defaultTasks?: Array<{
      title: string;
      description?: string;
      priority: string;
      estimatedHours?: number;
      tags?: string[];
    }>;
  };

  @Column('uuid')
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @Column('uuid', { nullable: true })
  organizationId: string;

  @Column({ default: false })
  isPublic: boolean;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
