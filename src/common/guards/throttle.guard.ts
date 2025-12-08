import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class ThrottleGuard extends ThrottlerGuard {
  protected errorMessage = 'Too many requests. Please try again later.';
}
