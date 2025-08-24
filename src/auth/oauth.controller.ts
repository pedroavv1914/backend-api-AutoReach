import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { OAuthService } from './oauth.service';
import { LinkedInAuthDto, InstagramAuthDto } from './dto/oauth.dto';

@Controller('auth')
export class OAuthController {
  constructor(private readonly oauthService: OAuthService) {}

  @Post('linkedin')
  async linkedinCallback(@Body() dto: LinkedInAuthDto) {
    try {
      const result = await this.oauthService.handleLinkedInCallback(dto.code, dto.state);
      return {
        success: true,
        message: 'LinkedIn account connected successfully',
        data: result,
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
  async instagramCallback(@Body() dto: InstagramAuthDto) {
    try {
      const result = await this.oauthService.handleInstagramCallback(dto.code, dto.state);
      return {
        success: true,
        message: 'Instagram account connected successfully',
        data: result,
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
