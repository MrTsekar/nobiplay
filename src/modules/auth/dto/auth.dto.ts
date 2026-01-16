import { IsEmail, IsNotEmpty, MinLength, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRank, VIPTier } from '../../user/entity/user.entity';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email: string;

  @ApiProperty({ example: 'password123', description: 'User password (minimum 6 characters)' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @IsString()
  password: string;

  @ApiProperty({ example: 'John Doe', description: 'Display name', required: false })
  @IsOptional()
  @IsString()
  displayName?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  password: string;
}

export class UserResponseDto {
  @ApiProperty({ description: 'User unique identifier' })
  id: string;

  @ApiProperty({ description: 'Phone number' })
  phone: string;

  @ApiProperty({ description: 'Email address', required: false })
  email?: string;

  @ApiProperty({ description: 'Display name', required: false })
  displayName?: string;

  @ApiProperty({ description: 'Bank account number', required: false })
  bankAccount?: string;

  @ApiProperty({ description: 'Bank code', required: false })
  bankCode?: string;

  @ApiProperty({ description: 'User rank', enum: UserRank })
  rank: UserRank;

  @ApiProperty({ description: 'Referral code' })
  referralCode: string;

  @ApiProperty({ description: 'Referred by code', required: false })
  referredBy?: string;

  @ApiProperty({ description: 'Experience points' })
  xp: number;

  @ApiProperty({ description: 'Total games played' })
  totalGamesPlayed: number;

  @ApiProperty({ description: 'Total wins' })
  totalWins: number;

  @ApiProperty({ description: 'Current streak' })
  currentStreak: number;

  @ApiProperty({ description: 'Longest streak' })
  longestStreak: number;

  @ApiProperty({ description: 'Last played at', required: false })
  lastPlayedAt?: Date;

  @ApiProperty({ description: 'Tribe', required: false })
  tribe?: string;

  @ApiProperty({ description: 'City', required: false })
  city?: string;

  @ApiProperty({ description: 'Campus', required: false })
  campus?: string;

  @ApiProperty({ description: 'VIP tier', enum: VIPTier })
  vipTier: VIPTier;

  @ApiProperty({ description: 'VIP expiration date', required: false })
  vipExpiresAt?: Date;

  @ApiProperty({ description: 'Equipped avatar ID', required: false })
  equippedAvatarId?: number;

  @ApiProperty({ description: 'Profile banner ID', required: false })
  profileBannerId?: number;

  @ApiProperty({ description: 'Profile frame ID', required: false })
  profileFrameId?: number;

  @ApiProperty({ description: 'Win animation ID', required: false })
  winAnimationId?: number;

  @ApiProperty({ description: 'Sound pack ID', required: false })
  soundPackId?: number;

  @ApiProperty({ description: 'Profile title', required: false })
  profileTitle?: string;

  @ApiProperty({ description: 'Customization preferences', required: false })
  customizationPreferences?: {
    theme?: string;
    colorScheme?: string;
    notificationSound?: boolean;
    animationsEnabled?: boolean;
  };

  @ApiProperty({ description: 'Is verified' })
  isVerified: boolean;

  @ApiProperty({ description: 'Is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at' })
  updatedAt: Date;
}

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT access token' })
  access_token: string;

  @ApiProperty({ description: 'User object', type: UserResponseDto })
  user: UserResponseDto;
}
