import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TwitterService } from './twitter.service';

export type ProviderName = 'twitter' | 'instagram' | 'linkedin';

@Injectable()
export class ProvidersService {
  constructor(private readonly prisma: PrismaService, private readonly twitter: TwitterService) {}

  async publish(params: {
    provider: ProviderName;
    accountId: string; // Account.id
    content: string;
    mediaUrls: string[];
  }): Promise<{ providerPostId: string }> {
    const { provider, accountId, content } = params;

    // Carrega a conta para obter tokens
    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new Error('Conta não encontrada');

    if (provider === 'twitter') {
      const consumerKey = process.env.TWITTER_API_KEY;
      const consumerSecret = process.env.TWITTER_API_SECRET;
      // Se tivermos consumer keys e a conta possuir tokenSecret (usaremos refreshToken como tokenSecret), faz OAuth 1.0a
      if (consumerKey && consumerSecret && account.accessToken && account.refreshToken) {
        const id = await this.twitter.postTweetOAuth1({
          consumerKey,
          consumerSecret,
          token: account.accessToken,
          tokenSecret: account.refreshToken,
          text: content,
        });
        return { providerPostId: id || `twitter_${accountId.slice(-6)}_${Date.now()}` };
      }

      // Caso contrário, tenta OAuth 2.0 (Bearer)
      const id = await this.twitter.postTweet(account.accessToken, content);
      return { providerPostId: id || `twitter_${accountId.slice(-6)}_${Date.now()}` };
    }

    // Fallback para providers ainda não implementados
    const fakeId = `${provider}_${accountId.slice(-6)}_${Date.now()}`;
    return { providerPostId: fakeId };
  }
}
