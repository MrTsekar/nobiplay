import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthService } from '../service/auth.service';
import { AuthGuard } from '@nestjs/passport';
import { RegisterUserDto } from '../../user/dto/register-user.dto';
import { LoginUserDto } from '../../user/dto/login-user.dto';
import { AuthResponseDto } from '../dto/auth.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @ApiOperation({ summary: 'Register user', description: 'Create a new user account' })
  @ApiResponse({ status: 201, description: 'User registered successfully', type: AuthResponseDto })
  @Post('register')
  async register(@Body() dto: RegisterUserDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @ApiOperation({ summary: 'Login user', description: 'Authenticate user with phone and PIN' })
  @ApiResponse({ status: 200, description: 'Login successful, returns JWT token and user details', type: AuthResponseDto })
  @Post('login')
  async login(@Body() dto: LoginUserDto): Promise<AuthResponseDto> {
    const user = await this.authService.validateUser(dto.phone, dto.pin);
    if (!user) return { error: 'Invalid credentials' } as any;
    return this.authService.login(user);
  }

  @ApiOperation({ summary: 'Get profile', description: 'Get authenticated user profile' })
  @ApiBearerAuth('JWT')
  @ApiResponse({ status: 200, description: 'User profile' })
  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  profile(@Req() req: any) {
    return req.user;
  }
}
