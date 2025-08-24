import { Module } from '@nestjs/common';
import { TenantMiddleware } from './tenant.middleware';
import { TenantService } from './tenant.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [TenantService, TenantMiddleware],
  exports: [TenantService, TenantMiddleware],
})
export class CommonModule {}
