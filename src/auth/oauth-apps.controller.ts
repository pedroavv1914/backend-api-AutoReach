import { 
  Controller, 
  Post, 
  Put, 
  Get, 
  Body, 
  Param, 
  HttpException, 
  HttpStatus, 
  Req 
} from '@nestjs/common';
import { Request } from 'express';
import { TenantOAuthService } from './tenant-oauth.service';
import { UpdateOAuthAppsDto, TestOAuthAppDto } from './dto/oauth-apps.dto';

@Controller('oauth-apps')
export class OAuthAppsController {
  constructor(private readonly tenantOAuthService: TenantOAuthService) {}

  @Get('config')
  async getOAuthConfig(@Req() req: Request) {
    try {
      const tenantId = req.tenantId!;
      
      // Get current OAuth app configuration (without secrets)
      const linkedinConfig = await this.getConfigSafely('linkedin', tenantId!);
      const instagramConfig = await this.getConfigSafely('instagram', tenantId!);

      return {
        success: true,
        data: {
          linkedin: linkedinConfig,
          instagram: instagramConfig,
        },
        tenant: req.tenant?.name,
      };
    } catch (error: any) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to get OAuth configuration',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put('config')
  async updateOAuthConfig(@Body() dto: UpdateOAuthAppsDto, @Req() req: Request) {
    try {
      const tenantId = req.tenantId!;
      
      const updatedTenant = await this.tenantOAuthService.updateTenantOAuthApps(
        tenantId,
        dto
      );

      return {
        success: true,
        message: 'OAuth app configuration updated successfully',
        data: {
          linkedinConfigured: !!updatedTenant.linkedinAppId,
          instagramConfigured: !!updatedTenant.instagramAppId,
        },
        tenant: req.tenant?.name,
      };
    } catch (error: any) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to update OAuth configuration',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('test')
  async testOAuthApp(@Body() dto: TestOAuthAppDto, @Req() req: Request) {
    try {
      const tenantId = req.tenantId!;
      
      const result = await this.tenantOAuthService.testOAuthCredentials(
        tenantId,
        dto.provider
      );

      return {
        success: result.valid,
        message: result.valid 
          ? `${dto.provider} OAuth app credentials are valid`
          : `${dto.provider} OAuth app credentials are invalid`,
        data: result,
        tenant: req.tenant?.name,
      };
    } catch (error: any) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to test OAuth credentials',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('authorization-urls')
  async getAuthorizationUrls(@Req() req: Request) {
    try {
      const tenantId = req.tenantId!;
      
      const linkedinConfig = await this.getConfigSafely('linkedin', tenantId);
      const instagramConfig = await this.getConfigSafely('instagram', tenantId);

      const urls = {
        linkedin: linkedinConfig.configured 
          ? this.buildLinkedInAuthUrl(linkedinConfig.clientId!, linkedinConfig.redirectUri!)
          : null,
        instagram: instagramConfig.configured
          ? this.buildInstagramAuthUrl(instagramConfig.clientId!, instagramConfig.redirectUri!)
          : null,
      };

      return {
        success: true,
        data: urls,
        tenant: req.tenant?.name,
      };
    } catch (error: unknown) {
      throw new HttpException(
        {
          success: false,
          message: (error as Error).message || 'Failed to generate authorization URLs',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async getConfigSafely(provider: 'linkedin' | 'instagram', tenantId: string) {
    try {
      const config = provider === 'linkedin' 
        ? await this.tenantOAuthService.getLinkedInConfig(tenantId)
        : await this.tenantOAuthService.getInstagramConfig(tenantId);
      
      return {
        configured: true,
        clientId: config.clientId,
        redirectUri: config.redirectUri,
        scopes: config.scopes,
      };
    } catch (error: unknown) {
      return {
        configured: false,
        error: (error as Error).message,
      };
    }
  }

  private buildLinkedInAuthUrl(clientId: string, redirectUri: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'r_liteprofile r_emailaddress w_member_social',
      state: 'linkedin_auth', // Should be random in production
    });

    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  private buildInstagramAuthUrl(clientId: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'instagram_basic,pages_show_list',
      response_type: 'code',
      state: 'instagram_auth', // Should be random in production
    });

    return `https://api.instagram.com/oauth/authorize?${params.toString()}`;
  }
}
