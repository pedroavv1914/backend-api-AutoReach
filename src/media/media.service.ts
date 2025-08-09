import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class MediaService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async uploadToCloudinary(file: Express.Multer.File) {
    if (!file) throw new InternalServerErrorException('Arquivo não enviado');

    try {
      const res = await new Promise<any>((resolve, reject) => {
        const upload = cloudinary.uploader.upload_stream({ resource_type: 'auto' }, (err, result) => {
          if (err) return reject(err);
          resolve(result);
        });
        upload.end(file.buffer);
      });
      return res;
    } catch (err: any) {
      throw new InternalServerErrorException(err?.message || 'Falha no upload');
    }
  }
}
