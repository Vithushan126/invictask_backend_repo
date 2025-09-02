import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { FileUploadService } from './file-upload.service';
import { CloudinaryConfig } from '../config/cloudinary.config';

// Mock Cloudinary
const mockCloudinary = {
  uploader: {
    upload_stream: jest.fn(),
    destroy: jest.fn(),
  },
};

const mockCloudinaryConfig = {
  getCloudinary: jest.fn(() => mockCloudinary),
};

describe('FileUploadService', () => {
  let service: FileUploadService;
  let cloudinaryConfig: CloudinaryConfig;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileUploadService,
        {
          provide: CloudinaryConfig,
          useValue: mockCloudinaryConfig,
        },
      ],
    }).compile();

    service = module.get<FileUploadService>(FileUploadService);
    cloudinaryConfig = module.get<CloudinaryConfig>(CloudinaryConfig);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadSingleFile', () => {
    const mockFile = {
      fieldname: 'file',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 1024,
      buffer: Buffer.from('test'),
    };

    it('should upload a file successfully', async () => {
      const mockResult = {
        url: 'http://example.com/test.jpg',
        secure_url: 'https://example.com/test.jpg',
        public_id: 'test',
        format: 'jpg',
        resource_type: 'image',
        bytes: 1024,
        width: 100,
        height: 100,
      };

      mockCloudinary.uploader.upload_stream.mockImplementation(
        (options, callback) => {
          const stream = {
            end: jest.fn((buffer) => {
              callback(null, mockResult);
            }),
          };
          return stream;
        },
      );

      const result = await service.uploadSingleFile(mockFile);

      expect(result.success).toBe(true);
      expect(result.data?.url).toBe(mockResult.url);
      expect(result.data?.secure_url).toBe(mockResult.secure_url);
    });

    it('should throw BadRequestException for invalid file type', async () => {
      const invalidFile = {
        ...mockFile,
        mimetype: 'application/exe',
      };

      await expect(service.uploadSingleFile(invalidFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for file size exceeding limit', async () => {
      const largeFile = {
        ...mockFile,
        size: 11 * 1024 * 1024, // 11MB
      };

      await expect(service.uploadSingleFile(largeFile)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('deleteFile', () => {
    it('should delete a file successfully', async () => {
      mockCloudinary.uploader.destroy.mockResolvedValue({ result: 'ok' });

      const result = await service.deleteFile('test-public-id');

      expect(result.success).toBe(true);
      expect(result.message).toBe('File deleted successfully');
    });

    it('should handle deletion failure', async () => {
      mockCloudinary.uploader.destroy.mockResolvedValue({
        result: 'not found',
      });

      const result = await service.deleteFile('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to delete file');
    });
  });

  describe('getFileInfo', () => {
    it('should return file information', () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('test'),
      };

      const fileInfo = service.getFileInfo(mockFile);

      expect(fileInfo.originalname).toBe('test.jpg');
      expect(fileInfo.mimetype).toBe('image/jpeg');
      expect(fileInfo.size).toBe(1024);
      expect(fileInfo.resourceType).toBe('image');
    });
  });
});
