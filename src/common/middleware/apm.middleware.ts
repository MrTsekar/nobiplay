import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import apm from 'elastic-apm-node';

@Injectable()
export class ApmMiddleware implements NestMiddleware {
  private logger = new Logger('APM');

  use(req: Request, res: Response, next: NextFunction) {
    const transaction = apm.startTransaction(
      `${req.method} ${req.path}`,
      'request',
    );

    res.on('finish', () => {
      if (transaction) {
        transaction.result = `HTTP ${res.statusCode}`;
        transaction.end();
      }
    });

    next();
  }
}
