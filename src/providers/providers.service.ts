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
      // Publica texto simples (por ora). Para mídias, seria necessário upload prévio.
      const id = await this.twitter.postTweet(account.accessToken, content);
      return { providerPostId: id || `twitter_${accountId.slice(-6)}_${Date.now()}` };
    }

    // Fallback para providers ainda não implementados
    const fakeId = `${provider}_${accountId.slice(-6)}_${Date.now()}`;
    return { providerPostId: fakeId };
  }
}
