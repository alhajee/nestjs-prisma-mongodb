import { Injectable } from '@nestjs/common';
import { PrismaService } from '@providers/prisma';
import { File, Prisma } from '@prisma/client';
import { paginator } from '@nodeteam/nestjs-prisma-pagination';
import { PaginatorTypes } from '@nodeteam/nestjs-prisma-pagination';
import { PrismaRepositoryClient } from '@providers/prisma/types';

@Injectable()
export class FileRepository {
  private readonly paginate: PaginatorTypes.PaginateFunction;

  constructor(private prisma: PrismaService) {
    this.paginate = paginator({
      page: 1,
      perPage: 10,
    });
  }

  async findById(
    id: string,
    transactionClient: PrismaRepositoryClient = this.prisma,
  ): Promise<File> {
    return transactionClient.file.findUnique({
      where: { id },
    });
  }

  async findOne(
    params: Prisma.FileFindFirstArgs,
    transactionClient: PrismaRepositoryClient = this.prisma,
  ): Promise<File | null> {
    return transactionClient.file.findFirst(params);
  }

  async create(
    data: Prisma.FileCreateInput,
    transactionClient: PrismaRepositoryClient = this.prisma,
  ): Promise<File> {
    return transactionClient.file.create({
      data,
    });
  }

  async findAll(
    where: Prisma.FileWhereInput,
    include: Prisma.FileInclude,
    orderBy?: Prisma.FileOrderByWithRelationInput,
    paginationOptions?: PaginatorTypes.PaginateOptions,
    transactionClient: PrismaRepositoryClient = this.prisma,
  ): Promise<PaginatorTypes.PaginatedResult<File>> {
    const paginate = paginator(paginationOptions);
    return paginate(transactionClient.file, {
      where,
      orderBy,
      include,
    });
  }

  async updateFile(
    id: string,
    data: Prisma.FileUpdateInput,
    transactionClient: PrismaRepositoryClient = this.prisma,
  ): Promise<File> {
    return transactionClient.file.update({
      where: { id },
      data,
    });
  }

  async deleteFile(
    id: string,
    transactionClient: PrismaRepositoryClient = this.prisma,
  ): Promise<File> {
    return transactionClient.file.delete({
      where: { id },
    });
  }
}
