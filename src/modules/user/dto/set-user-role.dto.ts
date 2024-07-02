import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Roles } from '@modules/app/app.roles';

export class SetUserRoleDTO {
  @ApiProperty({
    description: 'Role to assign to the user',
    example: Roles.MANAGEMENT_STAFF,
  })
  @IsEnum(Roles)
  role: Roles;
}
