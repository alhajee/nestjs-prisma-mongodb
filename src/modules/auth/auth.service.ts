import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { SignUpDto } from './dto/sign-up.dto';
import { UserRepository } from '@modules/user/user.repository';
import {
  INVALID_CREDENTIALS,
  NOT_FOUND,
  USER_CONFLICT,
} from '@constants/errors.constants';
import { User } from '@prisma/client';
import { SignInDto } from '@modules/auth/dto/sign-in.dto';
import { TokenService } from '@modules/auth/token.service';
import { RedisService } from './redis.service';
import { MailService } from '@modules/mail/services/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenService: TokenService,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
  ) {}

  /**
   * @desc Create a new user
   * @param signUpDto
   * @returns Promise<User> - Created user
   * @throws ConflictException - User with this email or phone already exists
   */
  async singUp(signUpDto: SignUpDto): Promise<User> {
    const testUser: User = await this.userRepository.findOne({
      where: { email: signUpDto.email },
    });

    if (testUser) {
      // 409001: User with this email or phone already exists
      throw new ConflictException(USER_CONFLICT);
    }

    return this.userRepository.create(signUpDto);
  }

  /**
   * @desc Sign in a user
   * @returns Auth.AccessRefreshTokens - Access and refresh tokens
   * @throws NotFoundException - User not found
   * @throws UnauthorizedException - Invalid credentials
   * @param signInDto - User credentials
   */
  async signIn(
    signInDto: SignInDto,
    deviceIp: string,
  ): Promise<Auth.AccessRefreshTokens> {
    const testUser = await this.getUserByEmail(signInDto.email);

    if (!testUser) {
      // 404001: User not found
      throw new NotFoundException(NOT_FOUND);
    }

    if (
      !(await this.tokenService.isPasswordCorrect(
        signInDto.password,
        testUser.password,
      ))
    ) {
      // 401001: Invalid credentials
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    // Check if device exists in Redis
    const isNewDevice = await this.isDeviceIPNew(testUser.id, deviceIp);

    if (isNewDevice) {
      // Generate OTP
      const otp = this.generateOTP(6);

      // Save OTP in Redis
      await this.saveOTP(testUser.id, otp);

      // Send OTP via email
      await this.mailService.sendOTPConirmation(testUser.email, { otp });
      Logger.debug(otp, 'OTP');

      throw new BadRequestException('PLEASE_VERIFY_OTP');
    }

    return this.sign(testUser, deviceIp);
  }

  async sign(user: User, deviceIp: string) {
    // Save device to redis
    await this.saveDeviceIP(user.id, deviceIp);

    return this.tokenService.sign({
      id: user.id,
      email: user.email,
      roles: user.roles,
    });
  }

  async getUserByEmail(email: string): Promise<User> {
    return this.userRepository.findOne({
      where: {
        email,
      },
      select: {
        id: true,
        email: true,
        password: true,
        roles: true,
      },
    });
  }

  refreshTokens(
    refreshToken: string,
  ): Promise<Auth.AccessRefreshTokens | void> {
    return this.tokenService.refreshTokens(refreshToken);
  }

  logout(userId: string, accessToken: string): Promise<void> {
    return this.tokenService.logout(userId, accessToken);
  }

  async saveDeviceIP(userId: string, ip: string) {
    // Save device IP in Redis with expiration (e.g., 24 hours)
    await this.redisService.set(`device:${userId}:${ip}`, 86400);
  }

  async isDeviceIPNew(userId: string, ip: string): Promise<boolean> {
    // Check if device IP is new by querying Redis
    const result = await this.redisService.exists(`device:${userId}:${ip}`);
    return result === 0; // Returns 0 if key doesn't exist (new device)
  }

  generateOTP = (n: number): string => {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < n; i++) {
      otp += digits[Math.floor(Math.random() * digits.length)];
    }
    return otp;
  };

  async saveOTP(userId: string, otp: string) {
    // Save OTP in Redis with expiration (e.g., 10 minutes)
    await this.redisService.set(`otp:${userId}`, otp, 600);
  }

  async verifyOTP(userId: string, otp: string): Promise<boolean> {
    // Verify OTP against the saved OTP in Redis
    const savedOTP = await this.redisService.get(`otp:${userId}`);
    return savedOTP === otp;
  }

  async clearOTP(userId: string) {
    // Clear OTP from Redis after successful login
    await this.redisService.del(`otp:${userId}`);
  }
}
