import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PostsModule } from './posts/posts.module';
import { MediaModule } from './media/media.module';
import { QueueModule } from './queue/queue.module';
import { AccountsModule } from './accounts/accounts.module';
import { ProvidersModule } from './providers/providers.module';
import { CommonModule } from './common/common.module';
import { TenantsModule } from './tenants/tenants.module';
import { PrismaModule } from './prisma/prisma.module';
import { TenantMiddleware } from './common/tenant.middleware';

@Module({
  imports: [
    PrismaModule,
    CommonModule,
    TenantsModule,
    AuthModule, 
    UsersModule, 
    PostsModule, 
    MediaModule, 
    QueueModule, 
    AccountsModule, 
    ProvidersModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .forRoutes('*'); // Apply to all routes
  }
}
