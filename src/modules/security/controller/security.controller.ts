import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SecurityService } from '../service/security.service';
import {
  BlockIpDto,
  UnblockIpDto,
  LogSecurityEventDto,
  CreateFraudAlertDto,
  UpdateFraudAlertDto,
  GetSecurityLogsQueryDto,
  GetFraudAlertsQueryDto,
} from '../dto/security.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RequestWithUser } from '../../../common/interfaces/request-with-user.interface';

@ApiTags('Security')
@ApiBearerAuth('JWT')
@Controller('security')
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

  // ============= IP BLOCKING (ADMIN) =============
  @Post('ip/block')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Block an IP address (admin)' })
  async blockIp(@Request() req: RequestWithUser, @Body() dto: BlockIpDto) {
    return await this.securityService.blockIp(dto, req.user.userId.toString());
  }

  @Post('ip/unblock')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Unblock an IP address (admin)' })
  async unblockIp(@Body() dto: UnblockIpDto) {
    await this.securityService.unblockIp(dto);
    return { status: 'success' };
  }

  @Get('ip/blocked')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get blocked IPs (admin)' })
  async getBlockedIps(@Query('limit') limit: number = 50) {
    return await this.securityService.getBlockedIps(limit);
  }

  // ============= SECURITY LOGS (ADMIN) =============
  @Post('logs')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Log security event' })
  async logSecurityEvent(@Body() dto: LogSecurityEventDto) {
    return await this.securityService.logSecurityEvent(dto);
  }

  @Get('logs')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get security logs (admin)' })
  async getSecurityLogs(@Query() query: GetSecurityLogsQueryDto) {
    return await this.securityService.getSecurityLogs(query);
  }

  // ============= FRAUD ALERTS (ADMIN) =============
  @Post('fraud-alerts')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create fraud alert (admin)' })
  async createFraudAlert(@Body() dto: CreateFraudAlertDto) {
    return await this.securityService.createFraudAlert(dto);
  }

  @Get('fraud-alerts')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get fraud alerts (admin)' })
  async getFraudAlerts(@Query() query: GetFraudAlertsQueryDto) {
    return await this.securityService.getFraudAlerts(query);
  }

  @Put('fraud-alerts/:alertId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update fraud alert (admin)' })
  async updateFraudAlert(
    @Request() req: RequestWithUser,
    @Param('alertId') alertId: number,
    @Body() dto: UpdateFraudAlertDto,
  ) {
    return await this.securityService.updateFraudAlert(
      alertId,
      dto,
      req.user.userId.toString(),
    );
  }

  // ============= SESSION MANAGEMENT =============
  @Get('sessions/my')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user active sessions' })
  async getMySessions(@Request() req: RequestWithUser) {
    return await this.securityService.getUserSessions(parseInt(req.user.userId));
  }

  @Post('sessions/:sessionId/revoke')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Revoke a session' })
  async revokeSession(@Param('sessionId') sessionId: number) {
    await this.securityService.revokeSession(sessionId);
    return { status: 'success' };
  }

  @Post('sessions/revoke-all')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Revoke all user sessions' })
  async revokeAllSessions(@Request() req: RequestWithUser) {
    await this.securityService.revokeAllUserSessions(parseInt(req.user.userId));
    return { status: 'success' };
  }
}
