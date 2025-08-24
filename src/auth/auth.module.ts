import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OAuthController } from './oauth.controller';
import { TenantOAuthService } from './tenant-oauth.service';
import { OAuthAppsController } from './oauth-apps.controller';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'fallback-secret-key',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController, OAuthController, OAuthAppsController],
  providers: [AuthService, TenantOAuthService, JwtStrategy],
  exports: [AuthService, TenantOAuthService],
})
export class AuthModule {}
