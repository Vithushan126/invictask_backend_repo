import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspaceController } from './controllers/workspace.controller';
import { WorkspaceService } from './services/workspace.service';

// Import entities
import { User } from '../../entities/user.entity';
import {
  Organization,
  OrganizationMember,
} from '../../entities/organization.entity';
import {
  Workspace,
  WorkspaceMember,
  WorkspaceInvitation,
} from '../../entities/workspace.entity';
import { Project } from '../../entities/project.entity';
import { Task } from '../../entities/task.entity';

// Import notification module
import { NotificationModule } from '../notification/notification.module';
import { Space } from 'src/entities/space.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Organization,
      OrganizationMember,
      Workspace,
      WorkspaceMember,
      WorkspaceInvitation,
      Project,
      Task,
      Space,
    ]),
    NotificationModule,
  ],
  controllers: [WorkspaceController],
  providers: [WorkspaceService],
  exports: [WorkspaceService],
})
export class WorkspaceModule {}
