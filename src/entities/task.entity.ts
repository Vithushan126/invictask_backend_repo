// @Entity('tasks')
// export class Task {
//   @PrimaryGeneratedColumn('uuid')
//   id: string;

//   @Column()
//   @Index()
//   title: string;

//   @Column({ type: 'text', nullable: true })
//   description: string;

//   @Column('uuid')
//   projectId: string;

//   @ManyToOne(() => Project, (project) => project.tasks, { eager: true })
//   @JoinColumn({ name: 'projectId' })
//   project: Project;

//   @Column('uuid', { nullable: true })
//   listId: string;

//   @ManyToOne(() => List, (list) => list.tasks, { nullable: true })
//   @JoinColumn({ name: 'listId' })
//   list: List;

//   @Column('uuid',{ nullable: true })
//   createdBy: string;

//   @ManyToOne(() => User, { eager: true })
//   @JoinColumn({ name: 'createdBy' })
//   creator: User;

//   @Column('uuid', { nullable: true })
//   assigneeId: string;

//   @ManyToOne(() => User, { nullable: true, eager: true })
//   @JoinColumn({ name: 'assigneeId' })
//   assignee: User;

//   @Column({
//     type: 'enum',
//     enum: TaskStatus,
//     default: TaskStatus.NEW,
//   })
//   @Index()
//   status: TaskStatus;

//   @Column({
//     type: 'enum',
//     enum: TaskPriority,
//     default: TaskPriority.LOW,
//   })
//   @Index()
//   priority: TaskPriority;

//   @Column({ nullable: true })
//   @Index()
//   dueDate: Date;

//   @Column({ nullable: true })
//   startDate: Date;

//   @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
//   estimatedHours: number;

//   @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
//   actualHours: number;

//   @Column({ type: 'simple-array', nullable: true })
//   tags: string[];

//   @Column('uuid', { nullable: true })
//   parentTaskId: string;

//   @ManyToOne(() => Task, (task) => task.subtasks, { nullable: true })
//   @JoinColumn({ name: 'parentTaskId' })
//   parentTask: Task;

//   @OneToMany(() => Task, (task) => task.parentTask)
//   subtasks: Task[];

//   @Column({ type: 'jsonb', nullable: true })
//   customFields: Record<string, any>;

//   @Column({ type: 'int', default: 0 })
//   progress: number; // 0-100

//   @Column({ nullable: true })
//   completedAt: Date;

//   @Column('uuid', { nullable: true })
//   completedBy: string;

//   @ManyToOne(() => User, { nullable: true })
//   @JoinColumn({ name: 'completedBy' })
//   completer: User;

//   @Column({ default: true })
//   isActive: boolean;

//   @Column({ nullable: true })
//   archivedAt: Date;

//   @Column('uuid', { nullable: true })
//   archivedBy: string;

//   @CreateDateColumn()
//   createdAt: Date;

//   @UpdateDateColumn()
//   updatedAt: Date;

//   // Relations
//   @OneToMany(() => TaskComment, (comment) => comment.task)
//   comments: TaskComment[];

//   @OneToMany(() => TaskAttachment, (attachment) => attachment.task)
//   attachments: TaskAttachment[];

//   @OneToMany(() => TaskTimeEntry, (timeEntry) => timeEntry.task)
//   timeEntries: TaskTimeEntry[];

//   @OneToMany(() => TaskChecklist, (checklist) => checklist.task)
//   checklists: TaskChecklist[];

//   @ManyToMany(() => User)
//   @JoinTable({
//     name: 'task_watchers',
//     joinColumn: { name: 'taskId', referencedColumnName: 'id' },
//     inverseJoinColumn: { name: 'userId', referencedColumnName: 'id' },
//   })
//   watchers: User[];

//   @ManyToMany(() => Task)
//   @JoinTable({
//     name: 'task_dependencies',
//     joinColumn: { name: 'taskId', referencedColumnName: 'id' },
//     inverseJoinColumn: { name: 'dependsOnTaskId', referencedColumnName: 'id' },
//   })
//   dependencies: Task[];

//   // Virtual properties
//   get isOverdue(): boolean {
//     return this.dueDate
//       ? new Date() > this.dueDate && this.status !== TaskStatus.COMPLETED
//       : false;
//   }

//   get isCompleted(): boolean {
//     return this.status === TaskStatus.COMPLETED;
//   }

//   get subtaskCount(): number {
//     return this.subtasks?.length || 0;
//   }

//   get commentCount(): number {
//     return this.comments?.length || 0;
//   }

//   get attachmentCount(): number {
//     return this.attachments?.length || 0;
//   }

//   get watcherCount(): number {
//     return this.watchers?.length || 0;
//   }
// }

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinColumn,
  JoinTable,
  Index,
  Tree,
  TreeChildren,
  TreeParent,
  TreeLevelColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Project } from './project.entity';
import { List } from './list.entity';

export enum TaskStatus {
  NEW = 'NEW',
  PENDING = 'PENDING',
  INPROGRESS = 'INPROGRESS',
  COMPLETED = 'COMPLETED',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

@Tree('closure-table')
@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column('uuid')
  projectId: string;

  @ManyToOne(() => Project, (project) => project.tasks, { eager: true })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column('uuid', { nullable: true })
  listId: string;

  @ManyToOne(() => List, (list) => list.tasks, { nullable: true })
  @JoinColumn({ name: 'listId' })
  list: List;

