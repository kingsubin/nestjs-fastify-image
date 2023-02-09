import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bucket, Storage } from '@google-cloud/storage';
import * as fastifyMultipart from '@fastify/multipart';

@Injectable()
export class AppService {
  private readonly bucket: Bucket;
  private readonly keyFilename: string;
  private readonly storageName: string;

  constructor(private readonly configService: ConfigService) {
    this.keyFilename = configService.getOrThrow<string>('STORAGE_KEY_FILENAME');
    this.storageName = configService.getOrThrow<string>('STORAGE_NAME');

    this.bucket = new Bucket(
      new Storage({
        keyFilename: this.keyFilename,
      }),
      this.storageName,
    );
  }

  getHello(): string {
    return 'Hello World!';
  }

  async uploadSingle(
    multipartFile: fastifyMultipart.MultipartFile,
  ): Promise<string> {
    const buffer = await multipartFile.toBuffer();

    const file = this.bucket.file(`${Date.now()}.${multipartFile.filename}`);

    await file.save(buffer);

    return file.publicUrl();
  }

  async uploadBulk(
    files: AsyncIterableIterator<fastifyMultipart.MultipartFile>,
  ): Promise<string[]> {
    const urls: string[] = [];
    for await (const file of files) {
      const buffer = await file.toBuffer();

      const bucketFile = this.bucket.file(`${Date.now()}.${file.filename}`);

      await bucketFile.save(buffer);

      urls.push(bucketFile.publicUrl());
    }

    return urls;
  }

  async uploadConcurrency(
    files: AsyncIterableIterator<fastifyMultipart.MultipartFile>,
  ): Promise<void> {
    const unwrapMultipartFiles = async (
      files: AsyncIterableIterator<fastifyMultipart.MultipartFile>,
    ): Promise<Buffer[]> => {
      const bufferPromises: Array<Promise<Buffer>> = [];
      for await (const file of files) {
        bufferPromises.push(file.toBuffer());
      }

      return await Promise.all(bufferPromises);
    };

    const buffers = await unwrapMultipartFiles(files);

    await Promise.all(
      buffers.map((buffer) =>
        this.bucket.file(`${Date.now()}.png`).save(buffer),
      ),
    );
  }
}
