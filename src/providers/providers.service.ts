import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type ProviderName = 'twitter' | 'instagram' | 'linkedin';

@Injectable()
export class ProvidersService {
  constructor(private readonly prisma: PrismaService) {}

  // Stub de publicação real. Aqui integraremos SDKs/APIs reais por provider.
  async publish(params: {
    provider: ProviderName;
    accountId: string; // Account.id
    content: string;
    mediaUrls: string[];
  }): Promise<{ providerPostId: string }> {
    const { provider, accountId, content, mediaUrls } = params;

    // TODO: implementar publicação real por provider.
    // Por enquanto, simula sucesso retornando um ID fake composto.
    const fakeId = `${provider}_${accountId.slice(-6)}_${Date.now()}`;
    return { providerPostId: fakeId };
  }
}
