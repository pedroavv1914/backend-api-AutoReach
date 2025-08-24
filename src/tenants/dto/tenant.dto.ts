import { IsString, IsOptional, IsIn } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  name!: string;

  @IsString()
  subdomain!: string;

  @IsOptional()
  @IsString()
  @IsIn(['starter', 'professional', 'agency'])
  plan?: string;
}

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @IsIn(['starter', 'professional', 'agency'])
  plan?: string;

  @IsOptional()
  @IsString()
  @IsIn(['active', 'suspended', 'cancelled'])
  status?: string;
}
