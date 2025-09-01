# File Upload Module with Cloudinary Integration

This module provides comprehensive file upload functionality using Cloudinary as the cloud storage service.

## Features

- Single file upload
- Multiple file upload (up to 10 files)
- Image upload with transformations (resize, quality adjustment)
- Video upload
- Document upload (PDF, Word documents)
- File deletion
- File type validation
- File size validation (max 10MB)
- Automatic resource type detection

## API Endpoints

### 1. Upload Single File
**POST** `/file-upload/single`

**Form Data:**
- `file`: The file to upload
- `folder` (query param, optional): Cloudinary folder name
- `transformation` (body, optional): JSON string for transformations

**Example:**
```bash
curl -X POST \
  http://localhost:3000/file-upload/single?folder=my-uploads \
  -F "file=@/path/to/your/file.jpg"
```

### 2. Upload Multiple Files
**POST** `/file-upload/multiple`

**Form Data:**
- `files`: Multiple files to upload (max 10)
- `folder` (query param, optional): Cloudinary folder name
- `transformation` (body, optional): JSON string for transformations

**Example:**
```bash
curl -X POST \
  http://localhost:3000/file-upload/multiple?folder=batch-uploads \
  -F "files=@/path/to/file1.jpg" \
  -F "files=@/path/to/file2.png"
```

### 3. Upload Image with Transformations
**POST** `/file-upload/image`

**Form Data:**
- `image`: Image file to upload
- `folder` (query param, optional): Cloudinary folder name
- `width` (query param, optional): Resize width
- `height` (query param, optional): Resize height
- `quality` (query param, optional): Image quality (auto, best, good, eco, low)

**Example:**
```bash
curl -X POST \
  "http://localhost:3000/file-upload/image?folder=thumbnails&width=300&height=300&quality=auto" \
  -F "image=@/path/to/image.jpg"
```

### 4. Upload Video
**POST** `/file-upload/video`

**Form Data:**
- `video`: Video file to upload
- `folder` (query param, optional): Cloudinary folder name

**Example:**
```bash
curl -X POST \
  http://localhost:3000/file-upload/video?folder=videos \
  -F "video=@/path/to/video.mp4"
```

### 5. Upload Document
**POST** `/file-upload/document`

**Form Data:**
- `document`: Document file to upload (PDF, DOC, DOCX)
- `folder` (query param, optional): Cloudinary folder name

**Example:**
```bash
curl -X POST \
  http://localhost:3000/file-upload/document?folder=documents \
  -F "document=@/path/to/document.pdf"
```

### 6. Delete File
**DELETE** `/file-upload/:publicId`

**Parameters:**
- `publicId`: The Cloudinary public ID of the file to delete (URL encoded)

**Example:**
```bash
curl -X DELETE \
  http://localhost:3000/file-upload/uploads%2Fmy-file
```

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "url": "http://res.cloudinary.com/...",
    "secure_url": "https://res.cloudinary.com/...",
    "public_id": "uploads/filename",
    "format": "jpg",
    "resource_type": "image",
    "bytes": 12345,
    "width": 800,
    "height": 600,
    "original_filename": "original-name.jpg"
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Failed to upload file",
  "error": "Error details"
}
```

## Supported File Types

### Images
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)

### Videos
- MP4 (.mp4)
- AVI (.avi)
- MOV (.mov)
- WMV (.wmv)
- FLV (.flv)

### Documents
- PDF (.pdf)
- Word Document (.doc, .docx)

## Configuration

The module uses environment variables for Cloudinary configuration:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## File Size Limits

- Maximum file size: 10MB
- Maximum files per request: 10 (for multiple upload)

## Usage in Other Services

You can inject the `FileUploadService` into other services:

```typescript
import { Injectable } from '@nestjs/common';
import { FileUploadService } from './module/file-upload/services/file-upload.service';

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

## Frontend Integration Examples

### HTML Form
```html
<form action="/file-upload/single" method="post" enctype="multipart/form-data">
  <input type="file" name="file" accept="image/*">
  <button type="submit">Upload</button>
</form>
```

### JavaScript/Fetch
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

fetch('/file-upload/single?folder=uploads', {
  method: 'POST',
  body: formData
})
.then(response => response.json())
.then(data => console.log(data));
```

### React Example
```jsx
const handleFileUpload = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await fetch('/file-upload/single', {
      method: 'POST',
      body: formData
    });
    const result = await response.json();
    console.log('Upload successful:', result);
  } catch (error) {
    console.error('Upload failed:', error);
  }
};
```
