import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { TaskService } from '../services/task.service';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  create(@Body() dto: CreateTaskDto, @Req() req: any) {
    const userId = req.user?.id;
    return this.taskService.createTask(dto, userId);
  }

  // @Get()
  // findAll() {
  //   return this.taskService.getTasks();
  // }

  @Get()
  findAll(@Query('projectId') projectId?: string) {
    console.log('tasksssssssssssssssss');

    return this.taskService.getTasks(projectId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.taskService.getTaskById(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.taskService.updateTask(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.taskService.deleteTask(id);
  }
}
