# File Storage Setup

This project uses S3-compatible object storage for file uploads. The setup supports both local development (MinIO) and production cloud storage.

## Local Development (MinIO)

### Automatic Setup
✅ **Buckets are created automatically** - No manual setup required!

The application will automatically:
1. Start MinIO via Docker Compose
2. Create the configured bucket on first startup
3. Handle all bucket management

### Manual Setup (if needed)
If you need to manually manage MinIO:

1. **Access MinIO Console**: http://localhost:9001
2. **Login credentials**:
   - Username: `minioadmin`
   - Password: `minioadmin`
3. **Create bucket**: `event-scheduler-uploads` (if not auto-created)

### Configuration
Default local configuration in `.env`:
```
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_BUCKET=event-scheduler-uploads
S3_FORCE_PATH_STYLE=true
```

## Production Setup

### AWS S3
For production, you need to manually create the S3 bucket:

1. **Create S3 bucket** in AWS Console or via AWS CLI:
   ```bash
   aws s3 mb s3://your-production-bucket-name
   ```

2. **Configure environment variables**:
   ```
   S3_ENDPOINT=https://s3.amazonaws.com
   S3_REGION=us-east-1
   S3_ACCESS_KEY_ID=your-access-key
   S3_SECRET_ACCESS_KEY=your-secret-key
   S3_BUCKET=your-production-bucket-name
   S3_FORCE_PATH_STYLE=false
   ```

3. **Set bucket permissions** (CORS configuration):
   ```json
   {
     "CORSRules": [
       {
         "AllowedHeaders": ["*"],
         "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
         "AllowedOrigins": ["https://your-domain.com"],
         "ExposeHeaders": ["ETag"]
       }
     ]
   }
   ```

### Other S3-Compatible Services

#### Backblaze B2
1. Create bucket in Backblaze B2 console
2. Generate application key
3. Configure endpoints:
   ```
   S3_ENDPOINT=https://s3.us-west-000.backblazeb2.com
   S3_REGION=us-west-000
   S3_ACCESS_KEY_ID=your-key-id
   S3_SECRET_ACCESS_KEY=your-application-key
   S3_BUCKET=your-bucket-name
   S3_FORCE_PATH_STYLE=false
   ```

#### DigitalOcean Spaces
1. Create Space in DigitalOcean console
2. Generate API key
3. Configure endpoints:
   ```
   S3_ENDPOINT=https://nyc3.digitaloceanspaces.com
   S3_REGION=nyc3
   S3_ACCESS_KEY_ID=your-access-key
   S3_SECRET_ACCESS_KEY=your-secret-key
   S3_BUCKET=your-space-name
   S3_FORCE_PATH_STYLE=false
   ```

## File Upload Flow

1. **Client requests upload URL** - Server validates permissions and generates pre-signed URL
2. **Direct browser-to-S3 upload** - Client uploads file directly to S3
3. **Server confirms upload** - Client notifies server, creates database record
4. **Access control** - Downloads use signed URLs for security

## Bucket Policies & CORS

For production S3 buckets, ensure:
- **Private access** - Bucket should not be publicly readable
- **CORS configuration** - Allow uploads from your domain
- **Lifecycle policies** - Optional: auto-delete old files
- **Versioning** - Optional: enable for backup/recovery

## Monitoring & Costs

- **Local development**: Free (MinIO runs locally)
- **Production**: Monitor storage costs and transfer fees
- **File cleanup**: Implement policies to remove old/unused files

## Troubleshooting

### Common Issues:
- **"Bucket not found"**: Check bucket name and region in environment variables
- **"Access denied"**: Verify AWS credentials and bucket permissions
- **CORS errors**: Ensure CORS policy allows your domain
- **Upload timeouts**: Check network connectivity and file size limits

### Development:
- Check MinIO logs: `docker-compose logs minio`
- Access MinIO console: http://localhost:9001
- Reset MinIO data: `docker-compose down -v && docker-compose up`