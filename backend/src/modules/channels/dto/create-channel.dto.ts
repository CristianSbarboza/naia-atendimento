import { IsIn, IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateChannelDto {
  @IsIn(['whatsapp', 'webchat'])
  type!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  instanceName?: string;

  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}
