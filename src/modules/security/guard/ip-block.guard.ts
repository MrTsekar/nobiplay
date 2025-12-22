import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { IpBlock } from '../entity/ip-block.entity';
import { SecurityService } from '../service/security.service';
import { SecurityEventType, SeverityLevel } from '../entity/security-log.entity';

@Injectable()
export class IpBlockGuard implements CanActivate {
  private readonly logger = new Logger(IpBlockGuard.name);

  constructor(
    @InjectRepository(IpBlock)
    private ipBlockRepository: Repository<IpBlock>,
    private securityService: SecurityService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ipAddress = this.getIpAddress(request);

    if (!ipAddress) {
      return true; // Allow if IP cannot be determined
    }

    // Check if IP is blocked
    const block = await this.ipBlockRepository.findOne({
      where: {
        ipAddress,
        isActive: true,
      },
    });

    if (block) {
      // Check if block has expired
      if (block.expiresAt && new Date() > block.expiresAt) {
        block.isActive = false;
        await this.ipBlockRepository.save(block);
        return true;
      }

      // Log the blocked attempt
      await this.securityService.logSecurityEvent({
        ipAddress,
        eventType: SecurityEventType.IP_BLOCKED,
        severity: SeverityLevel.HIGH,
        description: `Blocked IP attempted access: ${block.reason}`,
        metadata: {
          endpoint: request.url,
          method: request.method,
        },
      });

      this.logger.warn(`Blocked IP access attempt: ${ipAddress}`);
      throw new ForbiddenException('Access denied: IP address is blocked');
    }

    return true;
  }

  private getIpAddress(request: any): string | null {
    return (
      request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      null
    );
  }
}
