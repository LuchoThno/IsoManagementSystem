import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ClerkAuth } from './clerk-auth.decorator';
import { ClerkAuthGuard } from './clerk-auth.guard';
import { TasksOperationsService } from './tasks-operations.service';
import type { CreateTaskDto, UpdateTaskDto, UpdateTaskStatusDto } from './dto/tasks.dto';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import type { ClerkSessionIdentity } from './clerk.types';

@Controller('iso')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class TasksController {
  constructor(private readonly tasksOperationsService: TasksOperationsService) {}

  @Get('tasks')
  getTasks() {
    return this.tasksOperationsService.listTasks();
  }

  @Post('tasks')
  @Roles('admin', 'manager')
  async createTask(
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body()
    body: CreateTaskDto
  ) {
    return this.tasksOperationsService.createTask(clerkAuth, body);
  }

  @Patch('tasks/:id')
  @Roles('admin', 'manager')
  async updateTask(
    @Param('id') id: string,
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body()
    body: UpdateTaskDto
  ) {
    return this.tasksOperationsService.updateTask(id, clerkAuth, body);
  }

  @Patch('tasks/:id/status')
  @Roles('admin', 'manager')
  async updateTaskStatus(
    @Param('id') id: string,
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body() body: UpdateTaskStatusDto
  ) {
    return this.tasksOperationsService.updateTaskStatus(id, clerkAuth, body);
  }

  @Patch('tasks/:id/delete')
  @Roles('admin', 'manager')
  async deleteTask(
    @Param('id') id: string,
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null
  ) {
    return this.tasksOperationsService.deleteTask(id, clerkAuth);
  }
}
