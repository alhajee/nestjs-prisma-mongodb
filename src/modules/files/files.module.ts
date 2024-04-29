import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { MulterConfigService } from './services/multer.service';
import { UploadController } from './controllers/upload.controller';
import { UploadService } from './services/upload.service';
import { seconds, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { UPLOAD_RATE_LIMIT, UPLOAD_RATE_TTL } from '@constants/env.constants';

@Module({
  imports: [
    MulterModule.registerAsync({
      useClass: MulterConfigService,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: seconds(configService.get(UPLOAD_RATE_TTL) || 60), // default is 60 seconds
          limit: configService.get(UPLOAD_RATE_LIMIT) || 3, // default is 3 requests
        },
      ],
    }),
  ],
  controllers: [UploadController],
  providers: [
    UploadService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class FilesModule {}
