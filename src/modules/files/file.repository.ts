import { Injectable } from '@nestjs/common';
import { File, Prisma } from '@prisma/client';
import { PrismaService } from '@providers/prisma';

@Injectable()
export class FileRepository {
  constructor(private prisma: PrismaService) {}

  /**
   * Find a file by ID.
   * @param id string
   * @returns Promise<File>
   */
  async findById(id: string): Promise<File | null> {
    return this.prisma.file.findUnique({
      where: { id },
    });
  }

  /**
   * Update a file by ID.
   * @param id string
   * @param data Prisma.FileUpdateInput
   * @returns Promise<File>
   */
  async updateFile(id: string, data: Prisma.FileUpdateInput): Promise<File> {
    return this.prisma.file.update({
      where: { id },
      data,
    });
  }
}
