import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [TenantsController],
  exports: [],
})
export class TenantsModule {}
