import { Module } from '@nestjs/common';
import { AccountsController } from './accounts.controller';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AccountsController],
  providers: [],
})
export class AccountsModule {}
