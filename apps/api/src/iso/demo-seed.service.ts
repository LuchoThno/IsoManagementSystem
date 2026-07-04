import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Audit } from './schemas/audit.schema';
import { ChatThreadEntity } from './schemas/chat-thread.schema';
import { DocumentEntity } from './schemas/document.schema';
import { TaskEntity } from './schemas/task.schema';
import { CommunicationsDomainService } from './communications-domain.service';
import { SettingsDocumentService } from './settings-document.service';
import { TenantContextService } from './tenant-context.service';

type Standard = string;

@Injectable()
export class DemoSeedService implements OnModuleInit {
  constructor(
    @InjectModel(DocumentEntity.name)
    private readonly documentModel: Model<DocumentEntity>,
    @InjectModel(TaskEntity.name)
    private readonly taskModel: Model<TaskEntity>,
    @InjectModel(Audit.name)
    private readonly auditModel: Model<Audit>,
    @InjectModel(ChatThreadEntity.name)
    private readonly chatThreadModel: Model<ChatThreadEntity>,
    private readonly settingsDocumentService: SettingsDocumentService,
    private readonly communicationsDomainService: CommunicationsDomainService,
    private readonly tenantContextService: TenantContextService
  ) {}

  async onModuleInit() {
    await this.seedIfEmpty();
  }

  private async seedIfEmpty() {
    const defaultTenantId = await this.tenantContextService.resolveEffectiveTenantId();
    const [documentCount, taskCount, auditCount, chatThreadCount] = await Promise.all([
      this.documentModel.countDocuments(),
      this.taskModel.countDocuments(),
      this.auditModel.countDocuments(),
      this.chatThreadModel.countDocuments(),
    ]);

    await this.settingsDocumentService.getSettingsDocument();
    await this.communicationsDomainService.seedEmailTemplatesIfEmpty();

    if (documentCount === 0) {
      await this.documentModel.insertMany([
        {
          tenantId: defaultTenantId,
          title: 'Manual de Calidad',
          topic: 'Gobierno del sistema',
          fileName: 'manual-calidad.pdf',
          mimeType: 'application/pdf',
          type: 'manual',
          format: 'PDF',
          standard: 'ISO9001',
          version: '2.1',
          status: 'active',
          url: 'https://iso.servasmar.cl/documents/manual-calidad.pdf',
          versionHistory: [
            {
              id: this.makeId('doc-version'),
              version: '2.1',
              date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
              author: 'Administrador ISO',
              notes: 'Ajuste de politica y alcance.',
            },
          ],
          auditTrail: [
            {
              id: this.makeId('doc-audit'),
              action: 'created',
              date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              author: 'Administrador ISO',
              details: 'Documento incorporado al sistema',
            },
          ],
        },
        {
          tenantId: defaultTenantId,
          title: 'Procedimiento de Auditoria Interna',
          topic: 'Control documental',
          fileName: 'auditoria-interna.pdf',
          mimeType: 'application/pdf',
          type: 'procedure',
          format: 'PDF',
          standard: 'ISO19011',
          version: '1.4',
          status: 'active',
          url: 'https://iso.servasmar.cl/documents/auditoria-interna.pdf',
          versionHistory: [
            {
              id: this.makeId('doc-version'),
              version: '1.4',
              date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
              author: 'Marcela Castro',
              notes: 'Actualizacion de responsables y alcance.',
            },
          ],
          auditTrail: [
            {
              id: this.makeId('doc-audit'),
              action: 'created',
              date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
              author: 'Administrador ISO',
              details: 'Documento creado en la base documental',
            },
          ],
        },
        {
          tenantId: defaultTenantId,
          title: 'Registro de Acciones Correctivas',
          topic: 'Seguridad operacional',
          fileName: 'acciones-correctivas.xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          type: 'record',
          format: 'XLSX',
          standard: 'ISO45001',
          version: '3.0',
          status: 'draft',
          url: 'https://iso.servasmar.cl/documents/acciones-correctivas.xlsx',
          versionHistory: [
            {
              id: this.makeId('doc-version'),
              version: '3.0',
              date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
              author: 'Pedro Salinas',
              notes: 'Borrador preparado para revision final.',
            },
          ],
          auditTrail: [
            {
              id: this.makeId('doc-audit'),
              action: 'created',
              date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
              author: 'Pedro Salinas',
              details: 'Registro creado para seguimiento de acciones.',
            },
          ],
        },
      ].map((document) => ({
        ...document,
        standard:
          document.standard === 'ISO19011' ? 'ISO9001' : (document.standard as Standard),
      })));
    }

    if (taskCount === 0) {
      await this.taskModel.insertMany([
        {
          tenantId: defaultTenantId,
          title: 'Actualizar matriz de riesgos',
          description: 'Revisar criticidad de hallazgos del ultimo trimestre.',
          assignedTo: 'Ana Torres',
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          status: 'in-progress',
          priority: 'high',
          standard: 'ISO45001',
          relatedDocuments: [],
        },
        {
          tenantId: defaultTenantId,
          title: 'Cerrar no conformidad NC-12',
          description: 'Validar evidencia y emitir cierre formal.',
          assignedTo: 'Luis Herrera',
          dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          status: 'overdue',
          priority: 'high',
          standard: 'ISO9001',
          relatedDocuments: [],
        },
        {
          tenantId: defaultTenantId,
          title: 'Capacitacion en control documental',
          description: 'Ejecutar sesion para lideres de proceso.',
          assignedTo: 'Maria Soto',
          dueDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
          status: 'pending',
          priority: 'medium',
          standard: 'ISO14001',
          relatedDocuments: [],
        },
      ]);
    }

    if (auditCount === 0) {
      await this.auditModel.insertMany([
        {
          tenantId: defaultTenantId,
          type: 'internal',
          standard: 'ISO9001',
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'planned',
          findings: [
            {
              id: 'finding-1',
              type: 'observation',
              description: 'Formalizar seguimiento de indicadores de proceso.',
              status: 'open',
              dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
              assignedTo: 'Carlos Ruiz',
            },
          ],
        },
        {
          tenantId: defaultTenantId,
          type: 'external',
          standard: 'ISO14001',
          date: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
          status: 'planned',
          findings: [
            {
              id: 'finding-2',
              type: 'opportunity',
              description: 'Mejorar trazabilidad de residuos peligrosos.',
              status: 'in-progress',
              dueDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
              assignedTo: 'Paula Diaz',
            },
          ],
        },
      ]);
    }

    if (chatThreadCount === 0) {
      await this.chatThreadModel.insertMany([
        {
          tenantId: defaultTenantId,
          participantIds: ['user-1', 'user-2'],
          updatedAt: new Date(),
          messages: [
            {
              id: 'msg-1',
              authorId: 'user-1',
              content:
                'Marcela, por favor revisa las tareas que vencen esta semana antes del comite.',
              createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
              readBy: ['user-1', 'user-2'],
            },
            {
              id: 'msg-2',
              authorId: 'user-2',
              content: 'Perfecto, hoy cierro la revision y dejo comunicado listo.',
              createdAt: new Date(),
              readBy: ['user-1', 'user-2'],
            },
          ],
        },
        {
          tenantId: defaultTenantId,
          participantIds: ['user-1', 'user-3'],
          updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          messages: [
            {
              id: 'msg-3',
              authorId: 'user-3',
              content: 'Ya tengo la evidencia del hallazgo NC-12 para seguimiento.',
              createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
              readBy: ['user-1', 'user-3'],
            },
          ],
        },
      ]);
    }
  }

  private makeId(prefix: string) {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
