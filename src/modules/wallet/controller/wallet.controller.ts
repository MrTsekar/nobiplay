import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { WalletService } from '../service/wallet.service';
import {
  TopUpCashDto,
  RedeemAirtimeDto,
  RedeemDataDto,
  WithdrawCashDto,
  LinkCryptoWalletDto,
  RedeemCryptoDto,
  GetTransactionsDto,
  PurchaseCoinsDto,
} from '../dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RequestWithUser } from '../../../common/interfaces/request-with-user.interface';

@ApiTags('Wallet')
@ApiBearerAuth('JWT')
@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  /**
   * Get wallet balance
   * GET /wallet/balance
   */
  @Get('balance')
  async getBalance(@Request() req: RequestWithUser) {
    const balance = await this.walletService.getBalance(req.user.userId);

    return {
      success: true,
      data: balance,
    };
  }

  /**
   * Get wallet statistics
   * GET /wallet/stats
   */
  @Get('stats')
  async getStats(@Request() req: RequestWithUser) {
    const stats = await this.walletService.getWalletStats(req.user.userId);

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Top up cash balance
   * POST /wallet/topup
   */
  @Post('topup')
  @HttpCode(HttpStatus.OK)
  async topUpCash(@Request() req: RequestWithUser, @Body() topUpDto: TopUpCashDto) {
    const transaction = await this.walletService.topUpCash(req.user.userId, topUpDto);

    return {
      success: true,
      message: 'Cash top-up successful',
      data: {
        transactionId: transaction.id,
        amount: Number(transaction.amount),
        newBalance: Number(transaction.balanceAfter),
        reference: transaction.reference,
      },
    };
  }

  /**
   * Purchase coins
   * POST /wallet/purchase-coins
   */
  @Post('purchase-coins')
  @HttpCode(HttpStatus.OK)
  async purchaseCoins(@Request() req: RequestWithUser, @Body() purchaseDto: PurchaseCoinsDto) {
    const transaction = await this.walletService.purchaseCoins(req.user.userId, purchaseDto);

    return {
      success: true,
      message: 'Coin purchase successful',
      data: {
        transactionId: transaction.id,
        coinsAdded: Number(transaction.amount),
        newBalance: Number(transaction.balanceAfter),
        reference: transaction.reference,
      },
    };
  }

  /**
   * Redeem airtime
   * POST /wallet/redeem/airtime
   */
  @Post('redeem/airtime')
  @HttpCode(HttpStatus.OK)
  async redeemAirtime(@Request() req: RequestWithUser, @Body() redeemDto: RedeemAirtimeDto) {
    const transaction = await this.walletService.redeemAirtime(req.user.userId, redeemDto);

    return {
      success: true,
      message: `Airtime redemption of ₦${redeemDto.amount} initiated successfully`,
      data: {
        transactionId: transaction.id,
        amount: redeemDto.amount,
        phoneNumber: redeemDto.phoneNumber,
        network: redeemDto.network,
        reference: transaction.reference,
        status: transaction.status,
      },
    };
  }

  /**
   * Redeem data bundle
   * POST /wallet/redeem/data
   */
  @Post('redeem/data')
  @HttpCode(HttpStatus.OK)
  async redeemData(@Request() req: RequestWithUser, @Body() redeemDto: RedeemDataDto) {
    const transaction = await this.walletService.redeemData(req.user.userId, redeemDto);

    return {
      success: true,
      message: `Data redemption of ${redeemDto.dataBundle} initiated successfully`,
      data: {
        transactionId: transaction.id,
        amount: redeemDto.amount,
        phoneNumber: redeemDto.phoneNumber,
        network: redeemDto.network,
        dataBundle: redeemDto.dataBundle,
        reference: transaction.reference,
        status: transaction.status,
      },
    };
  }

  /**
   * Withdraw cash to bank account
   * POST /wallet/withdraw/cash
   */
  @Post('withdraw/cash')
  @HttpCode(HttpStatus.OK)
  async withdrawCash(@Request() req: RequestWithUser, @Body() withdrawDto: WithdrawCashDto) {
    const transaction = await this.walletService.withdrawCash(req.user.userId, withdrawDto);

    return {
      success: true,
      message: `Cash withdrawal of ₦${withdrawDto.amount} initiated successfully`,
      data: {
        transactionId: transaction.id,
        amount: Number(transaction.amount),
        bankAccount: withdrawDto.bankAccount,
        reference: transaction.reference,
        status: transaction.status,
        note: 'Your withdrawal will be processed within 5-10 minutes',
      },
    };
  }

  /**
   * Link crypto wallet
   * POST /wallet/crypto/link
   */
  @Post('crypto/link')
  @HttpCode(HttpStatus.OK)
  async linkCryptoWallet(@Request() req: RequestWithUser, @Body() linkDto: LinkCryptoWalletDto) {
    const wallet = await this.walletService.linkCryptoWallet(req.user.userId, linkDto);

    return {
      success: true,
      message: 'Crypto wallet linked successfully',
      data: {
        walletAddress: wallet.cryptoWalletAddress,
        walletType: linkDto.walletType,
      },
    };
  }

  /**
   * Redeem crypto (USDT payout)
   * POST /wallet/redeem/crypto
   */
  @Post('redeem/crypto')
  @HttpCode(HttpStatus.OK)
  async redeemCrypto(@Request() req: RequestWithUser, @Body() redeemDto: RedeemCryptoDto) {
    const transaction = await this.walletService.redeemCrypto(req.user.userId, redeemDto);

    return {
      success: true,
      message: 'Crypto withdrawal initiated successfully',
      data: {
        transactionId: transaction.id,
        coinAmount: redeemDto.coinAmount,
        cryptoType: redeemDto.cryptoType,
        reference: transaction.reference,
        status: transaction.status,
        note: 'Your crypto withdrawal will be processed within 24 hours',
      },
    };
  }

  /**
   * Get transaction history
   * GET /wallet/transactions
   */
  @Get('transactions')
  async getTransactions(@Request() req: RequestWithUser, @Query() query: GetTransactionsDto) {
    const result = await this.walletService.getTransactions(req.user.userId, query);

    return {
      success: true,
      data: result.transactions,
      pagination: result.pagination,
    };
  }

  /**
   * Get transaction by reference
   * GET /wallet/transaction/:reference
   */
  @Get('transaction/:reference')
  async getTransactionByReference(@Request() req: RequestWithUser, @Query('reference') reference: string) {
    const transactions = await this.walletService.getTransactions(req.user.userId, { limit: 1000 });
    const transaction = transactions.transactions.find((t) => t.reference === reference);

    if (!transaction) {
      return {
        success: false,
        message: 'Transaction not found',
      };
    }

    return {
      success: true,
      data: transaction,
    };
  }
}
