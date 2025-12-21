import { IsString, IsOptional, IsEnum, IsNumber, Min } from 'class-validator';
import { FriendRequestStatus } from '../entity/friend-request.entity';

export class SendFriendRequestDto {
  @IsString()
  receiverId: string;

  @IsString()
  @IsOptional()
  message?: string;
}

export class RespondToFriendRequestDto {
  @IsString()
  requestId: string;

  @IsEnum(['accept', 'reject'])
  action: string;
}

export class GetFriendsDto {
  @IsEnum(['active', 'blocked', 'all'])
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number;
}

export class RemoveFriendDto {
  @IsString()
  friendId: string;
}

export class BlockFriendDto {
  @IsString()
  friendId: string;
}

export class UnblockFriendDto {
  @IsString()
  friendId: string;
}
