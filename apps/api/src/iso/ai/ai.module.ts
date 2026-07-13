import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AuthUsersTenantsModule } from '../auth-users-tenants.module';
import { Audit, AuditSchema } from '../schemas/audit.schema';
import { ChatThreadEntity, ChatThreadSchema } from '../schemas/chat-thread.schema';
import { DocumentEntity, DocumentSchema } from '../schemas/document.schema';

@Module({
  imports: [
    AuthUsersTenantsModule,
    MongooseModule.forFeature([
      { name: DocumentEntity.name, schema: DocumentSchema },
      { name: Audit.name, schema: AuditSchema },
      { name: ChatThreadEntity.name, schema: ChatThreadSchema },
    ]),
  ],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
