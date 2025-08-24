import { IsOptional, IsString, IsIn } from 'class-validator';

export class UpdateOAuthAppsDto {
  @IsOptional()
  @IsString()
  linkedinAppId?: string;

  @IsOptional()
  @IsString()
  linkedinAppSecret?: string;

  @IsOptional()
  @IsString()
  instagramAppId?: string;

  @IsOptional()
  @IsString()
  instagramAppSecret?: string;
}

export class TestOAuthAppDto {
  @IsString()
  @IsIn(['linkedin', 'instagram'])
  provider!: 'linkedin' | 'instagram';
}
