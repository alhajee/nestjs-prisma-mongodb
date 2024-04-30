import { Injectable, NotFoundException } from '@nestjs/common';
import { File } from '@prisma/client';
import { PrismaService } from '@providers/prisma';
import { PaginationDTO } from '../../../dto/pagination.dto';

@Injectable()
export class DocumentService {
  constructor(private readonly prisma: PrismaService) {}

  async getDocumentById(id: string): Promise<File> {
    const document = await this.prisma.file.findUnique({
      where: { id },
    });
    if (!document) {
      throw new NotFoundException('Document not found');
    }
    return document;
  }

  async getDocuments(paginationDTO: PaginationDTO) {
    const { page, limit, skip } = paginationDTO;
    const documents = await this.prisma.file.findMany({
      take: limit,
      skip,
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
}
