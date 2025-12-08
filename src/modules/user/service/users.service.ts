import { Injectable, ConflictException, NotFoundException, UnauthorizedException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRank } from '../entity/user.entity';
import { RegisterUserDto, LoginUserDto, UpdateUserDto, UpdatePinDto } from '../dto';
import { WalletService } from '../../wallet/service/wallet.service';
import { ReferralService } from '../../referral/service/referral.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly walletService: WalletService,
    @Inject(forwardRef(() => ReferralService))
    private readonly referralService: ReferralService,
  ) {}

  /**
   * Register a new user with phone number and PIN
   */
  async register(registerDto: RegisterUserDto): Promise<User> {
    const { phone, pin, referralCode, ...userData } = registerDto;

    // Check if phone already exists
    const existingUser = await this.userRepository.findOne({ where: { phone } });
    if (existingUser) {
      throw new ConflictException('Phone number already registered');
    }

    // Validate referral code if provided
    let referredBy: string | undefined;
    let referrerId: string | undefined;
    if (referralCode) {
      const referrer = await this.userRepository.findOne({ where: { referralCode } });
      if (!referrer) {
        throw new BadRequestException('Invalid referral code');
      }
      referredBy = referralCode;
      referrerId = referrer.id;
    }

    // Hash PIN
    const pinHash = await bcrypt.hash(pin, 12);

    // Generate unique referral code
    const userReferralCode = await this.generateUniqueReferralCode();

    // Create user
    const user = this.userRepository.create({
      phone,
      pinHash,
      referralCode: userReferralCode,
      referredBy,
      rank: UserRank.ROOKIE,
      isVerified: false, // Will be verified via OTP
      ...userData,
    });

    const savedUser = await this.userRepository.save(user);

    // Create wallet for the new user
    await this.walletService.createWallet(savedUser.id);

    // Create referral record if user was referred
    if (referrerId) {
      await this.referralService.createReferral(referrerId, savedUser.id);
    }

    return savedUser;
  }

  /**
   * Login user with phone and PIN
   */
  async login(loginDto: LoginUserDto): Promise<User> {
    const { phone, pin } = loginDto;

    const user = await this.userRepository.findOne({ where: { phone } });
    if (!user) {
      throw new UnauthorizedException('Invalid phone or PIN');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Verify PIN
    const isPinValid = await bcrypt.compare(pin, user.pinHash);
    if (!isPinValid) {
      throw new UnauthorizedException('Invalid phone or PIN');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException('Please verify your phone number first');
    }

    return user;
  }

  /**
   * Verify user's phone number (called after OTP verification)
   */
  async verifyPhone(phone: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { phone } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isVerified = true;
    return await this.userRepository.save(user);
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['wallet'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Find user by phone
   */
  async findByPhone(phone: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { phone } });
  }

  /**
   * Find user by referral code
   */
  async findByReferralCode(referralCode: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { referralCode } });
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updateDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(userId);

    Object.assign(user, updateDto);

    return await this.userRepository.save(user);
  }

  /**
   * Update user PIN
   */
  async updatePin(userId: string, updatePinDto: UpdatePinDto): Promise<void> {
    const user = await this.findById(userId);

    // Verify old PIN
    const isOldPinValid = await bcrypt.compare(updatePinDto.oldPin, user.pinHash);
    if (!isOldPinValid) {
      throw new UnauthorizedException('Invalid old PIN');
    }

    // Hash new PIN
    user.pinHash = await bcrypt.hash(updatePinDto.newPin, 12);

    await this.userRepository.save(user);
  }

  /**
   * Verify PIN for transactions
   */
  async verifyPin(userId: string, pin: string): Promise<boolean> {
    const user = await this.findById(userId);
    return await bcrypt.compare(pin, user.pinHash);
  }

  /**
   * Update user stats after game completion
   */
  async updateGameStats(
    userId: string,
    stats: {
      won?: boolean;
      xpEarned?: number;
      streakIncrement?: boolean;
    },
  ): Promise<User> {
    const user = await this.findById(userId);

    user.totalGamesPlayed += 1;
    if (stats.won) {
      user.totalWins += 1;
    }

    if (stats.xpEarned) {
      user.xp += stats.xpEarned;
      // Check for rank upgrade
      user.rank = this.calculateRank(user.xp);
    }

    if (stats.streakIncrement) {
      const today = new Date();
      const lastPlayed = user.lastPlayedAt;

      if (lastPlayed) {
        const daysDiff = Math.floor(
          (today.getTime() - lastPlayed.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (daysDiff === 1) {
          // Consecutive day
          user.currentStreak += 1;
          user.longestStreak = Math.max(user.longestStreak, user.currentStreak);
        } else if (daysDiff > 1) {
          // Streak broken
          user.currentStreak = 1;
        }
        // If daysDiff === 0, same day, no streak change
      } else {
        // First game ever
        user.currentStreak = 1;
        user.longestStreak = 1;
      }
    }

    user.lastPlayedAt = new Date();

    return await this.userRepository.save(user);
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string) {
    const user = await this.findById(userId);

    return {
      rank: user.rank,
      xp: user.xp,
      totalGamesPlayed: user.totalGamesPlayed,
      totalWins: user.totalWins,
      winRate: user.totalGamesPlayed > 0 ? (user.totalWins / user.totalGamesPlayed) * 100 : 0,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
    };
  }

  /**
   * Generate unique referral code
   */
  private async generateUniqueReferralCode(): Promise<string> {
    let code: string;
    let exists = true;

    while (exists) {
      // Generate 8-character alphanumeric code
      code = this.generateRandomCode(8);
      const existing = await this.userRepository.findOne({ where: { referralCode: code } });
      exists = !!existing;
    }

    return code!;
  }

  /**
   * Generate random alphanumeric code
   */
  private generateRandomCode(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Calculate user rank based on XP
   */
  private calculateRank(xp: number): UserRank {
    if (xp >= 50000) return UserRank.LEGEND;
    if (xp >= 25000) return UserRank.DIAMOND;
    if (xp >= 10000) return UserRank.PLATINUM;
    if (xp >= 5000) return UserRank.GOLD;
    if (xp >= 2000) return UserRank.SILVER;
    if (xp >= 500) return UserRank.BRONZE;
    return UserRank.ROOKIE;
  }

  /**
   * Get users by tribe/city/campus for leaderboard
   */
  async getUsersByScope(
    scope: 'tribe' | 'city' | 'campus',
    value: string,
    limit: number = 100,
  ): Promise<User[]> {
    const where: any = { isActive: true };
    where[scope] = value;

    return await this.userRepository.find({
      where,
      order: { xp: 'DESC' },
      take: limit,
    });
  }

  /**
   * Deactivate user account
   */
  async deactivateAccount(userId: string): Promise<void> {
    const user = await this.findById(userId);
    user.isActive = false;
    await this.userRepository.save(user);
  }

  /**
   * Reactivate user account
   */
  async reactivateAccount(userId: string): Promise<void> {
    const user = await this.findById(userId);
    user.isActive = true;
    await this.userRepository.save(user);
  }
}
