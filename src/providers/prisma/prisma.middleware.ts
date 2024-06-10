import { Prisma } from '@prisma/client';
import { Injectable, Inject, Logger } from '@nestjs/common';
import { DocumentElasticIndex } from '@modules/search/search-index/document.elastic.index';

@Injectable()
export class PrismaMiddleware {
  logger: Logger;
  constructor(
    @Inject(DocumentElasticIndex)
    private readonly documentESIndex: DocumentElasticIndex,
  ) {
    this.logger = new Logger(PrismaMiddleware.name);
  }

  createFileMiddleware(): Prisma.Middleware {
    return async (params: Prisma.MiddlewareParams, next): Promise<any> => {
      const result = await next(params);

      if (params.model === 'File' && params.action === 'create') {
        try {
          await this.documentESIndex.insertFileDocument(result);
        } catch (error) {
          this.logger.error(error);
        }
      }

      return result;
    };
  }

  updateFileMiddleware(): Prisma.Middleware {
    return async (params: Prisma.MiddlewareParams, next): Promise<any> => {
      const result = await next(params);

      if (params.model === 'File' && params.action === 'update') {
        try {
          await this.documentESIndex.updateFileDocument(result);
        } catch (error) {
          this.logger.error(error);
        }
      }

      return result;
    };
  }
}
