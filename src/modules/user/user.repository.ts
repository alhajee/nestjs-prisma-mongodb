import { PrismaService } from '@providers/prisma';
import { Injectable } from '@nestjs/common';
import { paginator } from '@nodeteam/nestjs-prisma-pagination';
import { PaginatorTypes } from '@nodeteam/nestjs-prisma-pagination';
import { Prisma, User } from '@prisma/client';
import { PrismaRepositoryClient } from '@providers/prisma/types';

@Injectable()
export class UserRepository {
  private readonly paginate: PaginatorTypes.PaginateFunction;

  constructor(private prisma: PrismaService) {
    /**
     * @desc Create a paginate function
     * @param model
     * @param options
     * @returns Promise<PaginatorTypes.PaginatedResult<T>>
     */
    this.paginate = paginator({
      page: 1,
      perPage: 10,
    });
  }

  /**
   * @desc Find a user by ID
   * @param id string
   * @returns Promise<User | null>
   *       If the user is not found, returns null
   */
  findById(
    id: string,
    transactionClient: PrismaRepositoryClient = this.prisma,
  ): Promise<User> {
    return transactionClient.user.findUnique({
      where: { id },
    });
  }

  /**
   * @desc Find a user by params
   * @param params Prisma.UserFindFirstArgs
   * @returns Promise<User | null>
   *       If the user is not found, return null
   */
  async findOne(
    params: Prisma.UserFindFirstArgs,
    transactionClient: PrismaRepositoryClient = this.prisma,
  ): Promise<User | null> {
    return transactionClient.user.findFirst(params);
  }

  /**
   * @desc Create a new user
   * @param data Prisma.UserCreateInput
   * @returns Promise<User>
   */
  async create(
    data: Prisma.UserCreateInput,
    transactionClient: PrismaRepositoryClient = this.prisma,
  ): Promise<User> {
    return transactionClient.user.create({
      data,
    });
  }

  /**
   * @desc Find all users with pagination
   * @param where Prisma.UserWhereInput
   * @param orderBy Prisma.UserOrderByWithRelationInput
   * @returns Promise<PaginatorTypes.PaginatedResult<User>>
   */
  async findAll(
    where: Prisma.UserWhereInput,
    orderBy: Prisma.UserOrderByWithRelationInput,
    transactionClient: PrismaRepositoryClient = this.prisma,
  ): Promise<PaginatorTypes.PaginatedResult<User>> {
    return this.paginate(transactionClient.user, {
      where,
      orderBy,
    });
  }

  /**
   * @desc Update a user by ID
   * @param id string
   * @param data Prisma.UserUpdateInput
   * @returns Promise<User>
   */
  async updateUser(
    id: string,
    data: Prisma.UserUpdateInput,
    transactionClient: PrismaRepositoryClient = this.prisma,
  ): Promise<User> {
    return await transactionClient.user.update({
      where: { id },
      data,
    });
  }

  /**
   * @desc Delete a user by ID
   * @param id string
   * @returns Promise<User>
   */
  async deleteUser(
    id: string,
    transactionClient: PrismaRepositoryClient = this.prisma,
  ): Promise<User> {
    return await transactionClient.user.delete({
      where: { id },
    });
  }
}
