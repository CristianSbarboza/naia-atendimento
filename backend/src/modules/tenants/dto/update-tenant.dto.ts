import { IsOptional, IsString, MinLength, Matches, IsIn } from 'class-validator';

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'slug deve conter apenas letras minúsculas, números e hífens' })
  slug?: string;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;
}
