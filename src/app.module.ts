import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PostsModule } from './posts/posts.module';
import { MediaModule } from './media/media.module';
import { QueueModule } from './queue/queue.module';
import { AccountsModule } from './accounts/accounts.module';
import { OAuthModule } from './oauth/oauth.module';
import { ProvidersModule } from './providers/providers.module';

@Module({
  imports: [AuthModule, UsersModule, PostsModule, MediaModule, QueueModule, AccountsModule, OAuthModule, ProvidersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
