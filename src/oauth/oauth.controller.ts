import { Controller, Get, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OAuthService } from './oauth.service';

@Controller('oauth')
export class OAuthController {
  constructor(private readonly oauth: OAuthService) {}

  @Get(':provider/start')
  @UseGuards(JwtAuthGuard)
  async start(@Req() req: any, @Param('provider') provider: string, @Query('redirectUri') redirectUri?: string) {
    const state = await this.oauth.issueState(req.user.email, provider, redirectUri);
    const authUrl = this.oauth.buildAuthUrl(provider, state, redirectUri);
    return { authUrl, state };
  }

  @Get(':provider/callback')
  async callback(
    @Req() req: any,
    @Param('provider') provider: string,
    @Query('code') code?: string,
    @Query('state') state?: string,
    // placeholder para teste local sem fluxo real
    @Query('access_token') accessToken?: string,
    @Query('refresh_token') refreshToken?: string,
    @Query('external_id') externalId?: string,
  ) {
    // email virá do state salvo no serviço (não requer JWT aqui)
    return this.oauth.handleCallback(undefined as any, provider, { code, state, accessToken, refreshToken, externalId });
  }
}
