import { Injectable, BadRequestException } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import axios from 'axios';
import { AccountsService } from '../accounts/accounts.service';

// Armazena state + PKCE com expiração curta
type StateRecord = { email: string; provider: string; redirectUri?: string; exp: number; codeVerifier?: string };

@Injectable()
export class OAuthService {
  private states = new Map<string, StateRecord>();

  constructor(private readonly accounts: AccountsService) {}

  async issueState(email: string, provider: string, redirectUri?: string) {
    const state = randomBytes(16).toString('hex');
    const exp = Date.now() + 5 * 60 * 1000; // 5 minutos
    // PKCE para Twitter OAuth2
    const codeVerifier = this.base64url(randomBytes(32));
    this.states.set(state, { email, provider, redirectUri, exp, codeVerifier });
    return state;
  }

  buildAuthUrl(provider: string, state: string, redirectUri?: string) {
    if (provider === 'twitter') {
      const rec = this.states.get(state);
      if (!rec) throw new BadRequestException('State inválido');
      const clientId = process.env.TWITTER_CLIENT_ID as string;
      const finalRedirect = redirectUri || (process.env.TWITTER_REDIRECT_URI as string);
      if (!clientId || !finalRedirect) throw new BadRequestException('Env TWITTER_CLIENT_ID/TWITTER_REDIRECT_URI ausentes');

      const codeChallenge = this.pkceChallenge(rec.codeVerifier!);
      const scope = ['tweet.read', 'tweet.write', 'users.read', 'offline.access'].join(' ');
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: finalRedirect,
        scope,
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      });
      return `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
    }

    // Fallback placeholder para outros providers
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
    email: string | undefined,
    provider: string,
    params: { code?: string; state?: string; accessToken?: string; refreshToken?: string; externalId?: string },
  ) {
    // Validar state
    const rec = params.state ? this.states.get(params.state) : undefined;
    if (!rec) throw new BadRequestException('State inválido ou expirado');
    if (rec.exp < Date.now()) {
      this.states.delete(params.state!);
      throw new BadRequestException('State expirado');
    }
    const effectiveEmail = email || rec.email; // permite callback público sem JWT
    if (rec.email !== effectiveEmail || rec.provider !== provider) {
      throw new BadRequestException('State não corresponde ao contexto');
    }

    let accessToken = params.accessToken || '';
    let refreshToken = params.refreshToken || undefined;
    let externalId = params.externalId || undefined;
    let expiresAt: Date | undefined = undefined;

    if (provider === 'twitter') {
      if (!params.code) throw new BadRequestException('Code ausente');
      const tokenUrl = 'https://api.twitter.com/2/oauth2/token';
      const clientId = process.env.TWITTER_CLIENT_ID as string;
      const clientSecret = process.env.TWITTER_CLIENT_SECRET as string;
      const redirectUri = rec.redirectUri || (process.env.TWITTER_REDIRECT_URI as string);
      if (!clientId || !clientSecret || !redirectUri) throw new BadRequestException('Env do Twitter ausentes');

      const data = new URLSearchParams({
        grant_type: 'authorization_code',
        code: params.code,
        redirect_uri: redirectUri,
        client_id: clientId,
        code_verifier: rec.codeVerifier!,
      });

      const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const res = await axios.post(tokenUrl, data.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${basic}`,
        },
      });
      accessToken = res.data.access_token;
      refreshToken = res.data.refresh_token;
      const expiresIn = res.data.expires_in as number | undefined; // segundos
      expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined;
      // Twitter não retorna external user id aqui; podemos buscar depois via /2/users/me
    }

    this.states.delete(params.state!);

    // Criar/atualizar conta
    const saved = await this.accounts.connect(effectiveEmail, {
      provider,
      accessToken: accessToken || `dummy_access_${provider}_${Date.now()}`,
      refreshToken,
      externalId,
      expiresAt: expiresAt ? expiresAt.toISOString() : undefined,
    });

    return { accountId: (saved as any).id, provider, externalId: externalId || null };
  }

  private base64url(buf: Buffer) {
    return buf
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }

  private pkceChallenge(verifier: string) {
    const hash = createHash('sha256').update(verifier).digest();
    return this.base64url(hash);
  }
}
