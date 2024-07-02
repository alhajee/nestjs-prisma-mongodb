import {
  ApprovalRequest,
  ApprovalStatus,
  File,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import { Injectable, Inject, Logger } from '@nestjs/common';
import { DocumentElasticIndex } from '@modules/search/search-index/document.elastic.index';
import { MailService } from '@modules/mail/services/mail.service';

@Injectable()
export class PrismaMiddleware {
  logger: Logger;
  constructor(
    @Inject(DocumentElasticIndex)
    private readonly documentESIndex: DocumentElasticIndex,
    private readonly prisma: PrismaClient,
    private readonly mailService: MailService,
  ) {
    this.logger = new Logger(PrismaMiddleware.name);
  }

  createFileMiddleware(): Prisma.Middleware {
    return async (params: Prisma.MiddlewareParams, next): Promise<any> => {
      const result: File = await next(params);

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
      const result: File = await next(params);

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

  deleteFileMiddleware(): Prisma.Middleware {
    return async (params: Prisma.MiddlewareParams, next): Promise<any> => {
      const result: File = await next(params);

      if (params.model === 'File' && params.action === 'delete') {
        try {
          await this.documentESIndex.deleteFileDocument(result);
        } catch (error) {
          this.logger.error(error);
        }
      }

      return result;
    };
  }

  onApprovalRequestCreate(): Prisma.Middleware {
    return async (params: Prisma.MiddlewareParams, next): Promise<any> => {
      const result: ApprovalRequest = await next(params);

      if (params.model === 'ApprovalRequest' && params.action === 'create') {
        // Fetch the project, document, and user details
        const request = await this.prisma.approvalRequest.findUnique({
          where: { id: result.id },
          include: {
            project: {
              include: {
                managers: true,
              },
            },
            submittedBy: true,
            document: true,
          },
        });

        const { project, document, submittedBy } = request;

        if (request.project && request.submittedBy && request.document) {
          const managerEmails = request.project.managers.map(
            (manager) => manager.email,
          );
          await this.mailService.sendApprovalRequestNotification(
            managerEmails,
            {
              projectName: project.name,
              documentName: document.filename,
              requestedBy: `${submittedBy.firstName} ${submittedBy.lastName}`,
              submissionDate: new Date().toISOString(),
              reviewLink: `https://drs.scidar.org/projects/${project.id}/requests/${result.id}/review`,
            },
          );
        }
      }
      return result;
    };
  }

  onApprovalRequestUpdate(): Prisma.Middleware {
    return async (params: Prisma.MiddlewareParams, next): Promise<any> => {
      if (params.model === 'ApprovalRequest' && params.action === 'update') {
        const approvalRequestBeforeUpdate =
          await this.prisma.approvalRequest.findUnique({
            where: params.args.where,
          });

        const result: ApprovalRequest = await next(params);

        const request = await this.prisma.approvalRequest.findUnique({
          where: { id: result.id },
          include: {
            project: true,
            submittedBy: true,
            document: true,
          },
        });

        const { document, submittedBy, project } = request;

        if (
          approvalRequestBeforeUpdate &&
          approvalRequestBeforeUpdate.status !== ApprovalStatus.APPROVED &&
          result.status === ApprovalStatus.APPROVED
        ) {
          if (document && submittedBy) {
            try {
              this.mailService.sendApprovalNotification(submittedBy.email, {
                documentName: document.filename,
                approvalDate: new Date().toISOString(),
                requestedBy: `${submittedBy.firstName} ${submittedBy.lastName}`,
                projectLink: `https://drs.scidar.org/projects/${project.id}`,
              });
            } catch (error) {
              this.logger.error(error);
            }
          }
        } else if (
          approvalRequestBeforeUpdate &&
          approvalRequestBeforeUpdate.status !== ApprovalStatus.DECLINED &&
          result.status === ApprovalStatus.DECLINED
        ) {
          const { submittedBy, project, disapprovalReason } = request;

          if (document && submittedBy) {
            try {
              this.mailService.sendDisapprovalNotification(submittedBy.email, {
                documentName: document.filename,
                disapprovalDate: new Date().toISOString(),
                disapprovalReason: disapprovalReason,
                requestedBy: `${submittedBy.firstName} ${submittedBy.lastName}`,
                projectLink: `https://drs.scidar.org/projects/${project.id}`,
              });
            } catch (error) {
              this.logger.error(error);
            }
          }
        }
        return result;
      }
      return next(params);
    };
  }
}
