import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../user/service/users.service';
import { RegisterUserDto } from '../../user/dto/register-user.dto';

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService, private jwtService: JwtService) {}

  async register(registerDto: RegisterUserDto) {
    const existing = await this.usersService.findByPhone(registerDto.phone);
    if (existing) throw new ConflictException('Phone number already registered');
    const user = await this.usersService.register(registerDto);
    return { id: user.id, phone: user.phone };
  }

  async validateUser(phone: string, pin: string) {
    const user = await this.usersService.findByPhone(phone);
    if (!user) return null;
    const isValid = await this.usersService.verifyPin(user.id, pin);
    if (!isValid) return null;
    return user;
  }

  async login(user: any) {
    const payload = { phone: user.phone, sub: user.id };
    return {
      access_token: await this.jwtService.signAsync(payload)
    };
  }
}
