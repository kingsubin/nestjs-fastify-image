import { Controller, Get, Post, Req } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { AppService } from './app.service';
import * as fsPromises from 'fs/promises';
import * as sharp from 'sharp';

const path = '/Users/subin.lee/Project/nestjs-fastify-image/images';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('1-single')
  async single(@Req() request: FastifyRequest): Promise<void> {
    console.time('1-single');

    const data = await request.file();

    if (!data) {
      return;
    }

    const buffer = await data.toBuffer();

    const tp = `${path}/${data.filename}`;

    await fsPromises.writeFile(tp, buffer);

    console.timeEnd('1-single'); // 11.05
  }

  @Post('1-bulk')
  async bulk(@Req() request: FastifyRequest): Promise<void> {
    console.time('1-bulk');

    const files = request.files();

    for await (const file of files) {
      await fsPromises.writeFile(`${path}/${file.filename}`, file.file);
    }

    console.timeEnd('1-bulk'); // 3 -> 16.59
  }

  @Post('2-resize')
  async resize(@Req() request: FastifyRequest): Promise<void> {
    console.time('2-bulk-resize');

    const files = request.files();

    for await (const file of files) {
      const buffer = await file.toBuffer();

      const sharpInstance = sharp(buffer);

      await sharpInstance.resize(250, 250).toFile(`${path}/${file.filename}`);
    }

    console.timeEnd('2-bulk-resize'); // 3 -> 48.57
  }

  @Post('3-format')
  async format(@Req() request: FastifyRequest): Promise<void> {
    console.time('3-bulk-format');

    const files = request.files();

    for await (const file of files) {
      const buffer = await file.toBuffer();

      const sharpInstance = sharp(buffer);

      const format = 'jpeg';

      await sharpInstance
        .toFormat(format)
        .toFile(`${path}/${Date.now()}.${format}`);
    }

    console.timeEnd('3-bulk-format'); // 3: 30.82
  }

  @Post('4-upload-single')
  async uploadSingle(@Req() request: FastifyRequest): Promise<string> {
    console.time('4-upload-single');

    const file = await request.file();

    const url = await this.appService.uploadSingle(file!);

    console.timeEnd('4-upload-single'); // 833ms

    return url;
  }

  @Post('4-upload-bulk')
  async uploadBulk(@Req() request: FastifyRequest): Promise<string[]> {
    console.time('4-upload-bulk');

    const result = await this.appService.uploadBulk(request.files());

    console.timeEnd('4-upload-bulk'); // 1833ms

    return result;
  }

  @Post('5-concurrency')
  async uploadConcurrency(@Req() request: FastifyRequest) {
    console.time('5-concurrency');

    const result = await this.appService.uploadConcurrency(request.files());

    console.timeEnd('5-concurrency'); // 10 -> 989ms

    return result;
  }
}
