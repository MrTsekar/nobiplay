import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './controller/admin.controller';
import { AdminService } from './service/admin.service';
import { AdminUser, AdminAuditLog } from './entity/admin.entity';
import { SupportTicket } from './entity/support-ticket.entity';
import { AdminStats } from './entity/admin-stats.entity';
import { User } from '../user/entity/user.entity';
import { TriviaSession } from '../trivia/entity/trivia-session.entity';
import { Transaction } from '../wallet/entity/transaction.entity';
import { AuthModule } from '../auth/auth.module';
import { CacheModule } from '../../common/modules/cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdminUser,
      AdminAuditLog,
      SupportTicket,
      AdminStats,
      User,
      TriviaSession,
      Transaction,
    ]),
    AuthModule,
    CacheModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
