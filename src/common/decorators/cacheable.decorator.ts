import { applyDecorators } from '@nestjs/common';
import { CacheService } from '../services/cache.service';

export function Cacheable(
  keyPrefix: string,
  ttl: number = 300, // 5 minutes default
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheService: CacheService = (this as any).cacheService;
      const cacheKey = `${keyPrefix}:${JSON.stringify(args)}`;

      try {
        const cached = await cacheService.get(cacheKey);
        if (cached !== null) {
          return cached;
        }
      } catch (error) {
        // Continue if cache fails
      }

      const result = await originalMethod.apply(this, args);

      try {
        await cacheService.set(cacheKey, result, ttl);
      } catch (error) {
        // Continue if cache write fails
      }

      return result;
    };

    return descriptor;
  };
}
