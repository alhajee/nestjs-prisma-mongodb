import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import {
  AWS_S3_BUCKET,
  AWS_S3_REGION,
  AWS_S3_ENDPOINT,
} from '@constants/env.constants';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@providers/prisma';
import { SaveFileToDBParams } from './types';

@Injectable()
export class UploadService {
  s3Client: S3Client;
  bucketUrl: string;

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.s3Client = new S3Client({
      region: this.configService.getOrThrow(AWS_S3_REGION),
    });
    this.bucketUrl =
      this.configService.get(AWS_S3_ENDPOINT) ||
      this.configService.get(AWS_S3_BUCKET)
        ? `https://${this.configService.get(AWS_S3_BUCKET)}.s3.amazonaws.com`
        : 'https://scidar-drs-uploads.s3.amazonaws.com';
  }

  async upload(file: Express.Multer.File, uploaderId: string) {
    try {
      const parallelUploads3 = new Upload({
        client: this.s3Client,
        params: {
          Bucket: 'scidar-drs-uploads',
          Key: file.filename,
          Body: file.buffer,
          ACL: 'public-read',
          ContentType: file.mimetype,
          ContentDisposition: 'inline',
        },

        tags: [
          /*...*/
        ], // optional tags
        queueSize: 4, // optional concurrency configuration
        partSize: 1024 * 1024 * 5, // optional size of each part, in bytes, at least 5MB
        leavePartsOnError: false, // optional manually handle dropped parts
      });

      parallelUploads3.on('httpUploadProgress', (progress) => {
        console.log(progress);
      });

      await parallelUploads3.done();

      // Generate the URL for accessing the uploaded file
      const fileUrl = `${this.bucketUrl}/${file.filename}`;

      // Save file details to the database
      const savedFile = await this.saveFileToDatabase({
        fileName: file.filename,
        originalFilename: file.originalname,
        fileUrl,
        contentType: file.mimetype,
        size: file.size,
        uploaderId,
      });

      // Return the details of the uploaded file
      return savedFile;
    } catch (e) {
      console.log(e);
    }
  }

  async saveFileToDatabase({
    fileName,
    originalFilename,
    fileUrl,
    contentType,
    size,
    uploaderId,
  }: SaveFileToDBParams) {
    // Save file details to the database using Prisma
    const savedFile = await this.prisma.file.create({
      data: {
        filename: fileName,
        originalFilename,
        path: fileUrl,
        uploader: {
          connect: {
            id: uploaderId,
          },
        },
        contentType,
        size,
      },
    });

    return savedFile;
  }
}
