import os
import uuid
import boto3
from django.conf import settings
from django.utils.text import slugify

ALLOWED_EXTENSIONS = {
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'png', 'jpg', 'jpeg', 'zip', 'mp4', 'txt', 'csv'
}

MAX_FILE_SIZE_MB = int(os.environ.get('MAX_FILE_SIZE_MB', 100))
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

def validate_file_metadata(original_filename, file_size, content_type=None):
    """Validate filename extension and file size limit."""
    if not original_filename:
        return False, "Original filename is required."

    if '..' in original_filename or '/' in original_filename or '\\' in original_filename:
        return False, "Invalid filename path traversal detected."

    ext = original_filename.rsplit('.', 1)[-1].lower() if '.' in original_filename else ''
    if ext not in ALLOWED_EXTENSIONS:
        return False, f"File format '.{ext}' is not allowed. Supported formats: {', '.join(sorted(ALLOWED_EXTENSIONS)).upper()}"

    if file_size > MAX_FILE_SIZE_BYTES:
        return False, f"File size ({file_size / (1024*1024):.1f} MB) exceeds maximum allowed size limit of {MAX_FILE_SIZE_MB} MB."

    return True, "Valid"

def generate_canonical_s3_key(user, task, original_filename):
    """
    Generate canonical AWS S3 key grouped by user email/username folder:
    batches/{batchCode}/users/{userEmailFolder}/{taskSlug}/{uniqueFileId}-{originalFileName}
    
    Examples:
    batches/BATCH_12/users/Jayashree.Sankar@agilisium.com/assessment/8f32a9c1-report.pdf
    batches/BATCH_12/users/Monisha.Ramasamy@agilisium.com/tasks/a3b14c99-proof.docx
    """
    batch_code = getattr(user.batch, 'name', 'BATCH_12').replace(" ", "_").upper() if hasattr(user, 'batch') and user.batch else 'BATCH_12'
    
    # Use full user email (or clean email prefix) as S3 folder name for 100% human-readable bucket inspection
    if user.email and '@' in user.email:
        user_folder = user.email.strip().lower()
    else:
        user_folder = f"user_{user.id}"

    task_slug = slugify(task.title) or 'task'
    unique_file_id = uuid.uuid4().hex[:8]
    
    parts = original_filename.rsplit('.', 1)
    safe_name = slugify(parts[0]) or 'file'
    ext = parts[1].lower() if len(parts) > 1 else ''
    clean_filename = f"{safe_name}.{ext}" if ext else safe_name

    return f"batches/{batch_code}/users/{user_folder}/{task_slug}/{unique_file_id}-{clean_filename}"

def generate_s3_presigned_upload_url(s3_key, content_type='application/octet-stream', expires_in=900):
    """Generate AWS S3 presigned PUT URL for direct client file upload."""
    bucket_name = getattr(settings, 'AWS_STORAGE_BUCKET_NAME', 'agilisium-task-portal-evidence')
    region_name = getattr(settings, 'AWS_S3_REGION_NAME', 'eu-north-1')
    access_key = getattr(settings, 'AWS_ACCESS_KEY_ID', None)
    secret_key = getattr(settings, 'AWS_SECRET_ACCESS_KEY', None)

    if not bucket_name or not access_key or not secret_key:
        raise ValueError("AWS S3 bucket configuration or access credentials missing in settings.")

    s3_client = boto3.client(
        's3',
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name=region_name
    )

    params = {
        'Bucket': bucket_name,
        'Key': s3_key,
        'ContentType': content_type
    }

    presigned_url = s3_client.generate_presigned_url(
        'put_object',
        Params=params,
        ExpiresIn=expires_in
    )

    return {
        'upload_url': presigned_url,
        's3_key': s3_key,
        's3_bucket': bucket_name
    }
