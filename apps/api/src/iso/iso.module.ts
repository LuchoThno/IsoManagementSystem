import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { IsoController } from './iso.controller';
import { IsoService } from './iso.service';
import { Audit, AuditSchema } from './schemas/audit.schema';
import { DocumentEntity, DocumentSchema } from './schemas/document.schema';
import { SettingsEntity, SettingsSchema } from './schemas/settings.schema';
import { TaskEntity, TaskSchema } from './schemas/task.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DocumentEntity.name, schema: DocumentSchema },
      { name: TaskEntity.name, schema: TaskSchema },
      { name: Audit.name, schema: AuditSchema },
      { name: SettingsEntity.name, schema: SettingsSchema },
    ]),
  ],
  controllers: [IsoController],
  providers: [IsoService],
})
export class IsoModule {}
