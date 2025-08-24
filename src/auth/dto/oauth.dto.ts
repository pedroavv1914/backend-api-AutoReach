import { IsString, IsOptional } from 'class-validator';

export class LinkedInAuthDto {
  @IsString()
  code!: string;

  @IsOptional()
  @IsString()
  state?: string;
}

export class InstagramAuthDto {
  @IsString()
  code!: string;

  @IsOptional()
  @IsString()
  state?: string;
}
