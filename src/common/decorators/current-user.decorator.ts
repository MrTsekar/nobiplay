import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Custom decorator to extract the authenticated user from the request
 * Usage: @CurrentUser() user: { userId: number; phone: string; rank?: string }
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
