import { Order } from '@constants/order.constants';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { DocumentFiltersDTO } from './document-filter.dto';

export class DocumentsPaginationDTO {
  @ApiPropertyOptional({ enum: Order, default: Order.ASC })
  @IsEnum(Order)
  @IsOptional()
  readonly order?: Order = Order.ASC;

  @ApiPropertyOptional({
    minimum: 1,
    default: 1,
    description: 'Page number',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  readonly page?: number = 1;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 50,
    default: 10,
    description: 'Items per page',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  readonly limit?: number = 10;

  @IsOptional()
  @ValidateNested()
  @Type(() => DocumentFiltersDTO)
  @ApiProperty({
    description: 'Filters to apply to the file query',
    type: DocumentFiltersDTO,
    required: false,
  })
  filters?: DocumentFiltersDTO;

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}
