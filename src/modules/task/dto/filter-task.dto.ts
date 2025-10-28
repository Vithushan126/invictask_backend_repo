import { IsOptional, IsEnum, IsUUID, IsString } from 'class-validator';
import { TaskPriority, TaskStatus } from 'src/entities/task.entity';

export class FilterTaskDto {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
