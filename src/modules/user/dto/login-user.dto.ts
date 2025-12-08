import { IsString, IsPhoneNumber, Length } from 'class-validator';

export class LoginUserDto {
  @IsPhoneNumber('NG')
  phone: string;

  @IsString()
  @Length(4, 6, { message: 'PIN must be 4-6 digits' })
  pin: string;
}
