import { IsString, IsPhoneNumber, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsPhoneNumber('NG')
  phone: string;

  @IsString()
  @Length(6, 6, { message: 'OTP must be 6 digits' })
  otp: string;
}

export class RequestOtpDto {
  @IsPhoneNumber('NG')
  phone: string;
}
