import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { AWS_S3_REGION } from '@constants/env.constants';
import { Inject, Injectable, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@providers/prisma';

@Injectable()
export class UploadService {
  s3Client: S3Client;

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.s3Client = new S3Client({
      region: this.configService.getOrThrow(AWS_S3_REGION),
    });
  }

  async upload(
    fileName: string,
    file: Buffer,
    metadata: any,
    uploaderId: string,
  ) {
    try {
      const parallelUploads3 = new Upload({
        client: this.s3Client,
        params: {
          Bucket: 'scidar-drs-uploads',
          Key: fileName,
          Body: file,
          ACL: 'public-read',
          ContentType: metadata.mimetype,
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
      const fileUrl = `https://scidar-drs-uploads.s3.amazonaws.com/${fileName}`;

      // Save file details to the database
      const savedFile = await this.saveFileToDatabase(
        fileName,
        fileUrl,
        metadata,
        uploaderId,
      );

      // Return the details of the uploaded file
      return savedFile;
    } catch (e) {
      console.log(e);
    }
  }

  async saveFileToDatabase(
    fileName: string,
    fileUrl: string,
    metadata: any,
    uploaderId: string,
  ) {
    // Save file details to the database using Prisma
    const savedFile = await this.prisma.file.create({
      data: {
        filename: fileName,
        originalFilename: metadata.originalFilename,
        path: fileUrl,
        uploader: {
          connect: {
            id: uploaderId,
          },
        },
        contentType: metadata.contentType,
        size: metadata.size,
      },
    });

    return savedFile;
  }
}
