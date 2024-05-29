import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { File, Prisma } from '@prisma/client';
import { PrismaService } from '@providers/prisma';
import { DocumentSearchObject } from '@modules/search/objects/document.search.object';
import { SearchService } from '@modules/search/search.service';
import { DocumentFiltersDTO } from './dto/document-filter.dto';
import { DocumentsPaginationDTO } from './dto/documents-pagination.dto';
import { MyDocumentsPaginationDTO } from './dto/my-documents-pagination.dto';
import { FileRepository } from './file.repository';
import { DOCUMENT_NOT_FOUND } from '@constants/errors.constants';
import { PaginatorTypes } from '@nodeteam/nestjs-prisma-pagination';

@Injectable()
export class DocumentService {
  constructor(
    @Inject('SearchServiceInterface')
    private readonly searchService: SearchService,
    private readonly prisma: PrismaService,
    private readonly fileRepository: FileRepository,
  ) {}

  public async search(q: any): Promise<any> {
    const data = DocumentSearchObject.searchObject(q);
    return await this.searchService.searchIndex(data);
  }

  async getDocumentById(id: string): Promise<File> {
    const document = await this.prisma.file.findUnique({
      where: { id },
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        sharedWith: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });
    if (!document) {
      throw new NotFoundException('Document not found');
    }
    return document;
  }

  async getDocuments(
    paginationDTO: DocumentsPaginationDTO,
  ): Promise<PaginatorTypes.PaginatedResult<File>> {
    const { page, limit, filters, sortBy, order } = paginationDTO;

    const where = this.buildWhereClause(filters);
    const include = {
      uploader: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
        },
      },
      sharedWith: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
        },
      },
    };

    const paginationOptions: PaginatorTypes.PaginateOptions = {
      page,
      perPage: limit,
    };

    const sortByColumn: Prisma.FileOrderByWithRelationInput = {
      [sortBy]: order,
    };

    return this.fileRepository.findAll(
      where,
      include,
      sortByColumn,
      paginationOptions,
    );
  }

  async getMyDocuments(
    paginationDTO: MyDocumentsPaginationDTO,
    userId: string,
  ) {
    const { page, limit, skip } = paginationDTO;
    const documents = await this.prisma.file.findMany({
      where: {
        uploader: {
          id: userId,
        },
      },
      take: limit,
      skip,
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        sharedWith: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });
    const totalDocuments = await this.prisma.file.count();
    return {
      data: documents,
      page,
      limit,
      totalDocuments,
    };
  }

  async approveDocument(id: string) {
    const document = await this.getDocumentById(id);
    // Implement approval logic (e.g., set a flag to indicate approval)
    const approvedDocument = await this.prisma.file.update({
      where: { id },
      data: { isApproved: true },
    });
    return approvedDocument;
  }

  async toggleDocumentVisibility(id: string) {
    const document = await this.getDocumentById(id);
    const updatedDocument = await this.prisma.file.update({
      where: { id },
      data: { isPublic: !document.isPublic }, // Toggle visibility
    });
    return updatedDocument;
  }

  async renameDocument(id: string, newName: string) {
    const document = await this.getDocumentById(id);
    const renamedDocument = await this.prisma.file.update({
      where: { id },
      data: { filename: newName },
    });
    return renamedDocument;
  }

  async deleteDocument(id: string) {
    const document = await this.getDocumentById(id);
    // Implement deletion logic (e.g., delete the file from storage)
    await this.prisma.file.delete({ where: { id } });
    return { message: 'Document deleted successfully' };
  }

  /**
   * Disapprove a document by ID.
   * @param documentId The ID of the file to disapprove.
   * @param disapprovalReason The reason for disapproval.
   * @returns The updated file.
   */
  async disapproveDocument(
    documentId: string,
    disapprovalReason?: string,
  ): Promise<File> {
    const file = await this.fileRepository.findById(documentId);
    if (!file) {
      throw new NotFoundException(DOCUMENT_NOT_FOUND);
    }
    return this.fileRepository.updateFile(documentId, {
      isApproved: false,
      disapprovalReason,
    });
  }

  private buildWhereClause(filters: DocumentFiltersDTO) {
    const where: any = {};

    if (filters) {
      if (filters.filename) {
        where.filename = { contains: filters.filename, mode: 'insensitive' };
      }
      if (filters.uploaderId) {
        where.uploaderId = filters.uploaderId;
      }
      if (filters.isApproved !== undefined) {
        where.isApproved = filters.isApproved;
      }
      if (filters.isPublic !== undefined) {
        where.isPublic = filters.isPublic;
      }
      if (filters.sizeMin !== undefined) {
        where.size = { ...where.size, gte: filters.sizeMin };
      }
      if (filters.sizeMax !== undefined) {
        where.size = { ...where.size, lte: filters.sizeMax };
      }
      if (filters.fileType) {
        where.fileType = filters.fileType;
      }
      if (filters.uploadedAfter) {
        where.uploadDate = {
          ...where.uploadDate,
          gte: new Date(filters.uploadedAfter),
        };
      }
      if (filters.uploadedBefore) {
        where.uploadDate = {
          ...where.uploadDate,
          lte: new Date(filters.uploadedBefore),
        };
      }
      if (filters.tags) {
        where.tags = { hasSome: filters.tags };
      }
      if (filters.contentType) {
        where.contentType = filters.contentType;
      }
      if (filters.description) {
        where.description = {
          contains: filters.description,
          mode: 'insensitive',
        };
      }
      if (filters.originalFilename) {
        where.originalFilename = {
          contains: filters.originalFilename,
          mode: 'insensitive',
        };
      }
      if (filters.sharedWithIDs) {
        where.sharedWithIDs = { hasSome: filters.sharedWithIDs };
      }

      // Apply search filter
      if (filters.search) {
        where.OR = [
          { filename: { contains: filters.search, mode: 'insensitive' } },
          {
            uploader: {
              name: { contains: filters.search, mode: 'insensitive' },
            },
          },
        ];
      }
    }

    return where;
  }
}
