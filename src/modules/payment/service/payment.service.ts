import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import {
  PaymentTransaction,
  PaymentProvider,
  PaymentStatus,
  PaymentMethod,
} from '../entity/payment-transaction.entity';
import { PaymentWebhook } from '../entity/payment-webhook.entity';
import {
  InitiatePaymentDto,
  PaymentVerificationDto,
  InitiateRefundDto,
  PaymentHistoryQueryDto,
  PaymentResponseDto,
} from '../dto/payment.dto';

@Injectable()
export class PaymentService {
  private paystackClient: AxiosInstance;
  private monnifyClient: AxiosInstance;
  private vasClient: AxiosInstance;

  constructor(
    @InjectRepository(PaymentTransaction)
    private paymentTransactionRepository: Repository<PaymentTransaction>,
    @InjectRepository(PaymentWebhook)
    private paymentWebhookRepository: Repository<PaymentWebhook>,
    private configService: ConfigService,
  ) {
    this.initializePaymentClients();
  }

  private initializePaymentClients() {
    const paystackKey = this.configService.get('PAYSTACK_SECRET_KEY');
    const monnifyKey = this.configService.get('MONNIFY_API_KEY');
    const monnifyAccountId = this.configService.get('MONNIFY_ACCOUNT_ID');
    const vasKey = this.configService.get('VAS_API_KEY');

    this.paystackClient = axios.create({
      baseURL: 'https://api.paystack.co',
      headers: {
        Authorization: `Bearer ${paystackKey}`,
        'Content-Type': 'application/json',
      },
    });

    this.monnifyClient = axios.create({
      baseURL: 'https://api.monnify.com/api/v1',
      auth: {
        username: monnifyKey,
        password: monnifyAccountId,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.vasClient = axios.create({
      baseURL: 'https://api.vas.com',
      headers: {
        'Authorization': `Bearer ${vasKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Initiate a payment transaction
   */
  async initiatePayment(
    userId: string,
    dto: InitiatePaymentDto,
  ): Promise<PaymentResponseDto> {
    try {
      const reference = this.generateReference();

      // Create payment transaction record
      const transaction = this.paymentTransactionRepository.create({
        userId,
        provider: dto.provider,
        amount: dto.amount,
        currency: dto.currency || 'NGN',
        description: dto.description,
        reference,
        method: dto.method,
        customerEmail: dto.customerEmail,
        customerPhone: dto.customerPhone,
        metadata: dto.metadata,
        status: PaymentStatus.PENDING,
      });

      await this.paymentTransactionRepository.save(transaction);

      // Initialize payment with appropriate provider
      let paymentUrl = '';
      let providerReference = '';

      switch (dto.provider) {
        case PaymentProvider.PAYSTACK:
          const paystackResponse = await this.initializePaystackPayment(
            transaction,
            dto,
          );
          paymentUrl = paystackResponse.authorization_url;
          providerReference = paystackResponse.reference;
          break;

        case PaymentProvider.MONNIFY:
          const monnifyResponse = await this.initializeMonnifyPayment(
            transaction,
            dto,
          );
          paymentUrl = monnifyResponse.checkoutUrl;
          providerReference = monnifyResponse.transactionReference;
          break;

        case PaymentProvider.VAS:
          const vasResponse = await this.initializeVasPayment(transaction, dto);
          paymentUrl = vasResponse.paymentUrl;
          providerReference = vasResponse.reference;
          break;

        default:
          throw new BadRequestException('Unsupported payment provider');
      }

      // Update transaction with payment details
      transaction.paymentUrl = paymentUrl;
      transaction.providerReference = providerReference;
      await this.paymentTransactionRepository.save(transaction);

      return {
        id: transaction.id,
        reference: transaction.reference,
        amount: transaction.amount,
        status: transaction.status,
        provider: transaction.provider,
        paymentUrl,
        createdAt: transaction.createdAt,
      };
    } catch (error) {
      const axiosError = error as any;
      if (axiosError.response?.status === 401) {
        throw new HttpException(
          'Payment provider authentication failed',
          HttpStatus.UNAUTHORIZED,
        );
      }
      const errorMessage = axiosError.message || 'Failed to initiate payment';
      throw new InternalServerErrorException(errorMessage);
    }
  }

  /**
   * Verify payment status
   */
  async verifyPayment(
    userId: string,
    dto: PaymentVerificationDto,
  ): Promise<PaymentResponseDto> {
    const transaction = await this.paymentTransactionRepository.findOne({
      where: { reference: dto.reference, userId },
    });

    if (!transaction) {
      throw new NotFoundException('Payment transaction not found');
    }

    try {
      let paymentStatus = PaymentStatus.FAILED;
      let providerTransactionId = '';

      switch (dto.provider) {
        case PaymentProvider.PAYSTACK:
          const paystackData = await this.verifyPaystackPayment(
            dto.reference,
          );
          paymentStatus = paystackData.status === 'success' 
            ? PaymentStatus.SUCCESS 
            : PaymentStatus.FAILED;
          providerTransactionId = paystackData.id;
          break;

        case PaymentProvider.MONNIFY:
          if (!transaction.providerReference) {
            throw new BadRequestException('Missing provider reference for verification');
          }
          const monnifyData = await this.verifyMonnifyPayment(
            transaction.providerReference,
          );
          paymentStatus = monnifyData.paymentStatus === 'SUCCESSFUL'
            ? PaymentStatus.SUCCESS
            : PaymentStatus.FAILED;
          providerTransactionId = monnifyData.transactionReference;
          break;

        case PaymentProvider.VAS:
          if (!transaction.providerReference) {
            throw new BadRequestException('Missing provider reference for verification');
          }
          const vasData = await this.verifyVasPayment(transaction.providerReference);
          paymentStatus = vasData.status === 'completed'
            ? PaymentStatus.SUCCESS
            : PaymentStatus.FAILED;
          providerTransactionId = vasData.transactionId;
          break;
      }

      transaction.status = paymentStatus;
      transaction.providerTransactionId = providerTransactionId;
      transaction.completedAt = new Date();

      if (paymentStatus === PaymentStatus.SUCCESS) {
        // Emit payment success event (wallet credit, etc.)
      }

      await this.paymentTransactionRepository.save(transaction);

      return {
        id: transaction.id,
        reference: transaction.reference,
        amount: transaction.amount,
        status: transaction.status,
        provider: transaction.provider,
        createdAt: transaction.createdAt,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to verify payment';
      throw new InternalServerErrorException(errorMessage);
    }
  }

  /**
   * Get payment transaction details
   */
  async getTransactionDetails(
    userId: string,
    transactionId: string,
  ): Promise<PaymentResponseDto> {
    const transaction = await this.paymentTransactionRepository.findOne({
      where: { id: transactionId, userId },
    });

    if (!transaction) {
      throw new NotFoundException('Payment transaction not found');
    }

    return {
      id: transaction.id,
      reference: transaction.reference,
      amount: transaction.amount,
      status: transaction.status,
      provider: transaction.provider,
      createdAt: transaction.createdAt,
    };
  }

  /**
   * Get payment history
   */
  async getPaymentHistory(
    userId: string,
    query: PaymentHistoryQueryDto,
  ): Promise<{ data: PaymentResponseDto[]; total: number }> {
    const queryBuilder = this.paymentTransactionRepository
      .createQueryBuilder('payment')
      .where('payment.userId = :userId', { userId })
      .orderBy('payment.createdAt', 'DESC')
      .skip(query.offset || 0)
      .take(query.limit || 20);

    if (query.provider) {
      queryBuilder.andWhere('payment.provider = :provider', {
        provider: query.provider,
      });
    }

    if (query.status) {
      queryBuilder.andWhere('payment.status = :status', {
        status: query.status,
      });
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data: data.map(t => ({
        id: t.id,
        reference: t.reference,
        amount: t.amount,
        status: t.status,
        provider: t.provider,
        createdAt: t.createdAt,
      })),
      total,
    };
  }

  /**
   * Initiate refund
   */
  async initiateRefund(
    userId: string,
    dto: InitiateRefundDto,
  ): Promise<{ success: boolean; message: string; refundId?: string }> {
    const transaction = await this.paymentTransactionRepository.findOne({
      where: { id: dto.transactionId, userId },
    });

    if (!transaction) {
      throw new NotFoundException('Payment transaction not found');
    }

    if (transaction.status !== PaymentStatus.SUCCESS) {
      throw new BadRequestException(
        'Only successful payments can be refunded',
      );
    }

    const refundAmount = dto.amount || transaction.amount;

    if (refundAmount > transaction.amount) {
      throw new BadRequestException(
        'Refund amount cannot exceed transaction amount',
      );
    }

    try {
      switch (transaction.provider) {
        case PaymentProvider.PAYSTACK:
          return await this.refundPaystackPayment(transaction, refundAmount);

        case PaymentProvider.MONNIFY:
          return await this.refundMonnifyPayment(transaction, refundAmount);

        case PaymentProvider.VAS:
          return await this.refundVasPayment(transaction, refundAmount);

        default:
          throw new BadRequestException('Unsupported payment provider');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process refund';
      throw new InternalServerErrorException(errorMessage);
    }
  }

  /**
   * Handle payment webhook
   */
  async handlePaymentWebhook(
    provider: PaymentProvider,
    payload: Record<string, any>,
    signature?: string,
  ): Promise<void> {
    try {
      // Verify webhook signature
      switch (provider) {
        case PaymentProvider.PAYSTACK:
          this.verifyPaystackSignature(payload, signature);
          break;

        case PaymentProvider.MONNIFY:
          this.verifyMonnifySignature(payload, signature);
          break;

        case PaymentProvider.VAS:
          this.verifyVasSignature(payload, signature);
          break;
      }

      // Create webhook record
      const reference =
        payload.reference ||
        payload.transactionReference ||
        payload.paymentRef;
      const transaction = await this.paymentTransactionRepository.findOne({
        where: { reference },
      });

      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }

      const webhook = this.paymentWebhookRepository.create({
        transactionId: transaction.id,
        provider: provider.toString(),
        event: payload.event || 'payment.confirmation',
        payload,
        signature: signature || undefined,
        status: 'pending' as any,
      });

      await this.paymentWebhookRepository.save(webhook);

      // Process webhook based on payment status
      let status = PaymentStatus.FAILED;

      if (
        provider === PaymentProvider.PAYSTACK &&
        payload.status === 'success'
      ) {
        status = PaymentStatus.SUCCESS;
      } else if (
        provider === PaymentProvider.MONNIFY &&
        payload.paymentStatus === 'SUCCESSFUL'
      ) {
        status = PaymentStatus.SUCCESS;
      } else if (provider === PaymentProvider.VAS && payload.status === 'completed') {
        status = PaymentStatus.SUCCESS;
      }

      transaction.status = status;
      transaction.completedAt = new Date();
      await this.paymentTransactionRepository.save(transaction);

      webhook.status = 'processed' as any;
      await this.paymentWebhookRepository.save(webhook);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const webhook = this.paymentWebhookRepository.create({
        provider: provider.toString(),
        event: payload.event || 'payment.confirmation',
        payload,
        signature: signature || undefined,
        status: 'failed' as any,
        error: errorMessage,
      });

      await this.paymentWebhookRepository.save(webhook);
      throw error;
    }
  }

  // ==================== PAYSTACK METHODS ====================

  private async initializePaystackPayment(
    transaction: PaymentTransaction,
    dto: InitiatePaymentDto,
  ) {
    const response = await this.paystackClient.post('/transaction/initialize', {
      email: dto.customerEmail,
      amount: transaction.amount * 100, // Convert to kobo
      reference: transaction.reference,
      metadata: {
        userId: transaction.userId,
        transactionId: transaction.id,
        ...dto.metadata,
      },
    });

    return response.data.data;
  }

  private async verifyPaystackPayment(reference: string) {
    const response = await this.paystackClient.get(
      `/transaction/verify/${reference}`,
    );
    return response.data.data;
  }

  private async refundPaystackPayment(
    transaction: PaymentTransaction,
    amount: number,
  ) {
    const response = await this.paystackClient.post('/refund', {
      transaction: transaction.providerTransactionId,
      amount: amount * 100, // Convert to kobo
    });

    transaction.status = PaymentStatus.REFUNDED;
    transaction.refundAmount = amount;
    transaction.refundedAt = new Date();
    await this.paymentTransactionRepository.save(transaction);

    return {
      success: true,
      message: 'Refund processed successfully',
      refundId: response.data.data.refund_id,
    };
  }

  private verifyPaystackSignature(payload: any, signature: string | undefined) {
    if (!signature) {
      throw new BadRequestException('Missing webhook signature');
    }

    const secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');
    if (!secretKey) {
      throw new InternalServerErrorException('PAYSTACK_SECRET_KEY not configured');
    }

    const hash = crypto
      .createHmac('sha512', secretKey)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (hash !== signature) {
      throw new BadRequestException('Invalid webhook signature');
    }
  }

  // ==================== MONNIFY METHODS ====================

  private async initializeMonnifyPayment(
    transaction: PaymentTransaction,
    dto: InitiatePaymentDto,
  ) {
    const response = await this.monnifyClient.post('/merchant/transactions/init', {
      amount: transaction.amount,
      currencyCode: 'NGN',
      contractCode: this.configService.get('MONNIFY_CONTRACT_CODE'),
      reference: transaction.reference,
      description: dto.description,
      redirectUrl: `${this.configService.get('APP_URL')}/payment/callback`,
      paymentMethods: ['CARD', 'ACCOUNT_TRANSFER', 'USSD'],
      customerName: dto.metadata?.customerName || 'Customer',
      customerEmail: dto.customerEmail,
      metadata: {
        userId: transaction.userId,
        transactionId: transaction.id,
      },
    });

    return response.data.responseBody;
  }

  private async verifyMonnifyPayment(transactionReference: string) {
    const response = await this.monnifyClient.get(
      `/merchant/transactions/query?reference=${transactionReference}`,
    );
    return response.data.responseBody;
  }

  private async refundMonnifyPayment(
    transaction: PaymentTransaction,
    amount: number,
  ) {
    const response = await this.monnifyClient.post('/merchant/transactions/refund', {
      transactionReference: transaction.providerReference,
      refundAmount: amount,
      refundReason: 'Customer request',
    });

    transaction.status = PaymentStatus.REFUNDED;
    transaction.refundAmount = amount;
    transaction.refundedAt = new Date();
    await this.paymentTransactionRepository.save(transaction);

    return {
      success: true,
      message: 'Refund processed successfully',
      refundId: response.data.responseBody.refundReference,
    };
  }

  private verifyMonnifySignature(payload: any, signature: string | undefined) {
    if (!signature) {
      throw new BadRequestException('Missing webhook signature');
    }

    const secretKey = this.configService.get<string>('MONNIFY_SECRET_KEY');
    if (!secretKey) {
      throw new InternalServerErrorException('MONNIFY_SECRET_KEY not configured');
    }

    const hash = crypto
      .createHmac('sha512', secretKey)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (hash !== signature) {
      throw new BadRequestException('Invalid webhook signature');
    }
  }

  // ==================== VAS METHODS ====================

  private async initializeVasPayment(
    transaction: PaymentTransaction,
    dto: InitiatePaymentDto,
  ) {
    const response = await this.vasClient.post('/payment/initialize', {
      amount: transaction.amount,
      currency: transaction.currency,
      reference: transaction.reference,
      description: dto.description,
      customerEmail: dto.customerEmail,
      customerPhone: dto.customerPhone,
      redirectUrl: `${this.configService.get('APP_URL')}/payment/callback`,
      metadata: {
        userId: transaction.userId,
        transactionId: transaction.id,
        ...dto.metadata,
      },
    });

    return response.data.data;
  }

  private async verifyVasPayment(reference: string) {
    const response = await this.vasClient.get(`/payment/verify/${reference}`);
    return response.data.data;
  }

  private async refundVasPayment(
    transaction: PaymentTransaction,
    amount: number,
  ) {
    const response = await this.vasClient.post('/payment/refund', {
      transactionId: transaction.providerTransactionId,
      amount,
      reason: 'Customer request',
    });

    transaction.status = PaymentStatus.REFUNDED;
    transaction.refundAmount = amount;
    transaction.refundedAt = new Date();
    await this.paymentTransactionRepository.save(transaction);

    return {
      success: true,
      message: 'Refund processed successfully',
      refundId: response.data.data.refundId,
    };
  }

  private verifyVasSignature(payload: any, signature: string | undefined) {
    if (!signature) {
      throw new BadRequestException('Missing webhook signature');
    }

    const secretKey = this.configService.get<string>('VAS_SECRET_KEY');
    if (!secretKey) {
      throw new InternalServerErrorException('VAS_SECRET_KEY not configured');
    }

    const hash = crypto
      .createHmac('sha512', secretKey)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (hash !== signature) {
      throw new BadRequestException('Invalid webhook signature');
    }
  }

  // ==================== HELPER METHODS ====================

  private generateReference(): string {
    return `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }
}
