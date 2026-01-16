import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../user/service/users.service';
import { RegisterUserDto } from '../../user/dto/register-user.dto';
import { AuthResponseDto, UserResponseDto } from '../dto/auth.dto';
import { User } from '../../user/entity/user.entity';

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService, private jwtService: JwtService) {}

  async register(registerDto: RegisterUserDto): Promise<AuthResponseDto> {
    const existing = await this.usersService.findByPhone(registerDto.phone);
    if (existing) throw new ConflictException('Phone number already registered');
    const user = await this.usersService.register(registerDto);
    return this.login(user);
  }

  async validateUser(phone: string, pin: string) {
    const user = await this.usersService.findByPhone(phone);
    if (!user) return null;
    const isValid = await this.usersService.verifyPin(user.id, pin);
    if (!isValid) return null;
    return user;
  }

  async login(user: User): Promise<AuthResponseDto> {
    const payload = { phone: user.phone, sub: user.id };
    const access_token = await this.jwtService.signAsync(payload);
    
    // Create user response DTO excluding sensitive fields
    const userResponse = this.toUserResponseDto(user);
    
    return {
      access_token,
      user: userResponse,
    };
  }

  private toUserResponseDto(user: User): UserResponseDto {
    const { password, pinHash, ...userWithoutSensitiveData } = user as any;
    return userWithoutSensitiveData;
  }
}
