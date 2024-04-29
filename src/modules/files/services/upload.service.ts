import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { AWS_S3_REGION } from '@constants/env.constants';
import { Inject, Injectable, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UploadService {
  s3Client: S3Client;

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {
    this.s3Client = new S3Client({
      region: this.configService.getOrThrow(AWS_S3_REGION),
    });
  }

  async upload(fileName: string, file: Buffer) {
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: 'scidar-drs-uploads',
        Key: fileName,
        Body: file,
      }),
    );
  }
}
