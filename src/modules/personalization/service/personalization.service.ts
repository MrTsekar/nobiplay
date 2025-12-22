import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Avatar, UnlockMethod } from '../entity/avatar.entity';
import { ProfileItem, ProfileItemType } from '../entity/profile-item.entity';
import { UserAvatar } from '../entity/user-avatar.entity';
import { UserProfileItem } from '../entity/user-profile-item.entity';
import { User } from '../../user/entity/user.entity';
import { WalletService } from '../../wallet/service/wallet.service';
import { TransactionType } from '../../wallet/entity/transaction.entity';
import {
  PurchaseAvatarDto,
  PurchaseProfileItemDto,
  EquipAvatarDto,
  EquipProfileItemDto,
  GetAvatarsQueryDto,
  GetProfileItemsQueryDto,
  CreateAvatarDto,
  CreateProfileItemDto,
} from '../dto/personalization.dto';

@Injectable()
export class PersonalizationService {
  private readonly logger = new Logger(PersonalizationService.name);

  constructor(
    @InjectRepository(Avatar)
    private avatarRepository: Repository<Avatar>,
    @InjectRepository(ProfileItem)
    private profileItemRepository: Repository<ProfileItem>,
    @InjectRepository(UserAvatar)
    private userAvatarRepository: Repository<UserAvatar>,
    @InjectRepository(UserProfileItem)
    private userProfileItemRepository: Repository<UserProfileItem>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private walletService: WalletService,
  ) {}

  // ============= AVATAR MANAGEMENT =============
  async getAvatars(query: GetAvatarsQueryDto): Promise<{ data: Avatar[]; total: number }> {
    const queryBuilder = this.avatarRepository
      .createQueryBuilder('avatar')
      .skip(query.offset)
      .take(query.limit)
      .orderBy('avatar.displayOrder', 'ASC');

    if (query.rarity) {
      queryBuilder.andWhere('avatar.rarity = :rarity', { rarity: query.rarity });
    }

    if (query.isActive !== undefined) {
      queryBuilder.andWhere('avatar.isActive = :isActive', { isActive: query.isActive });
    }

    const [data, total] = await queryBuilder.getManyAndCount();
    return { data, total };
  }

  async getUserAvatars(userId: number): Promise<UserAvatar[]> {
    return await this.userAvatarRepository.find({
      where: { userId },
      relations: ['avatar'],
      order: { unlockedAt: 'DESC' },
    });
  }

  async purchaseAvatar(userId: number, dto: PurchaseAvatarDto): Promise<UserAvatar> {
    const avatar = await this.avatarRepository.findOne({
      where: { id: dto.avatarId, isActive: true },
    });

    if (!avatar) {
      throw new NotFoundException('Avatar not found');
    }

    // Check if already owned
    const existing = await this.userAvatarRepository.findOne({
      where: { userId, avatarId: dto.avatarId },
    });

    if (existing) {
      throw new BadRequestException('Avatar already owned');
    }

    // Process payment
    const price = dto.paymentMethod === 'COINS' ? avatar.coinPrice : avatar.cashPrice;
    if (price <= 0) {
      throw new BadRequestException('Avatar is not purchasable with this payment method');
    }

    await this.walletService.debitCoins({
      userId: userId.toString(),
      amount: price,
      type: TransactionType.COIN_SPEND,
      description: `Purchased avatar: ${avatar.name}`,
      metadata: { avatarId: avatar.id, paymentMethod: dto.paymentMethod },
    });

    // Grant avatar
    const userAvatar = this.userAvatarRepository.create({
      userId,
      avatarId: dto.avatarId,
      source: 'PURCHASED',
    });

    await this.userAvatarRepository.save(userAvatar);

    this.logger.log(`User ${userId} purchased avatar ${avatar.name}`);
    return userAvatar;
  }

  async equipAvatar(userId: number, dto: EquipAvatarDto): Promise<void> {
    const userAvatar = await this.userAvatarRepository.findOne({
      where: { userId, avatarId: dto.avatarId },
    });

    if (!userAvatar) {
      throw new NotFoundException('Avatar not owned');
    }

    // Unequip current avatar
    await this.userAvatarRepository.update(
      { userId, isEquipped: true },
      { isEquipped: false },
    );

    // Equip new avatar
    userAvatar.isEquipped = true;
    await this.userAvatarRepository.save(userAvatar);

    this.logger.log(`User ${userId} equipped avatar ${dto.avatarId}`);
  }

  async unlockAvatarForUser(
    userId: number,
    avatarId: number,
    source: 'UNLOCKED' | 'GIFTED' | 'DEFAULT',
  ): Promise<UserAvatar> {
    const existing = await this.userAvatarRepository.findOne({
      where: { userId, avatarId },
    });

    if (existing) {
      return existing;
    }

    const userAvatar = this.userAvatarRepository.create({
      userId,
      avatarId,
      source,
    });

    await this.userAvatarRepository.save(userAvatar);
    this.logger.log(`Avatar ${avatarId} unlocked for user ${userId} (${source})`);

    return userAvatar;
  }

