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

  // OAuth 1.0a user-context tweet
  async postTweetOAuth1(params: {
    consumerKey: string;
    consumerSecret: string;
    token: string;
    tokenSecret: string;
    text: string;
  }) {
    const { consumerKey, consumerSecret, token, tokenSecret, text } = params;
    const url = 'https://api.twitter.com/2/tweets';
    const oauth = new OAuth({
      consumer: { key: consumerKey, secret: consumerSecret },
      signature_method: 'HMAC-SHA1',
      hash_function(baseString: string, key: string) {
        return crypto.createHmac('sha1', key).update(baseString).digest('base64');
      },
    });
    const requestData = { url, method: 'POST' as const };
    const authHeader = oauth.toHeader(
      oauth.authorize(requestData, { key: token, secret: tokenSecret }),
    );
    try {
      const res = await axios.post(
        url,
        { text },
        {
          headers: {
            ...authHeader,
            'Content-Type': 'application/json',
          },
        },
      );
      return res.data?.data?.id as string | undefined;
    } catch (err: any) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      throw new Error(`twitter_oauth1_error status=${status} body=${JSON.stringify(data)}`);
    }
  }
}
