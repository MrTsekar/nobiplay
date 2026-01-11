import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { UsersService } from '../service/users.service';
import { OtpService } from '../service/otp.service';
import { RegisterUserDto, LoginUserDto, VerifyOtpDto, RequestOtpDto, UpdateUserDto, UpdatePinDto } from '../dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserPayload } from '../../../common/interfaces/user-payload.interface';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly otpService: OtpService,
  ) {}

  /**
   * Step 1: Request OTP for phone verification
   * POST /users/request-otp
   */
  @Post('request-otp')
  @HttpCode(HttpStatus.OK)
  async requestOtp(@Body() requestOtpDto: RequestOtpDto) {
    await this.otpService.generateAndSendOtp(requestOtpDto.phone);

    return {
      success: true,
      message: 'OTP sent successfully',
      data: {
        phone: requestOtpDto.phone,
        expiresIn: '10 minutes',
      },
    };
  }

  /**
   * Step 2: Register new user (after OTP verification)
   * POST /users/register
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterUserDto) {
    // Create user (unverified)
    const user = await this.usersService.register(registerDto);

    // Send OTP for verification
    await this.otpService.generateAndSendOtp(user.phone);

    return {
      success: true,
      message: 'User registered successfully. Please verify your phone number.',
      data: {
        userId: user.id,
        phone: user.phone,
        referralCode: user.referralCode,
      },
    };
  }

  /**
   * Step 3: Verify phone with OTP
   * POST /users/verify-otp
   */
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    // Verify OTP
    await this.otpService.verifyOtp(verifyOtpDto.phone, verifyOtpDto.otp);

    // Mark user as verified
    const user = await this.usersService.verifyPhone(verifyOtpDto.phone);

    return {
      success: true,
      message: 'Phone number verified successfully',
      data: {
        userId: user.id,
        phone: user.phone,
        isVerified: user.isVerified,
      },
    };
  }

  /**
   * Login with phone and PIN
   * POST /users/login
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginUserDto) {
    const user = await this.usersService.login(loginDto);

    // TODO: Generate JWT token here
    // const token = this.jwtService.sign({ userId: user.id });

    return {
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          phone: user.phone,
          displayName: user.displayName,
          rank: user.rank,
          referralCode: user.referralCode,
          xp: user.xp,
        },
        // token, // Add when JWT is implemented
      },
    };
  }

  /**
   * Get current user profile
   * GET /users/me
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: UserPayload) {
    const userProfile = await this.usersService.findById(user.userId);

    return {
      success: true,
      data: {
        id: userProfile.id,
        phone: userProfile.phone,
        email: userProfile.email,
        displayName: userProfile.displayName,
        rank: userProfile.rank,
        xp: userProfile.xp,
        referralCode: userProfile.referralCode,
        tribe: userProfile.tribe,
        city: userProfile.city,
        campus: userProfile.campus,
        bankAccount: userProfile.bankAccount,
        totalGamesPlayed: userProfile.totalGamesPlayed,
        totalWins: userProfile.totalWins,
        currentStreak: userProfile.currentStreak,
        longestStreak: userProfile.longestStreak,
      },
    };
  }

  /**
   * Get user statistics
   * GET /users/me/stats
   */
  @Get('me/stats')
  @UseGuards(JwtAuthGuard)
  async getStats(@CurrentUser() user: UserPayload) {
    const stats = await this.usersService.getUserStats(user.userId);

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Update user profile
   * PUT /users/me
   */
  @Put('me')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@CurrentUser() user: UserPayload, @Body() updateDto: UpdateUserDto) {
    const updatedUser = await this.usersService.updateProfile(user.userId, updateDto);

    return {
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: updatedUser.id,
        displayName: updatedUser.displayName,
        email: updatedUser.email,
        tribe: updatedUser.tribe,
        city: updatedUser.city,
        campus: updatedUser.campus,
      },
    };
  }

  /**
   * Update user PIN
   * PUT /users/me/pin
   */
  @Put('me/pin')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updatePin(@CurrentUser() user: UserPayload, @Body() updatePinDto: UpdatePinDto) {
    await this.usersService.updatePin(user.userId, updatePinDto);

    return {
      success: true,
      message: 'PIN updated successfully',
    };
  }

  /**
   * Get user by referral code
   * GET /users/referral/:code
   */
  @Get('referral/:code')
  async getUserByReferralCode(@Param('code') code: string) {
    const user = await this.usersService.findByReferralCode(code);

    if (!user) {
      return {
        success: false,
        message: 'Referral code not found',
      };
    }

    return {
      success: true,
      data: {
        displayName: user.displayName,
        rank: user.rank,
        totalGamesPlayed: user.totalGamesPlayed,
      },
    };
  }
}
