import { IsUUID, IsEnum, IsOptional, IsArray } from 'class-validator';
import { ProjectRole } from '../../../entities/project.entity';

export class AddProjectMemberDto {
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsEnum(ProjectRole)
  role?: ProjectRole;

  @IsOptional()
  @IsArray()
  permissions?: string[];
}