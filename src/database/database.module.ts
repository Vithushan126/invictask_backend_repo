import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSeeder } from './seeders/user.seeder';

// Import all entities
import { User } from '../entities/user.entity';
import {
  Organization,
  OrganizationMember,
  OrganizationInvitation,
} from '../entities/organization.entity';
import {
  Workspace,
  WorkspaceMember,
  WorkspaceInvitation,
} from '../entities/workspace.entity';
import {
  Project,
  ProjectMember,
  ProjectFile,
} from '../entities/project.entity';
import {
  Task,
  TaskComment,
  TaskAttachment,
  TaskTimeEntry,
  TaskChecklist,
  TaskChecklistItem,
  TaskCommentAttachment,
} from '../entities/task.entity';
import { SeederService } from './seeder.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Organization,
      OrganizationMember,
      OrganizationInvitation,
      Workspace,
      WorkspaceMember,
      WorkspaceInvitation,
      Project,
      ProjectMember,
      ProjectFile,
      Task,
      TaskComment,
      TaskAttachment,
      TaskTimeEntry,
      TaskChecklist,
      TaskChecklistItem,
      TaskCommentAttachment,
    ]),
  ],
  providers: [UserSeeder, SeederService],
  exports: [SeederService],
})
export class DatabaseModule {}
