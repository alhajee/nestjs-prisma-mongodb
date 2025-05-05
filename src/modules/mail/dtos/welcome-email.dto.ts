import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendWelcomeEmailDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  name: string;
}