  @Column('uuid', { nullable: true })
  createdBy: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @Column('uuid', { nullable: true })
  assigneeId: string;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'assigneeId' })
  assignee: User;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.NEW,
  })
  @Index()
  status: TaskStatus;

  @Column({
    type: 'enum',
    enum: TaskPriority,
    default: TaskPriority.LOW,
  })
  @Index()
  priority: TaskPriority;

  @Column({ nullable: true })
  @Index()
  dueDate: Date;

  @Column({ nullable: true })
  startDate: Date;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  estimatedHours: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  actualHours: number;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  // 🧠 Tree Relations
  @TreeChildren({ cascade: true })
  subtasks: Task[];

  @TreeParent()
  parentTask: Task;

  // @TreeLevelColumn()
  // level: number;

  @Column({ type: 'int', default: 0 })
  level: number;

  @Column({ type: 'jsonb', nullable: true })
  customFields: Record<string, any>;

  @Column({ type: 'int', default: 0 })
  progress: number; // 0–100

  @Column({ nullable: true })
  completedAt: Date;

  @Column('uuid', { nullable: true })
  completedBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'completedBy' })
  completer: User;

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
  @OneToMany(() => TaskComment, (comment) => comment.task)
  comments: TaskComment[];

  @OneToMany(() => TaskAttachment, (attachment) => attachment.task)
  attachments: TaskAttachment[];

  @OneToMany(() => TaskTimeEntry, (timeEntry) => timeEntry.task)
  timeEntries: TaskTimeEntry[];

  @OneToMany(() => TaskChecklist, (checklist) => checklist.task)
  checklists: TaskChecklist[];

  @ManyToMany(() => User)
  @JoinTable({
    name: 'task_watchers',
    joinColumn: { name: 'taskId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'userId', referencedColumnName: 'id' },
  })
  watchers: User[];

  @ManyToMany(() => Task)
  @JoinTable({
    name: 'task_dependencies',
    joinColumn: { name: 'taskId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'dependsOnTaskId', referencedColumnName: 'id' },
  })
  dependencies: Task[];

  // Virtual properties
  get isOverdue(): boolean {
    return this.dueDate
      ? new Date() > this.dueDate && this.status !== TaskStatus.COMPLETED
      : false;
  }

  get isCompleted(): boolean {
    return this.status === TaskStatus.COMPLETED;
  }

  get subtaskCount(): number {
    return this.subtasks?.length || 0;
  }

  get commentCount(): number {
    return this.comments?.length || 0;
  }

  get attachmentCount(): number {
    return this.attachments?.length || 0;
  }

  get watcherCount(): number {
    return this.watchers?.length || 0;
  }
}

// Task Comment Entity
@Entity('task_comments')
export class TaskComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  taskId: string;

  @ManyToOne(() => Task, (task) => task.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taskId' })
  task: Task;

  @Column('uuid')
  authorId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'authorId' })
  author: User;

  @Column({ type: 'text' })
  content: string;

  @Column('uuid', { nullable: true })
  parentCommentId: string;

  @ManyToOne(() => TaskComment, (comment) => comment.replies, {
    nullable: true,
  })
  @JoinColumn({ name: 'parentCommentId' })
  parentComment: TaskComment;

  @OneToMany(() => TaskComment, (comment) => comment.parentComment)
  replies: TaskComment[];

  @Column({ type: 'simple-array', nullable: true })
  mentions: string[]; // User IDs mentioned in the comment

  @Column({ default: false })
  isEdited: boolean;

  @Column({ nullable: true })
  editedAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => TaskCommentAttachment, (attachment) => attachment.comment)
  attachments: TaskCommentAttachment[];
}

// Task Comment Attachment Entity
@Entity('task_comment_attachments')
export class TaskCommentAttachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  commentId: string;

  @ManyToOne(() => TaskComment, (comment) => comment.attachments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'commentId' })
  comment: TaskComment;

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

  @CreateDateColumn()
  createdAt: Date;
}

// Task Attachment Entity
@Entity('task_attachments')
export class TaskAttachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  taskId: string;

  @ManyToOne(() => Task, (task) => task.attachments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taskId' })
  task: Task;

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

  @Column({ default: 0 })
  downloadCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// Task Time Entry Entity
@Entity('task_time_entries')
export class TaskTimeEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  taskId: string;

  @ManyToOne(() => Task, (task) => task.timeEntries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taskId' })
  task: Task;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  hours: number;

  @Column({ type: 'date' })
  date: Date;

  @Column({ default: false })
  billable: boolean;

  @Column({ default: false })
  approved: boolean;

  @Column('uuid', { nullable: true })
  approvedBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approvedBy' })
  approver: User;

  @Column({ nullable: true })
  approvedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// Task Checklist Entity
@Entity('task_checklists')
export class TaskChecklist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  taskId: string;

  @ManyToOne(() => Task, (task) => task.checklists, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taskId' })
  task: Task;

  @Column()
  title: string;

  @Column({ type: 'int', default: 0 })
  order: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => TaskChecklistItem, (item) => item.checklist)
  items: TaskChecklistItem[];
}

// Task Checklist Item Entity
@Entity('task_checklist_items')
export class TaskChecklistItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  checklistId: string;

  @ManyToOne(() => TaskChecklist, (checklist) => checklist.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'checklistId' })
  checklist: TaskChecklist;

  @Column()
  text: string;

  @Column({ default: false })
  isCompleted: boolean;

  @Column('uuid', { nullable: true })
  completedBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'completedBy' })
  completer: User;

  @Column({ nullable: true })
  completedAt: Date;

  @Column({ type: 'int', default: 0 })
  order: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
