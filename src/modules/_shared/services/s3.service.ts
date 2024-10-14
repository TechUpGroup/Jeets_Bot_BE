import { Injectable } from "@nestjs/common";
import config from "common/config";
import { S3 } from "aws-sdk";

@Injectable()
export class S3Service {
  private readonly s3 = new S3({
    accessKeyId: config.aws.access_key_id,
    secretAccessKey: config.aws.secret_access_key,
    region: config.aws.region_name,
  });
  private readonly bucketName = config.aws.s3_bucket;
  private readonly s3Path = config.aws.s3_path;
  private pulicUrl = `https://${config.aws.domain}/`;

  async uploadImageTele(fileName: string, fileBuffer: Buffer, contentType: string) {
    try {
      const key = this.s3Path.replace("tokens", "avatar") + "/" + fileName + ".jpg";
      const params = {
        ACL: "public-read",
        Body: fileBuffer,
        Bucket: this.bucketName,
        ContentType: contentType || 'application/octet-stream',
        Key: key,
      };
      const res = await this.s3.upload(params).promise();
      return res.Location;
    } catch (e) {
      throw e;
    }
  }

  async uploadImage(fileName: string, file: Express.Multer.File) {
    try {
      const key = this.s3Path + "/" + fileName + "." + file.mimetype.split("/")[1];
      const params = {
        ACL: "public-read",
        Body: file.buffer,
        Bucket: this.bucketName,
        ContentType: file.mimetype,
        Key: key,
      };
      const res = await this.s3.upload(params).promise();
      return res.Location;
    } catch (e) {
      throw e;
    }
  }

  private async uploadJson(data: any) {
    try {
      const key = this.s3Path + "/" + data.fileName;
      const params = {
        ACL: "public-read",
        Body: Buffer.from(JSON.stringify(data.metadata)),
        Bucket: this.bucketName,
        Metadata: {
          "Content-Type": "application/json",
        },
        ContentType: "application/json",
        Key: key,
      };
      await this.s3.putObject(params).promise();
      return this.pulicUrl + key;
    } catch (e) {
      throw e;
    }
  }

  public async uploadMetadatas(fileName: string, name: string, symbol: string, description: string, file: Express.Multer.File): Promise<any> {
    const imageUrl = await this.uploadImage(fileName, file);
    const param = {
      fileName,
      metadata: {
        name: name,
        image: imageUrl,
        symbol: symbol,
        description: description,
      }
    };
    const metadataUrl = await this.uploadJson(param);

    return { imageUrl, metadataUrl };
  }
}
