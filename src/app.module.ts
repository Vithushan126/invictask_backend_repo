import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Database entities
import { User } from './entities/user.entity';
import {
  Organization,
  OrganizationMember,
  OrganizationInvitation,
} from './entities/organization.entity';
import {
  Workspace,
  WorkspaceMember,
  WorkspaceInvitation,
} from './entities/workspace.entity';
import { Project, ProjectMember, ProjectFile } from './entities/project.entity';
import {
  Task,
  TaskComment,
  TaskAttachment,
  TaskTimeEntry,
  TaskChecklist,
  TaskChecklistItem,
  TaskCommentAttachment,
} from './entities/task.entity';

// Core modules
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { FileUploadModule } from './modules/file-upload/file-upload.module';
import { NotificationModule } from './modules/notification/notification.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [
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
        ],
        synchronize: configService.get('DB_SYNCHRONIZE') === 'true',
        logging: configService.get('DB_LOGGING') === 'true',
        ssl:
          process.env.NODE_ENV === 'production'
            ? { rejectUnauthorized: false }
            : false,
      }),
      inject: [ConfigService],
    }),
    // Core modules
    AuthModule,
    UserModule,
    OrganizationModule,
    FileUploadModule,
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
