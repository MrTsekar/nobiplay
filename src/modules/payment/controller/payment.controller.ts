import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { PaymentService } from '../service/payment.service';
import {
  InitiatePaymentDto,
  PaymentVerificationDto,
  InitiateRefundDto,
  PaymentHistoryQueryDto,
} from '../dto/payment.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserPayload } from '../../../common/interfaces/user-payload.interface';

@ApiTags('Payment')
@ApiBearerAuth('JWT')
@Controller('payment')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Initiate a payment transaction
   * POST /payment/initiate
   */
  @ApiOperation({ summary: 'Initiate payment', description: 'Start a payment transaction with Paystack, Monnify, or VAS' })
  @ApiResponse({ status: 201, description: 'Payment initiated successfully' })
  @Post('initiate')
  async initiatePayment(
    @CurrentUser() user: UserPayload,
    @Body() dto: InitiatePaymentDto,
  ) {
    return await this.paymentService.initiatePayment(user.userId, dto);
  }

  /**
   * Verify payment status
   * POST /payment/verify
   */
  @ApiOperation({ summary: 'Verify payment', description: 'Check the status of a payment transaction' })
  @ApiResponse({ status: 200, description: 'Payment verified' })
  @Post('verify')
  async verifyPayment(
    @CurrentUser() user: UserPayload,
    @Body() dto: PaymentVerificationDto,
  ) {
    return await this.paymentService.verifyPayment(user.userId, dto);
  }

  /**
   * Get payment transaction details
   * GET /payment/transactions/:transactionId
   */
  @ApiOperation({ summary: 'Get transaction details', description: 'Retrieve details of a specific payment transaction' })
  @ApiResponse({ status: 200, description: 'Transaction details retrieved' })
  @Get('transactions/:transactionId')
  async getTransactionDetails(
    @CurrentUser() user: UserPayload,
    @Param('transactionId') transactionId: string,
  ) {
    return await this.paymentService.getTransactionDetails(
      user.userId,
      transactionId,
    );
  }

  /**
   * Get user payment history
   * GET /payment/history?limit=20&offset=0&provider=paystack
   */
  @Get('history')
  async getPaymentHistory(
    @CurrentUser() user: UserPayload,
    @Query() query: PaymentHistoryQueryDto,
  ) {
    return await this.paymentService.getPaymentHistory(user.userId, query);
  }

  /**
   * Initiate refund
   * POST /payment/refund
   */
  @Post('refund')
  async initiateRefund(
    @CurrentUser() user: UserPayload,
    @Body() dto: InitiateRefundDto,
  ) {
    return await this.paymentService.initiateRefund(user.userId, dto);
  }

  /**
   * Handle Paystack webhook
   * POST /payment/webhook/paystack
   */
  @Post('webhook/paystack')
  @HttpCode(200)
  async handlePaystackWebhook(@Body() payload: any, @Query('signature') signature?: string) {
    await this.paymentService.handlePaymentWebhook(
      'paystack' as any,
      payload,
      signature,
    );
    return { status: 'success' };
  }

  /**
   * Handle Monnify webhook
   * POST /payment/webhook/monnify
   */
  @Post('webhook/monnify')
  @HttpCode(200)
  async handleMonnifyWebhook(@Body() payload: any, @Query('signature') signature?: string) {
    await this.paymentService.handlePaymentWebhook(
      'monnify' as any,
      payload,
      signature,
    );
    return { status: 'success' };
  }

  /**
   * Handle VAS webhook
   * POST /payment/webhook/vas
   */
  @Post('webhook/vas')
  @HttpCode(200)
  async handleVasWebhook(@Body() payload: any, @Query('signature') signature?: string) {
    await this.paymentService.handlePaymentWebhook(
      'vas' as any,
      payload,
      signature,
    );
    return { status: 'success' };
  }
}
