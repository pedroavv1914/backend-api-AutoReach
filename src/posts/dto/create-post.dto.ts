import { IsArray, IsDateString, IsOptional, IsString, ArrayNotEmpty } from 'class-validator';

export class CreatePostDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaUrls?: string[];

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  networks!: string[];

  @IsDateString()
  scheduledAt!: string; // ISO datetime
}
