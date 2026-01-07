import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../modules/user/service/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET') || 'changeme'
    });
  }

  async validate(payload: any) {
    // Payload should contain { userId: string }
    const user = await this.usersService.findById(payload.userId || payload.sub);
    if (!user) return null;

    return {
      userId: user.id.toString(),
      phone: user.phone,
      rank: user.rank,
    };
  }
}
