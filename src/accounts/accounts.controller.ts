import { Controller, Get, Delete, Param, Req } from '@nestjs/common';
import { Request } from 'express';
import { TenantOAuthService } from '../auth/tenant-oauth.service';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly tenantOAuthService: TenantOAuthService) {}

  @Get()
  async getConnectedAccounts(@Req() req: Request) {
    // TODO: Implement getConnectedAccounts in TenantOAuthService
    return {
      success: true,
      data: [],
      message: 'Connected accounts feature needs to be implemented with tenant support',
    };
  }

  @Delete(':provider')
  async disconnectAccount(@Param('provider') provider: string, @Req() req: Request) {
    // TODO: Implement disconnectAccount in TenantOAuthService
    return {
      success: false,
      message: 'Disconnect account feature needs to be implemented with tenant support',
    };
  }
}
