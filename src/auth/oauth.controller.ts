import { Controller, Post, Body, HttpException, HttpStatus, Req } from '@nestjs/common';
import { Request } from 'express';
import { TenantOAuthService } from './tenant-oauth.service';
import { LinkedInAuthDto, InstagramAuthDto } from './dto/oauth.dto';

@Controller('auth')
export class OAuthController {
  constructor(private readonly tenantOAuthService: TenantOAuthService) {}

  @Post('linkedin')
  async linkedinCallback(@Body() dto: LinkedInAuthDto, @Req() req: Request) {
    try {
      // Use tenant-specific OAuth service
      const result = await this.tenantOAuthService.handleLinkedInCallback(
        dto.code, 
        dto.state || '', 
        req.tenantId!
      );
      return {
        success: true,
        message: result.message,
        data: result,
        tenant: req.tenant?.name,
      };
    } catch (error: any) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to connect LinkedIn account',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('instagram')
  async instagramCallback(@Body() dto: InstagramAuthDto, @Req() req: Request) {
    try {
      // Use tenant-specific OAuth service
      const result = await this.tenantOAuthService.handleInstagramCallback(
        dto.code, 
        dto.state || '', 
        req.tenantId!
      );
      return {
        success: true,
        message: result.message,
        data: result,
        tenant: req.tenant?.name,
      };
    } catch (error: any) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to connect Instagram account',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
