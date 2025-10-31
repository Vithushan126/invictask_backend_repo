import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, TreeRepository } from 'typeorm';
import { Task } from 'src/entities/task.entity';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { TaskGateway } from '../gateway/task.gateway';

@Injectable()
export class TaskService {
  private taskTreeRepo: TreeRepository<Task>;
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    private readonly taskGateway: TaskGateway,
    private readonly dataSource: DataSource,
  ) {
    this.taskTreeRepo = this.dataSource.getTreeRepository(Task);
  }

  async createTask(dto: CreateTaskDto, createdBy: string) {
    const newTask = this.taskRepo.create({
      ...dto,
      createdBy,
    });

    // If parentTaskId is provided, fetch parent and assign
    if (dto.parentTaskId) {
      const parentTask = await this.taskRepo.findOne({
        where: { id: dto.parentTaskId },
      });
      if (!parentTask) throw new NotFoundException('Parent task not found');
      newTask.parentTask = parentTask;
    }

    const saved = await this.taskRepo.save(newTask);
    this.taskGateway.notifyTaskCreate(saved);
    return saved;
  }

  // Get all top-level tasks as tree
  async getTasks() {
    const tasks = await this.taskTreeRepo.findTrees({
      relations: ['project', 'assignee'],
    });

    return tasks;
  }

  // Get a single task with its subtree
  async getTaskById(id: string) {
    const task = await this.taskRepo.findOne({
      where: { id },
      relations: ['project', 'assignee'],
    });
    if (!task) throw new NotFoundException('Task not found');

    const subtree = await this.taskTreeRepo.findDescendantsTree(task, {
      relations: ['project', 'assignee'],
    });

    return subtree;
  }

  // Update a task
  async updateTask(id: string, dto: UpdateTaskDto) {
    const task = await this.taskRepo.findOne({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');

    // If updating parentTask, fetch and assign
    if (dto.parentTaskId) {
      const parentTask = await this.taskRepo.findOne({
        where: { id: dto.parentTaskId },
      });
      if (!parentTask) throw new NotFoundException('Parent task not found');
      task.parentTask = parentTask;
    }

    await this.taskRepo.update(id, dto);
    const updated = await this.taskRepo.findOne({ where: { id } });

    this.taskGateway.notifyTaskUpdate(updated);
    return updated;
  }

  async deleteTask(id: string) {
    await this.taskRepo.softDelete(id);
    this.taskGateway.notifyTaskDelete(id);
    return { deleted: true };
  }
}
