import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class TwitterService {
  async postTweet(accessToken: string, text: string) {
    const url = 'https://api.twitter.com/2/tweets';
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
  }
}
