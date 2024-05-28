import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import ApiBaseResponses from '@decorators/api-base-response.decorator';
import {
  AccessGuard,
  Actions,
  CaslConditions,
  CaslSubject,
  CaslUser,
  ConditionsProxy,
  SubjectProxy,
  UseAbility,
  UserProxy,
} from '@modules/casl';
import UserEntity from '@modules/user/entities/user.entity';
import Serialize from '@decorators/serialize.decorator';
import { OrderByPipe, WherePipe } from '@nodeteam/nestjs-pipes';
import { Prisma, User } from '@prisma/client';
import { PaginatorTypes } from '@nodeteam/nestjs-prisma-pagination';
import UserBaseEntity from '@modules/user/entities/user-base.entity';
import { UserHook } from '@modules/user/user.hook';
import ApiOkBaseResponse from '@decorators/api-ok-base-response.decorator';
import { PaginationDTO } from './dto/pagination.dto';
import { UpdateUserRolesDTO } from './dto/update-user-roles.dto';
import { SetUserRoleDTO } from './dto/set-user-role.dto';

@ApiTags('Users')
@ApiBearerAuth()
@ApiExtraModels(UserBaseEntity)
@ApiBaseResponses()
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiQuery({ name: 'where', required: false, type: 'string' })
  @ApiQuery({ name: 'orderBy', required: false, type: 'string' })
  @ApiOkBaseResponse({ dto: UserBaseEntity, isArray: true })
  @UseGuards(AccessGuard)
  @Serialize(UserBaseEntity)
  @UseAbility(Actions.read, UserEntity)
  async findAll(
    @Query() paginationDTO: PaginationDTO,
    @Query('where', WherePipe) where?: Prisma.UserWhereInput,
    @Query('orderBy', OrderByPipe)
    orderBy?: Prisma.UserOrderByWithRelationInput,
  ): Promise<PaginatorTypes.PaginatedResult<User>> {
    return this.userService.findAll(paginationDTO, where, orderBy);
  }

  @Get('me')
  @ApiOkBaseResponse({ dto: UserBaseEntity })
  @UseGuards(AccessGuard)
  @Serialize(UserBaseEntity)
  @UseAbility(Actions.read, UserEntity)
  async me(
    @CaslUser() userProxy?: UserProxy<User>,
    @CaslConditions() conditions?: ConditionsProxy,
  ): Promise<User> {
    const tokenUser = await userProxy.get();
    console.log(tokenUser);

    return this.userService.findOne(tokenUser.id);
  }

  @Patch('me')
  @UseGuards(AccessGuard)
  @Serialize(UserBaseEntity)
  @UseAbility(Actions.update, UserEntity, UserHook)
  async updateUser(
    @CaslUser() userProxy?: UserProxy<User>,
    @CaslConditions() conditions?: ConditionsProxy,
    @CaslSubject() subjectProxy?: SubjectProxy<User>,
  ): Promise<User> {
    const tokenUser = await userProxy.get();
    const subject = await subjectProxy.get();

    console.log(tokenUser);
    console.log(subject);
    console.log(conditions.toMongo());
    return subject;
  }

  /**
   * Update the roles of a user.
   * @param userId The ID of the user to update.
   * @param updateUserRolesDTO The new roles to assign to the user.
   * @returns The updated user.
   */
  @Put(':userId/roles')
  @ApiOperation({ summary: 'Update user roles' })
  @ApiResponse({ status: 200, description: 'User roles updated successfully' })
  async updateUserRoles(
    @Param('userId') userId: string,
    @Body() updateUserRolesDTO: UpdateUserRolesDTO,
  ) {
    const { roles } = updateUserRolesDTO;
    return this.userService.updateUserRoles(userId, roles);
  }

  /**
   * Set the role of a user.
   * @param userId The ID of the user to update.
   * @param setUserRoleDTO The new role to assign to the user.
   * @returns The updated user.
   */
  @Put(':userId/role')
  @ApiOperation({ summary: 'Set user role' })
  @ApiResponse({ status: 200, description: 'User role updated successfully' })
  async setUserRole(
    @Param('userId') userId: string,
    @Body() setUserRoleDTO: SetUserRoleDTO,
  ) {
    const { role } = setUserRoleDTO;
    return this.userService.setUserRole(userId, role);
  }
}
