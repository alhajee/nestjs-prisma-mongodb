import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  FileTypeValidator,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseInterceptors,
  Version,
  Put,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DocumentService } from './document.service';
import { UploadService } from './upload.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CaslUser, UserProxy } from '@modules/casl';
import { DocumentSearchDTO } from './dto/document-search.dto';
import { DocumentsPaginationDTO } from './dto/documents-pagination.dto';
import { MyDocumentsPaginationDTO } from './dto/my-documents-pagination.dto';
import { DisapproveDocumentDTO } from './dto/disapprove-document.dto';

@ApiTags('Documents')
@Controller('documents')
export class DocumentController {
  constructor(
    private readonly documentService: DocumentService,
    private readonly uploadService: UploadService,
  ) {}

  @Version('1')
  @ApiQuery({ type: DocumentSearchDTO })
  @ApiOperation({ summary: 'Search within documents' })
  @ApiResponse({ status: 200, description: 'Search successful' })
  @ApiBearerAuth()
  @Get('/search')
  public async search(@Query() query: any): Promise<any> {
    return this.documentService.search(query.q);
  }

  @Version('1')
  @Post('upload')
  @ApiOperation({ summary: 'Upload a document' })
  @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        comment: { type: 'string' },
        outletId: { type: 'integer' },
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 4 }), //4mb
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg|pdf|doc)' }),
        ],
      }),
    )
    file: Express.Multer.File,
    @CaslUser() userProxy?: UserProxy<User>,
  ) {
    const tokenUser = await userProxy.get();

    console.log(file);
    await this.uploadService.upload(file, tokenUser.id);
  }

  @Version('1')
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get documents with pagination' })
  @ApiResponse({ status: 200, description: 'Documents retrieved successfully' })
  async getDocuments(@Query() paginationDTO: DocumentsPaginationDTO) {
    return this.documentService.getDocuments(paginationDTO);
  }

  @Version('1')
  @Get('mine')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get your documents with pagination' })
  @ApiResponse({ status: 200, description: 'Documents retrieved successfully' })
  async getMyDocuments(
    @Query() paginationDTO: MyDocumentsPaginationDTO,
    @CaslUser() userProxy?: UserProxy<User>,
  ) {
    const tokenUser = await userProxy.get();
    return this.documentService.getMyDocuments(paginationDTO, tokenUser.id);
  }

  @Version('1')
  @Get(':documentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a document by ID' })
  @ApiResponse({ status: 200, description: 'Document retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async getDocumentById(@Param('documentId') id: string) {
    return this.documentService.getDocumentById(id);
  }

  @Version('1')
  @Patch(':documentId/approve')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a document' })
  @ApiResponse({ status: 200, description: 'Document approved successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async approveDocument(@Param('documentId') id: string) {
    return this.documentService.approveDocument(id);
  }

  @Version('1')
  @Patch(':documentId/rename')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rename a document' })
  @ApiResponse({ status: 200, description: 'Document renamed successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async renameDocument(
    @Param('documentId') id: string,
    @Body() newName: string,
  ) {
    return this.documentService.renameDocument(id, newName);
  }

  @Version('1')
  @Delete(':documentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a document' })
  @ApiResponse({ status: 200, description: 'Document deleted successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async deleteDocument(@Param('documentId') id: string) {
    return this.documentService.deleteDocument(id);
  }

  /**
   * Disapprove a document.
   * @param documentId The ID of the file to disapprove.
   * @param disapproveDocumentDTO The disapproval reason.
   * @returns The updated file.
   */
  @Put(':documentId/disapprove')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disapprove a document' })
  @ApiResponse({
    status: 200,
    description: 'Document disapproved successfully',
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async disapproveDocument(
    @Param('documentId') fileId: string,
    @Body() disapproveDocumentDTO: DisapproveDocumentDTO,
  ) {
    const { disapprovalReason } = disapproveDocumentDTO;
    return this.documentService.disapproveDocument(fileId, disapprovalReason);
  }
}
