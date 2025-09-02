import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OrganizationController } from './controllers/organization.controller';
import { OrganizationService } from './services/organization.service';

import {
  Organization,
  OrganizationMember,
  OrganizationInvitation,
} from '../../entities/organization.entity';
import { User } from '../../entities/user.entity';
import { Workspace, WorkspaceMember } from '../../entities/workspace.entity';

import { NotificationModule } from '../notification/notification.module';
import { FileUploadModule } from '../file-upload/file-upload.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organization,
      OrganizationMember,
      OrganizationInvitation,
      User,
      Workspace,
      WorkspaceMember,
    ]),
    NotificationModule,
    FileUploadModule,
  ],
  controllers: [OrganizationController],
  providers: [OrganizationService],
  exports: [OrganizationService, TypeOrmModule],
})
export class OrganizationModule {}