  // ============= PROFILE ITEMS MANAGEMENT =============
  async getProfileItems(
    query: GetProfileItemsQueryDto,
  ): Promise<{ data: ProfileItem[]; total: number }> {
    const queryBuilder = this.profileItemRepository
      .createQueryBuilder('item')
      .skip(query.offset)
      .take(query.limit)
      .orderBy('item.displayOrder', 'ASC');

    if (query.type) {
      queryBuilder.andWhere('item.type = :type', { type: query.type });
    }

    if (query.rarity) {
      queryBuilder.andWhere('item.rarity = :rarity', { rarity: query.rarity });
    }

    if (query.isActive !== undefined) {
      queryBuilder.andWhere('item.isActive = :isActive', { isActive: query.isActive });
    }

    const [data, total] = await queryBuilder.getManyAndCount();
    return { data, total };
  }

  async getUserProfileItems(userId: number, type?: ProfileItemType): Promise<UserProfileItem[]> {
    const queryBuilder = this.userProfileItemRepository
      .createQueryBuilder('userItem')
      .leftJoinAndSelect('userItem.item', 'item')
      .where('userItem.userId = :userId', { userId })
      .orderBy('userItem.obtainedAt', 'DESC');

    if (type) {
      queryBuilder.andWhere('item.type = :type', { type });
    }

    return await queryBuilder.getMany();
  }

  async purchaseProfileItem(
    userId: number,
    dto: PurchaseProfileItemDto,
  ): Promise<UserProfileItem> {
    const item = await this.profileItemRepository.findOne({
      where: { id: dto.itemId, isActive: true },
    });

    if (!item) {
      throw new NotFoundException('Profile item not found');
    }

    // Check if already owned
    const existing = await this.userProfileItemRepository.findOne({
      where: { userId, itemId: dto.itemId },
    });

    if (existing) {
      throw new BadRequestException('Item already owned');
    }

    // Process payment
    const price = dto.paymentMethod === 'COINS' ? item.coinPrice : item.cashPrice;
    if (price <= 0) {
      throw new BadRequestException('Item is not purchasable with this payment method');
    }

    await this.walletService.debitCoins({
      userId: userId.toString(),
      amount: price,
      type: TransactionType.COIN_SPEND,
      description: `Purchased ${item.type}: ${item.name}`,
      metadata: { itemId: item.id, paymentMethod: dto.paymentMethod },
    });

    // Grant item
    const userItem = this.userProfileItemRepository.create({
      userId,
      itemId: dto.itemId,
      source: 'PURCHASED',
    });

    await this.userProfileItemRepository.save(userItem);

    this.logger.log(`User ${userId} purchased ${item.type} ${item.name}`);
    return userItem;
  }

  async equipProfileItem(userId: number, dto: EquipProfileItemDto): Promise<void> {
    const userItem = await this.userProfileItemRepository.findOne({
      where: { userId, itemId: dto.itemId },
      relations: ['item'],
    });

    if (!userItem) {
      throw new NotFoundException('Item not owned');
    }

    // Unequip items of same type
    await this.userProfileItemRepository
      .createQueryBuilder()
      .update()
      .set({ isEquipped: false })
      .where('userId = :userId', { userId })
      .andWhere('itemId IN (SELECT id FROM profile_items WHERE type = :type)', {
        type: userItem.item.type,
      })
      .execute();

    // Equip new item
    userItem.isEquipped = true;
    await this.userProfileItemRepository.save(userItem);

    this.logger.log(`User ${userId} equipped ${userItem.item.type} ${dto.itemId}`);
  }

  async unlockProfileItemForUser(
    userId: number,
    itemId: number,
    source: 'UNLOCKED' | 'GIFTED' | 'EVENT',
  ): Promise<UserProfileItem> {
    const existing = await this.userProfileItemRepository.findOne({
      where: { userId, itemId },
    });

    if (existing) {
      return existing;
    }

    const userItem = this.userProfileItemRepository.create({
      userId,
      itemId,
      source,
    });

    await this.userProfileItemRepository.save(userItem);
    this.logger.log(`Item ${itemId} unlocked for user ${userId} (${source})`);

    return userItem;
  }

  // ============= ADMIN METHODS =============
  async createAvatar(dto: CreateAvatarDto): Promise<Avatar> {
    const avatar = this.avatarRepository.create(dto as any);
    const saved = await this.avatarRepository.save(avatar);
    const result = Array.isArray(saved) ? saved[0] : saved;
    this.logger.log(`Avatar created: ${result.name}`);
    return result;
  }

  async createProfileItem(dto: CreateProfileItemDto): Promise<ProfileItem> {
    const item = this.profileItemRepository.create(dto as any);
    const saved = await this.profileItemRepository.save(item);
    const result = Array.isArray(saved) ? saved[0] : saved;
    this.logger.log(`Profile item created: ${result.name}`);
    return result;
  }

  async getUserCustomization(userId: number): Promise<{
    equippedAvatar?: Avatar;
    equippedItems: { [key: string]: ProfileItem };
  }> {
    const equippedAvatar = await this.userAvatarRepository.findOne({
      where: { userId, isEquipped: true },
      relations: ['avatar'],
    });

    const equippedItems = await this.userProfileItemRepository.find({
      where: { userId, isEquipped: true },
      relations: ['item'],
    });

    const itemsByType: { [key: string]: ProfileItem } = {};
    equippedItems.forEach((ui) => {
      itemsByType[ui.item.type] = ui.item;
    });

    return {
      equippedAvatar: equippedAvatar?.avatar,
      equippedItems: itemsByType,
    };
  }
}
