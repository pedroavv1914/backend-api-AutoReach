import { Injectable, BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { AccountsService } from '../accounts/accounts.service';

// Scaffolding simples: armazena states em memória com expiração curta
type StateRecord = { email: string; provider: string; redirectUri?: string; exp: number };

@Injectable()
export class OAuthService {
  private states = new Map<string, StateRecord>();

  constructor(private readonly accounts: AccountsService) {}

  async issueState(email: string, provider: string, redirectUri?: string) {
    const state = randomBytes(16).toString('hex');
    const exp = Date.now() + 5 * 60 * 1000; // 5 minutos
    this.states.set(state, { email, provider, redirectUri, exp });
    return state;
  }

  buildAuthUrl(provider: string, state: string, redirectUri?: string) {
    // Placeholder: normalmente aqui montamos a URL de autorização oficial
    // Devolve uma URL simbólica com query params úteis para testes locais
    const base = `https://auth.example/${provider}`;
    const params = new URLSearchParams();
    params.set('response_type', 'code');
    params.set('client_id', `CLIENT_ID_${provider.toUpperCase()}`);
    if (redirectUri) params.set('redirect_uri', redirectUri);
    params.set('state', state);
    params.set('scope', 'basic');
    return `${base}?${params.toString()}`;
  }

  async handleCallback(
    email: string,
    provider: string,
    params: { code?: string; state?: string; accessToken?: string; refreshToken?: string; externalId?: string },
  ) {
    // Validar state se fornecido
    if (params.state) {
      const rec = this.states.get(params.state);
      if (!rec) throw new BadRequestException('State inválido ou expirado');
      if (rec.exp < Date.now()) {
        this.states.delete(params.state);
        throw new BadRequestException('State expirado');
      }
      if (rec.email !== email || rec.provider !== provider) {
        throw new BadRequestException('State não corresponde ao contexto');
      }
      this.states.delete(params.state);
    }

    // Placeholder: caso real trocaria code por tokens na API do provider
    const accessToken = params.accessToken || `dummy_access_${provider}_${Date.now()}`;
    const refreshToken = params.refreshToken || null;
    const externalId = params.externalId || `ext_${provider}_${Date.now()}`;

    // Criar/atualizar conta
    const res = await this.accounts.connect(email, {
      provider,
      accessToken,
      refreshToken: refreshToken || undefined,
      externalId,
    });

    return { accountId: (res as any).id, provider, externalId };
  }
}
