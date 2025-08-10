import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { TwitterService } from './twitter.service';

// oauth-1.0a is CommonJS
// eslint-disable-next-line @typescript-eslint/no-var-requires
const OAuth = require('oauth-1.0a');
import * as crypto from 'crypto';

function mask(str?: string, show = 4) {
  if (!str) return '';
  if (str.length <= show * 2) return '*'.repeat(Math.max(0, str.length - show)) + str.slice(-show);
  return str.slice(0, show) + '...' + str.slice(-show);
}

@UseGuards(JwtAuthGuard)
@Controller('providers/twitter')
export class TwitterDebugController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly twitter: TwitterService,
  ) {}

  // GET /api/providers/twitter/verify
  @Get('verify')
  async verify(@Req() req: any) {
    const email = req.user?.email as string;
    if (!email) throw new Error('Usuário não identificado');

    const account = await this.prisma.account.findFirst({
      where: { user: { email }, provider: 'twitter' },
      orderBy: { createdAt: 'desc' },
    });
    if (!account) throw new Error('Conta do Twitter não encontrada para este usuário');

    const consumerKey = process.env.TWITTER_API_KEY || '';
    const consumerSecret = process.env.TWITTER_API_SECRET || '';

    try {
      const result = await this.twitter.verifyCredentials({
        consumerKey,
        consumerSecret,
        token: account.accessToken,
        tokenSecret: account.refreshToken || '',
      });
      return {
        ok: true,
        app: { key: mask(consumerKey), secret: `len=${consumerSecret?.length || 0}` },
        userToken: { token: mask(account.accessToken), secret: `len=${account.refreshToken?.length || 0}` },
        verify: { id: result?.id, screen_name: result?.screen_name, name: result?.name },
      };
    } catch (err: any) {
      return {
        ok: false,
        app: { key: mask(consumerKey), secret: `len=${consumerSecret?.length || 0}` },
        userToken: { token: mask(account.accessToken), secret: `len=${account.refreshToken?.length || 0}` },
        error: String(err?.message || err),
      };
    }
  }

  // POST /api/providers/twitter/test-signature
  @Post('test-signature')
  async testSignature(@Req() req: any, @Body() body: { text?: string }) {
    const email = req.user?.email as string;
    if (!email) throw new Error('Usuário não identificado');

    const account = await this.prisma.account.findFirst({
      where: { user: { email }, provider: 'twitter' },
      orderBy: { createdAt: 'desc' },
    });
    if (!account) throw new Error('Conta do Twitter não encontrada para este usuário');

    const text = body?.text || 'debug signature';

    const consumerKey = process.env.TWITTER_API_KEY || '';
    const consumerSecret = process.env.TWITTER_API_SECRET || '';

    const oauth = new OAuth({
      consumer: { key: consumerKey, secret: consumerSecret },
      signature_method: 'HMAC-SHA1',
      hash_function(baseString: string, key: string) {
        return crypto.createHmac('sha1', key).update(baseString).digest('base64');
      },
    });

    const urlV11 = 'https://api.twitter.com/1.1/statuses/update.json';
    const requestDataV11 = { url: urlV11, method: 'POST' as const, data: { status: text } };
    const oauthData = oauth.authorize(requestDataV11, {
      key: account.accessToken,
      secret: account.refreshToken || '',
    });
    const headers = oauth.toHeader(oauthData);

    // Do not return raw secrets; mask sensitive values
    return {
      url: urlV11,
      method: 'POST',
      body: { status: text },
      app: { key: mask(consumerKey), secret: `len=${consumerSecret?.length || 0}` },
      userToken: { token: mask(account.accessToken), secret: `len=${account.refreshToken?.length || 0}` },
      authHeader: mask(headers.Authorization, 12),
      note: 'Assinatura gerada para v1.1 com body form-urlencoded (status).',
    };
  }
}
