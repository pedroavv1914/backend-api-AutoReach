import { Controller, Get, Delete, Param } from '@nestjs/common';
import { OAuthService } from '../auth/oauth.service';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly oauthService: OAuthService) {}

  @Get()
  async getConnectedAccounts() {
    // Using mock user ID since auth is disabled
    const mockUserId = 'mock-user-id';
    const accounts = await this.oauthService.getConnectedAccounts(mockUserId);
    
    return {
      success: true,
      data: accounts.map(account => ({
        id: account.id,
        provider: account.provider,
        externalId: account.externalId,
        status: 'connected',
        connectedAt: account.createdAt,
      })),
    };
  }

  @Delete(':provider')
  async disconnectAccount(@Param('provider') provider: string) {
    // Using mock user ID since auth is disabled
    const mockUserId = 'mock-user-id';
    
    try {
      await this.oauthService.disconnectAccount(mockUserId, provider);
      return {
        success: true,
        message: `${provider} account disconnected successfully`,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to disconnect account',
      };
    }
  }
}
