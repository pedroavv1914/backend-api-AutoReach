import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProvidersService } from './providers.service';
import { TwitterService } from './twitter.service';

@Module({
  imports: [PrismaModule],
  providers: [ProvidersService, TwitterService],
  exports: [ProvidersService],
})
export class ProvidersModule {}
