export class FileUploadDto {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export class CloudinaryUploadResponseDto {
  public_id: string;
  version: number;
  signature: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  created_at: string;
  tags: string[];
  bytes: number;
  type: string;
  etag: string;
  placeholder: boolean;
  url: string;
  secure_url: string;
  access_mode: string;
  original_filename: string;
}

export class FileUploadResponseDto {
  success: boolean;
  message: string;
  data?: {
    url: string;
    secure_url: string;
    public_id: string;
    format: string;
    resource_type: string;
    bytes: number;
    width?: number;
    height?: number;
    original_filename: string;
  };
  error?: string;
}

export class MultipleFileUploadResponseDto {
  success: boolean;
  message: string;
  data?: {
    uploaded: FileUploadResponseDto['data'][];
    failed: {
      filename: string;
      error: string;
    }[];
  };
  error?: string;
}
