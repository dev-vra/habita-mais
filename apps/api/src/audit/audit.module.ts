import { Global, Module } from '@nestjs/common';
import { AuditoriaController, AuditoriaQueryService } from './auditoria.controller';
import { AuditService } from './audit.service';

@Global()
@Module({
  controllers: [AuditoriaController],
  providers: [AuditService, AuditoriaQueryService],
  exports: [AuditService],
})
export class AuditModule {}
