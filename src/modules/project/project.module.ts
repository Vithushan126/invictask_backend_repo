import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectController } from './controllers/project.controller';
import { ProjectService } from './services/project.service';
import {
  Project,
  ProjectMember,
  ProjectFile,
} from '../../entities/project.entity';
import { User } from '../../entities/user.entity';
import { Workspace, WorkspaceMember } from '../../entities/workspace.entity';
import { Space, SpaceMember } from 'src/entities/space.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      ProjectMember,
      ProjectFile,
      User,
      Workspace,
      WorkspaceMember,
      Space,
      SpaceMember,
    ]),
  ],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectModule {}
