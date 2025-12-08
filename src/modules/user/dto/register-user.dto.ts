import { IsString, IsPhoneNumber, IsOptional, Length, MinLength, IsEmail } from 'class-validator';

export class RegisterUserDto {
  @IsPhoneNumber('NG')
  phone: string;

  @IsString()
  @Length(4, 6, { message: 'PIN must be 4-6 digits' })
  pin: string;

  @IsString()
  @MinLength(2)
  displayName: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  referralCode?: string;

  @IsOptional()
  @IsString()
  tribe?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  campus?: string;
}
