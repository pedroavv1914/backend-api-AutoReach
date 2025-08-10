import { Injectable } from '@nestjs/common';
import axios from 'axios';
// oauth-1.0a usa CommonJS; a importação via default pode quebrar em TS
// eslint-disable-next-line @typescript-eslint/no-var-requires
const OAuth = require('oauth-1.0a');
import * as crypto from 'crypto';

@Injectable()
export class TwitterService {
  async postTweet(accessToken: string, text: string) {
    const url = 'https://api.twitter.com/2/tweets';
    try {
      const res = await axios.post(
        url,
        { text },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
      // response format: { data: { id: '...', text: '...' } }
      return res.data?.data?.id as string | undefined;
    } catch (err: any) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      throw new Error(`twitter_oauth2_error status=${status} body=${JSON.stringify(data)}`);
    }
  }

  // Verifica credenciais OAuth 1.0a do usuário
  async verifyCredentials(params: {
    consumerKey: string;
    consumerSecret: string;
    token: string;
    tokenSecret: string;
  }) {
    const { consumerKey, consumerSecret, token, tokenSecret } = params;
    const oauth = new OAuth({
      consumer: { key: consumerKey, secret: consumerSecret },
      signature_method: 'HMAC-SHA1',
      hash_function(baseString: string, key: string) {
        return crypto.createHmac('sha1', key).update(baseString).digest('base64');
      },
    });
    const verifyUrl = 'https://api.twitter.com/1.1/account/verify_credentials.json';
    const reqVerify = { url: verifyUrl, method: 'GET' as const };
    const authVerify = oauth.toHeader(
      oauth.authorize(reqVerify, { key: token, secret: tokenSecret }),
    );
    try {
      const res = await axios.get(verifyUrl, { headers: { ...authVerify } });
      return res.data; // inclui id, screen_name, etc.
    } catch (vErr: any) {
      const vs = vErr?.response?.status;
      const vd = vErr?.response?.data;
      throw new Error(`twitter_oauth1_verify_error status=${vs} body=${JSON.stringify(vd)}`);
    }
  }

  // OAuth 1.0a user-context tweet
  async postTweetOAuth1(params: {
    consumerKey: string;
    consumerSecret: string;
    token: string;
    tokenSecret: string;
    text: string;
  }) {
    const { consumerKey, consumerSecret, token, tokenSecret, text } = params;
    const urlV11 = 'https://api.twitter.com/1.1/statuses/update.json';
    const urlV2 = 'https://api.twitter.com/2/tweets';
    const oauth = new OAuth({
      consumer: { key: consumerKey, secret: consumerSecret },
      signature_method: 'HMAC-SHA1',
      hash_function(baseString: string, key: string) {
        return crypto.createHmac('sha1', key).update(baseString).digest('base64');
      },
    });
    // 0) Verifica credenciais do usuário (ajuda a diagnosticar 401/89)
    try {
      const verifyUrl = 'https://api.twitter.com/1.1/account/verify_credentials.json';
      const reqVerify = { url: verifyUrl, method: 'GET' as const };
      const authVerify = oauth.toHeader(
        oauth.authorize(reqVerify, { key: token, secret: tokenSecret }),
      );
      await axios.get(verifyUrl, { headers: { ...authVerify } });
    } catch (vErr: any) {
      const vs = vErr?.response?.status;
      const vd = vErr?.response?.data;
      throw new Error(`twitter_oauth1_verify_error status=${vs} body=${JSON.stringify(vd)} hint="Confira se consumer key/secret e user token/secret são do MESMO app e se a permissão é Read and write"`);
    }

    // 1) Tentar v1.1 com form-urlencoded (inclui body params na assinatura OAuth)
    try {
      const form = new URLSearchParams({ status: text });
      const requestDataV11 = { url: urlV11, method: 'POST' as const, data: { status: text } };
      const authHeaderV11 = oauth.toHeader(
        oauth.authorize(requestDataV11, { key: token, secret: tokenSecret }),
      );
      const res = await axios.post(
        urlV11,
        form.toString(),
        {
          headers: {
            ...authHeaderV11,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );
      // v1.1 retorna JSON com id_str
      return res.data?.id_str as string | undefined;
    } catch (errV11: any) {
      const status = errV11?.response?.status;
      const data = errV11?.response?.data;
      // 2) Fallback para v2 com JSON
      try {
        const requestDataV2 = { url: urlV2, method: 'POST' as const };
        const authHeaderV2 = oauth.toHeader(
          oauth.authorize(requestDataV2, { key: token, secret: tokenSecret }),
        );
        const res2 = await axios.post(
          urlV2,
          { text },
          {
            headers: {
              ...authHeaderV2,
              'Content-Type': 'application/json',
            },
          },
        );
        return res2.data?.data?.id as string | undefined;
      } catch (errV2: any) {
        const st2 = errV2?.response?.status;
        const d2 = errV2?.response?.data;
        throw new Error(
          `twitter_oauth1_error status_v11=${status} body_v11=${JSON.stringify(data)} status_v2=${st2} body_v2=${JSON.stringify(d2)}`,
        );
      }
    }
  }
}
