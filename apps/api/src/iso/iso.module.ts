import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatGateway } from './chat.gateway';
import { IsoController } from './iso.controller';
import { IsoService } from './iso.service';
import { Audit, AuditSchema } from './schemas/audit.schema';
import { ChatThreadEntity, ChatThreadSchema } from './schemas/chat-thread.schema';
import { DocumentEntity, DocumentSchema } from './schemas/document.schema';
import { SettingsEntity, SettingsSchema } from './schemas/settings.schema';
import { TaskEntity, TaskSchema } from './schemas/task.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DocumentEntity.name, schema: DocumentSchema },
      { name: TaskEntity.name, schema: TaskSchema },
      { name: Audit.name, schema: AuditSchema },
      { name: ChatThreadEntity.name, schema: ChatThreadSchema },
      { name: SettingsEntity.name, schema: SettingsSchema },
    ]),
  ],
  controllers: [IsoController],
  providers: [IsoService, ChatGateway],
})
export class IsoModule {}
