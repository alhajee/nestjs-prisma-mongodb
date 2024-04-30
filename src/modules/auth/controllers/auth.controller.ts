import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  Request,
  BadRequestException,
  Ip,
} from '@nestjs/common';
import { AuthService } from '../auth.service';
import { SignUpDto } from '../dto/sign-up.dto';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import ApiBaseResponses from '@decorators/api-base-response.decorator';
import { User } from '@prisma/client';
import Serialize from '@decorators/serialize.decorator';
import UserBaseEntity from '@modules/user/entities/user-base.entity';
import { SignInDto } from '@modules/auth/dto/sign-in.dto';
import { SkipAuth } from '@modules/auth/guard/skip-auth.guard';
import RefreshTokenDto from '@modules/auth/dto/refresh-token.dto';
import {
  AccessGuard,
  Actions,
  CaslUser,
  UseAbility,
  UserProxy,
} from '@modules/casl';
import { TokensEntity } from '@modules/auth/entities/tokens.entity';
import { VerifyOTPDto } from '../dto/verify-otp.dto';

@ApiTags('Auth')
@ApiBaseResponses()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiBody({ type: SignUpDto })
  @Serialize(UserBaseEntity)
  @ApiOperation({ summary: 'Register user account' })
  @SkipAuth()
  @Post('sign-up')
  create(@Body() signUpDto: SignUpDto): Promise<User> {
    return this.authService.singUp(signUpDto);
  }

  @ApiBody({ type: SignInDto })
  @SkipAuth()
  @ApiOperation({ summary: 'Sign-in to user account' })
  @Post('sign-in')
  async signIn(
    @Body() signInDto: SignInDto,
    @Request() req: any,
    @Ip() deviceIp: string,
  ): Promise<Auth.AccessRefreshTokens> {
    return this.authService.signIn(signInDto, deviceIp);
  }

  @ApiBody({ type: VerifyOTPDto })
  @SkipAuth()
  @ApiOperation({ summary: 'Verify sign-in OTP' })
  @Post('verify-otp')
  async verifyOTP(@Body() verifyOTPDto: VerifyOTPDto, @Request() req: any) {
    const deviceIp = req.ip;
    const { email, otp } = verifyOTPDto;

    const user = await this.authService.getUserByEmail(email);

    if (!user) {
      throw new BadRequestException('Invalid OTP');
    }

    // Verify OTP
    const isOTPValid = await this.authService.verifyOTP(user.id, otp);

    if (!isOTPValid) {
      throw new BadRequestException('Invalid OTP');
    }

    // Clear OTP after successful verification
    await this.authService.clearOTP(user.id);

    // Proceed with regular authentication
    return this.authService.sign(user, deviceIp);
  }

  @ApiBody({ type: RefreshTokenDto })
  @SkipAuth()
  @ApiOperation({ summary: 'Refresh authentication token' })
  @Post('token/refresh')
  refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<Auth.AccessRefreshTokens | void> {
    return this.authService.refreshTokens(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sign-out user session' })
  @UseGuards(AccessGuard)
  @HttpCode(204)
  @UseAbility(Actions.delete, TokensEntity)
  async logout(@CaslUser() userProxy?: UserProxy<User>) {
    const { accessToken } = await userProxy.getMeta();
    const { id: userId } = await userProxy.get();

    return this.authService.logout(userId, accessToken);
  }
}
