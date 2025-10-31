import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class TaskGateway {
  @WebSocketServer()
  server: Server;

  notifyTaskCreate(task: any) {
    this.server.emit('taskCreated', task);
  }

  notifyTaskUpdate(task: any) {
    this.server.emit('taskUpdated', task);
  }

  notifyTaskDelete(taskId: string) {
    this.server.emit('taskDeleted', taskId);
  }
}
