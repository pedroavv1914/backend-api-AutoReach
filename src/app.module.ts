import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PostsModule } from './posts/posts.module';
import { MediaModule } from './media/media.module';
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [AuthModule, UsersModule, PostsModule, MediaModule, QueueModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
