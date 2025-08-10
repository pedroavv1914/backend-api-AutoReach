import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProvidersService } from './providers.service';
import { TwitterService } from './twitter.service';
import { TwitterDebugController } from './twitter-debug.controller';

@Module({
  imports: [PrismaModule],
  controllers: [TwitterDebugController],
  providers: [ProvidersService, TwitterService],
  exports: [ProvidersService],
})
export class ProvidersModule {}
