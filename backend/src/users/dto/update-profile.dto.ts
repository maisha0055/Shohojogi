// ============================================
// FILE: src/users/dto/update-profile.dto.ts
// ============================================
import { IsString, IsOptional, IsUrl } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsUrl()
  @IsOptional()
  profilePhoto?: string;

  @IsString()
  @IsOptional()
  address?: string;
}