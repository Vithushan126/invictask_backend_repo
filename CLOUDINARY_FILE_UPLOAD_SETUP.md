# Cloudinary File Upload Module - Complete Setup

## 🎉 Installation Complete!

Your NestJS application now has a fully functional file upload module integrated with Cloudinary. Here's what has been set up:

## 📁 File Structure Created

```
src/
├── module/
│   └── file-upload/
│       ├── config/
│       │   └── cloudinary.config.ts          # Cloudinary configuration
│       ├── controllers/
│       │   └── file-upload.controller.ts     # Main upload endpoints
│       ├── dto/
│       │   └── file-upload.dto.ts            # Data transfer objects
│       ├── services/
│       │   ├── file-upload.service.ts        # Core upload logic
│       │   └── file-upload.service.spec.ts   # Unit tests
│       ├── examples/
│       │   └── user-profile.controller.ts    # Usage examples
│       ├── file-upload.module.ts             # Module definition
│       ├── index.ts                          # Public API exports
│       └── README.md                         # Detailed documentation
├── app.module.ts                             # Updated with FileUploadModule
└── main.ts
.env                                          # Environment variables
```

## 🚀 Quick Start

### 1. Start the Application
```bash
npm run start:dev
```

### 2. Test File Upload
Use any of these endpoints:

**Upload Single File:**
```bash
curl -X POST \
  http://localhost:3000/file-upload/single \
  -F "file=@/path/to/your/file.jpg"
```

**Upload Image with Transformations:**
```bash
curl -X POST \
  "http://localhost:3000/file-upload/image?width=300&height=300&quality=auto" \
  -F "image=@/path/to/image.jpg"
```

## 🔧 Available Endpoints

| Method | Endpoint | Purpose | File Field |
|--------|----------|---------|------------|
| POST | `/file-upload/single` | Upload any file | `file` |
| POST | `/file-upload/multiple` | Upload multiple files | `files` |
| POST | `/file-upload/image` | Upload image with transformations | `image` |
| POST | `/file-upload/video` | Upload video files | `video` |
| POST | `/file-upload/document` | Upload documents (PDF, DOC) | `document` |
| DELETE | `/file-upload/:publicId` | Delete uploaded file | - |

## 🎨 Features Included

✅ **File Type Validation**
- Images: JPEG, PNG, GIF, WebP
- Videos: MP4, AVI, MOV, WMV, FLV
- Documents: PDF, DOC, DOCX

✅ **File Size Validation**
- Maximum file size: 10MB
- Configurable limits

✅ **Image Transformations**
- Resize (width, height)
- Quality adjustment
- Format conversion
- Crop modes

✅ **Organized Storage**
- Folder-based organization
- Custom naming conventions
- Public ID management

✅ **Error Handling**
- Comprehensive validation
- Detailed error messages
- Graceful failure handling

✅ **Multiple Upload Support**
- Batch file uploads
- Individual file status tracking
- Partial success handling

## 🔐 Environment Configuration

Your `.env` file is configured with:
```env
CLOUDINARY_CLOUD_NAME=dlbpq0azo
CLOUDINARY_API_KEY=991141648184729
CLOUDINARY_API_SECRET=_ezijCF5poUPIkL8PLJbNmWw6Tk
PORT=3000
```

## 💡 Usage in Your Code

### Inject the Service
```typescript
import { FileUploadService } from './module/file-upload';

@Injectable()
export class MyService {
  constructor(private readonly fileUploadService: FileUploadService) {}

  async uploadUserAvatar(file: Express.Multer.File) {
    return this.fileUploadService.uploadSingleFile(
      {
        fieldname: file.fieldname,
        originalname: file.originalname,
        encoding: file.encoding,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer,
      },
      'avatars',
      { width: 150, height: 150, crop: 'fill' }
    );
  }
}
```

### Frontend Integration
```javascript
// JavaScript/Fetch
const formData = new FormData();
formData.append('file', fileInput.files[0]);

fetch('/file-upload/single?folder=uploads', {
  method: 'POST',
  body: formData
})
.then(response => response.json())
.then(data => console.log(data));
```

## 🧪 Testing

Run the included tests:
```bash
npm run test
```

The test file covers:
- File upload validation
- Error handling
- File deletion
- Service methods

## 📖 Documentation

Detailed documentation is available in:
- `src/module/file-upload/README.md` - Complete API documentation
- `src/module/file-upload/examples/` - Usage examples

## 🔄 Next Steps

1. **Customize File Limits**: Modify validation rules in `file-upload.service.ts`
2. **Add More Transformations**: Extend image processing options
3. **Database Integration**: Store file metadata in your database
4. **Authentication**: Add guards to protect upload endpoints
5. **Rate Limiting**: Implement upload rate limiting
6. **Progress Tracking**: Add upload progress indicators

## 🛠️ Customization Examples

### Change File Size Limit
```typescript
// In file-upload.service.ts
private readonly maxFileSize = 20 * 1024 * 1024; // 20MB
```

### Add New File Types
```typescript
// In file-upload.service.ts
private readonly allowedAudioTypes = ['audio/mp3', 'audio/wav'];
```

### Custom Transformations
```typescript
// Example: Create thumbnails
const thumbnail = await this.fileUploadService.uploadSingleFile(
  file,
  'thumbnails',
  {
    width: 150,
    height: 150,
    crop: 'thumb',
    gravity: 'face',
    quality: 'auto:good'
  }
);
```

## 🎯 Production Considerations

1. **Environment Variables**: Use proper environment management
2. **Error Logging**: Implement comprehensive logging
3. **Monitoring**: Add upload metrics and monitoring
4. **Backup**: Consider backup strategies for uploaded files
5. **CDN**: Leverage Cloudinary's CDN for optimal performance

Your file upload module is now ready for production use! 🚀
