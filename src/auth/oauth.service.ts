import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

// Mock ConfigService since @nestjs/config is not installed
class MockConfigService {
  get(key: string): string {
    const envVars: Record<string, string> = {
      LINKEDIN_CLIENT_ID: 'your-linkedin-client-id',
      LINKEDIN_CLIENT_SECRET: 'your-linkedin-client-secret',
      LINKEDIN_REDIRECT_URI: 'http://localhost:3001/auth/linkedin/callback',
      INSTAGRAM_CLIENT_ID: 'your-instagram-client-id',
      INSTAGRAM_CLIENT_SECRET: 'your-instagram-client-secret',
      INSTAGRAM_REDIRECT_URI: 'http://localhost:3001/auth/instagram/callback',
    };
    return envVars[key] || '';
  }
}

@Injectable()
export class OAuthService {
  private readonly config = new MockConfigService();
  
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async handleLinkedInCallback(code: string, state?: string) {
    // Exchange authorization code for access token
    const tokenResponse = await this.exchangeLinkedInCode(code);
    
    // Get user profile information
    const profileData = await this.getLinkedInProfile(tokenResponse.access_token);
    
    // For now, we'll use a mock user ID since auth is disabled
    // In production, you'd get this from the authenticated user
    const mockUserId = 'mock-user-id';
    
    // Check if account already exists
    const existingAccount = await this.prisma.account.findFirst({
      where: {
        userId: mockUserId,
        provider: 'linkedin',
      },
    });

    let account;
    if (existingAccount) {
      // Update existing account
      account = await this.prisma.account.update({
        where: { id: existingAccount.id },
        data: {
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token,
          expiresAt: tokenResponse.expires_in 
            ? new Date(Date.now() + tokenResponse.expires_in * 1000)
            : null,
        },
      });
    } else {
      // Create new account
      account = await this.prisma.account.create({
        data: {
          userId: mockUserId,
          provider: 'linkedin',
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token,
          expiresAt: tokenResponse.expires_in 
            ? new Date(Date.now() + tokenResponse.expires_in * 1000)
            : null,
          externalId: profileData.id,
        },
      });
    }

    return {
      accountId: account.id,
      provider: 'linkedin',
      username: profileData.localizedFirstName + ' ' + profileData.localizedLastName,
    };
  }

  async handleInstagramCallback(code: string, state?: string) {
    // Exchange authorization code for access token
    const tokenResponse = await this.exchangeInstagramCode(code);
    
    // Get user profile information
    const profileData = await this.getInstagramProfile(tokenResponse.access_token);
    
    // For now, we'll use a mock user ID since auth is disabled
    const mockUserId = 'mock-user-id';
    
    // Check if account already exists
    const existingAccount = await this.prisma.account.findFirst({
      where: {
        userId: mockUserId,
        provider: 'instagram',
      },
    });

    let account;
    if (existingAccount) {
      // Update existing account
      account = await this.prisma.account.update({
        where: { id: existingAccount.id },
        data: {
          accessToken: tokenResponse.access_token,
          expiresAt: tokenResponse.expires_in 
            ? new Date(Date.now() + tokenResponse.expires_in * 1000)
            : null,
        },
      });
    } else {
      // Create new account
      account = await this.prisma.account.create({
        data: {
          userId: mockUserId,
          provider: 'instagram',
          accessToken: tokenResponse.access_token,
          expiresAt: tokenResponse.expires_in 
            ? new Date(Date.now() + tokenResponse.expires_in * 1000)
            : null,
          externalId: profileData.id,
        },
      });
    }

    return {
      accountId: account.id,
      provider: 'instagram',
      username: profileData.username,
    };
  }

  private async exchangeLinkedInCode(code: string) {
    const clientId = this.config.get('LINKEDIN_CLIENT_ID');
    const clientSecret = this.config.get('LINKEDIN_CLIENT_SECRET');
    const redirectUri = this.config.get('LINKEDIN_REDIRECT_URI');

    if (!clientId || !clientSecret || !redirectUri) {
      throw new HttpException(
        'LinkedIn OAuth configuration missing',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    try {
      const response = await axios.post(
        'https://www.linkedin.com/oauth/v2/accessToken',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      return response.data;
    } catch (error) {
      throw new HttpException(
        'Failed to exchange LinkedIn authorization code',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async getLinkedInProfile(accessToken: string) {
    try {
      const response = await axios.get(
        'https://api.linkedin.com/v2/me',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      throw new HttpException(
        'Failed to fetch LinkedIn profile',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async exchangeInstagramCode(code: string) {
    const clientId = this.config.get('INSTAGRAM_CLIENT_ID');
    const clientSecret = this.config.get('INSTAGRAM_CLIENT_SECRET');
    const redirectUri = this.config.get('INSTAGRAM_REDIRECT_URI');

    if (!clientId || !clientSecret || !redirectUri) {
      throw new HttpException(
        'Instagram OAuth configuration missing',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    try {
      const response = await axios.post(
        'https://api.instagram.com/oauth/access_token',
        new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
          code,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      return response.data;
    } catch (error) {
      throw new HttpException(
        'Failed to exchange Instagram authorization code',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async getInstagramProfile(accessToken: string) {
    try {
      const response = await axios.get(
        'https://graph.instagram.com/me?fields=id,username',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      throw new HttpException(
        'Failed to fetch Instagram profile',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getConnectedAccounts(userId: string) {
    return this.prisma.account.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        provider: true,
        externalId: true,
        createdAt: true,
      },
    });
  }

  async disconnectAccount(userId: string, provider: string) {
    const account = await this.prisma.account.findFirst({
      where: {
        userId,
        provider,
      },
    });
    
    if (account) {
      return this.prisma.account.delete({
        where: { id: account.id },
      });
    }
    
    return null;
  }
}
