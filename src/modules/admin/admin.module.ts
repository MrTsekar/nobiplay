import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './controller/admin.controller';
import { AdminService } from './service/admin.service';
import { AdminUser, AdminAuditLog } from './entity/admin.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminUser, AdminAuditLog]),
    AuthModule,  
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
