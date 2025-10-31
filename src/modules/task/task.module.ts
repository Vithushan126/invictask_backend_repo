import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from 'src/entities/task.entity';
import { TaskController } from './controllers/task.controller';
import { TaskService } from './services/task.service';
import { TaskGateway } from './gateway/task.gateway';
import { User } from 'src/entities/user.entity';
import { Project } from 'src/entities/project.entity';
import { List } from 'src/entities/list.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Task, User, Project, List])],
  controllers: [TaskController],
  providers: [TaskService, TaskGateway],
  exports: [TaskService],
})
export class TaskModule {}
