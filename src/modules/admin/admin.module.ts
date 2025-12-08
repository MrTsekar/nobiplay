import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './controller/admin.controller';
import { AdminService } from './service/admin.service';
import { AdminUser, AdminAuditLog } from './entity/admin.entity';
import { AuthModule } from '../auth/auth.module';
import { CacheModule } from '../../common/modules/cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminUser, AdminAuditLog]),
    AuthModule,      
    CacheModule,    
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
