import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpaceController } from './controllers/space.controller';
import { SpaceService } from './services/space.service';
import { Space, SpaceMember, SpaceInvitation } from '../../entities/space.entity';
import { User } from '../../entities/user.entity';
import { Workspace, WorkspaceMember } from '../../entities/workspace.entity';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Space,
      SpaceMember,
      SpaceInvitation,
      User,
      Workspace,
      WorkspaceMember,
    ]),
    NotificationModule,
  ],
  controllers: [SpaceController],
  providers: [SpaceService],
  exports: [SpaceService],
})
export class SpaceModule {}
