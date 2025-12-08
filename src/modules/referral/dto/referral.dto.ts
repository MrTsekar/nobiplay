import { IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';

/**
 * DTO for getting referral statistics
 */
export class GetReferralStatsDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}
