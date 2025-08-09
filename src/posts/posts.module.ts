import { Module } from '@nestjs/common';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [PrismaModule, UsersModule, QueueModule],
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}
