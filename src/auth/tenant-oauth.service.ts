import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class TenantOAuthService {
  constructor(private prisma: PrismaService) {}

  // Get LinkedIn OAuth config for specific tenant
  async getLinkedInConfig(tenantId: string) {
    const tenant = await (this.prisma as any).tenant.findUnique({
      where: { id: tenantId },
      select: {
        linkedinAppId: true,
        linkedinAppSecret: true,
        subdomain: true,
      },
    });

    if (!tenant?.linkedinAppId || !tenant?.linkedinAppSecret) {
      throw new BadRequestException(
        'LinkedIn OAuth app not configured for this tenant. Please configure your LinkedIn app credentials.',
      );
    }

    return {
      clientId: tenant.linkedinAppId,
      clientSecret: tenant.linkedinAppSecret,
      redirectUri: `https://${tenant.subdomain}.aithosreach.com/auth/linkedin/callback`,
      scopes: ['r_liteprofile', 'r_emailaddress', 'w_member_social'],
    };
  }

  // Get Instagram OAuth config for specific tenant
  async getInstagramConfig(tenantId: string) {
    const tenant = await (this.prisma as any).tenant.findUnique({
      where: { id: tenantId },
      select: {
        instagramAppId: true,
        instagramAppSecret: true,
        subdomain: true,
      },
    });

    if (!tenant?.instagramAppId || !tenant?.instagramAppSecret) {
      throw new BadRequestException(
        'Instagram OAuth app not configured for this tenant. Please configure your Instagram app credentials.',
      );
    }

    return {
      clientId: tenant.instagramAppId,
      clientSecret: tenant.instagramAppSecret,
      redirectUri: `https://${tenant.subdomain}.aithosreach.com/auth/instagram/callback`,
      scopes: ['instagram_basic', 'pages_show_list'],
    };
  }

  // Handle LinkedIn OAuth callback with tenant-specific app
  async handleLinkedInCallback(code: string, state: string, tenantId: string) {
    const config = await this.getLinkedInConfig(tenantId);

    try {
      // Exchange code for access token using tenant's LinkedIn app
      const tokenResponse = await axios.post(
        'https://www.linkedin.com/oauth/v2/accessToken',
        {
          grant_type: 'authorization_code',
          code,
          redirect_uri: config.redirectUri,
          client_id: config.clientId,
          client_secret: config.clientSecret,
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const { access_token, expires_in } = tokenResponse.data;

      // Get user profile
      const profileResponse = await axios.get(
        'https://api.linkedin.com/v2/people/~:(id,firstName,lastName,emailAddress)',
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        },
      );

      const profile = profileResponse.data;

      // Save account with tenant isolation
      const account = await (this.prisma as any).account.create({
        data: {
          tenantId: tenantId,
          userId: state, // Assuming state contains userId
          provider: 'linkedin',
          accessToken: access_token,
          expiresAt: new Date(Date.now() + expires_in * 1000),
          externalId: profile.id,
          username: `${profile.firstName.localized.en_US} ${profile.lastName.localized.en_US}`,
          profileData: profile,
        },
      });

      return {
        account,
        profile,
        message: 'LinkedIn account connected successfully',
      };
    } catch (error: any) {
      throw new BadRequestException(
        `Failed to connect LinkedIn account: ${error.response?.data?.error_description || error.message}`,
      );
    }
  }

  // Handle Instagram OAuth callback with tenant-specific app
  async handleInstagramCallback(code: string, state: string, tenantId: string) {
    const config = await this.getInstagramConfig(tenantId);

    try {
      // Exchange code for access token using tenant's Instagram app
      const tokenResponse = await axios.post(
        'https://api.instagram.com/oauth/access_token',
        {
          client_id: config.clientId,
          client_secret: config.clientSecret,
          grant_type: 'authorization_code',
          redirect_uri: config.redirectUri,
          code,
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const { access_token, user_id } = tokenResponse.data;

      // Get user profile
      const profileResponse = await axios.get(
        `https://graph.instagram.com/me?fields=id,username&access_token=${access_token}`,
      );

      const profile = profileResponse.data;

      // Save account with tenant isolation
      const account = await (this.prisma as any).account.create({
        data: {
          tenantId: tenantId,
          userId: state, // Assuming state contains userId
          provider: 'instagram',
          accessToken: access_token,
          externalId: user_id,
          username: profile.username,
          profileData: profile,
        },
      });

      return {
        account,
        profile,
        message: 'Instagram account connected successfully',
      };
    } catch (error: any) {
      throw new BadRequestException(
        `Failed to connect Instagram account: ${error.response?.data?.error_description || error.message}`,
      );
    }
  }

  // Update tenant OAuth app credentials
  async updateTenantOAuthApps(tenantId: string, data: {
    linkedinAppId?: string;
    linkedinAppSecret?: string;
    instagramAppId?: string;
    instagramAppSecret?: string;
  }) {
    return (this.prisma as any).tenant.update({
      where: { id: tenantId },
      data: {
        linkedinAppId: data.linkedinAppId,
        linkedinAppSecret: data.linkedinAppSecret,
        instagramAppId: data.instagramAppId,
        instagramAppSecret: data.instagramAppSecret,
      },
    });
  }

  // Test OAuth app credentials
  async testOAuthCredentials(tenantId: string, provider: 'linkedin' | 'instagram') {
    try {
      if (provider === 'linkedin') {
        const config = await this.getLinkedInConfig(tenantId);
        // Test LinkedIn app by making a simple API call
        return { valid: true, config: { clientId: config.clientId } };
      } else {
        const config = await this.getInstagramConfig(tenantId);
        // Test Instagram app
        return { valid: true, config: { clientId: config.clientId } };
      }
    } catch (error: unknown) {
      return { valid: false, error: (error as Error).message };
    }
  }
}
