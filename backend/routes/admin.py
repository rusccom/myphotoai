"""
Admin Panel API Routes

Provides endpoints for managing landing page media files stored in Cloudflare R2.
"""
import logging
from io import BytesIO
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from botocore.exceptions import ClientError

from ..utils.r2_utils import get_r2_client, upload_file_to_r2, delete_file_from_r2

bp = Blueprint('admin', __name__)

# Allowed file extensions
ALLOWED_IMAGE_EXTENSIONS = {'jpg', 'jpeg', 'png', 'webp'}
ALLOWED_VIDEO_EXTENSIONS = {'mp4', 'webm'}

# Media sections configuration with requirements info
MEDIA_SECTIONS = {
    'model-generation': {
        'path': 'model-generation',
        'type': 'image',
        'aspectRatio': '3:4',
        'recommendedSize': '600×800 or 900×1200 px',
        'description': 'Main = original photo, Grid = AI generated photos',
        'structure': {
            'main': ['main.jpg'],
            'grid': [f'image-{i}.jpg' for i in range(1, 13)]
        }
    },
    'photo-editing': {
        'path': 'photo-editing',
        'type': 'image',
        'aspectRatio': '3:4',
        'recommendedSize': '600×800 or 900×1200 px',
        'description': 'Main = original photo, Grid = edited versions',
        'structure': {
            'main': ['main.jpg'],
            'grid': [f'image-{i}.jpg' for i in range(1, 13)]
        }
    },
    'clothing-try-on': {
        'path': 'clothing-try-on',
        'type': 'image',
        'aspectRatio': '3:4',
        'recommendedSize': '600×800 or 900×1200 px',
        'description': '1=Person, 2=Clothing, 3=Result',
        'blocks': 4,
        'files_per_block': 3
    },
    'live-photo': {
        'path': 'live-photo',
        'type': 'video',
        'aspectRatio': '9:16',
        'recommendedSize': '720×1280 or 1080×1920 px',
        'description': 'Vertical videos (Stories format)',
        'structure': {
            'videos': [f'{i}.mp4' for i in range(1, 6)]
        }
    },
    'presets': {
        'path': 'presets',
        'type': 'image',
        'aspectRatio': '3:4',
        'recommendedSize': '600×800 or 900×1200 px',
        'description': 'Preset examples for each category',
        'categories': ['Portraits', 'Fashion', 'Professional', 'Creative'],
        'files_per_category': 5
    }
}


def get_r2_landing_key(section, subfolder, filename):
    """Build R2 object key for landing media."""
    if subfolder:
        return f"landing/{section}/{subfolder}/{filename}"
    return f"landing/{section}/{filename}"


def get_r2_base_url():
    """Get base URL for R2 landing media."""
    custom_domain = current_app.config.get('R2_CUSTOM_DOMAIN')
    if custom_domain:
        return f"https://{custom_domain}"
    return None


def check_r2_object_exists(object_key):
    """Check if object exists in R2."""
    try:
        client = get_r2_client()
        bucket = current_app.config['R2_BUCKET_NAME']
        client.head_object(Bucket=bucket, Key=object_key)
        return True
    except ClientError:
        return False
    except Exception as e:
        logging.warning(f"Error checking R2 object {object_key}: {e}")
        return False


def allowed_file(filename, file_type):
    """Check if file extension is allowed."""
    if '.' not in filename:
        return False
    ext = filename.rsplit('.', 1)[1].lower()
    if file_type == 'image':
        return ext in ALLOWED_IMAGE_EXTENSIONS
    elif file_type == 'video':
        return ext in ALLOWED_VIDEO_EXTENSIONS
    return False


def get_content_type(filename, file_type):
    """Get MIME type for file."""
    ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
    types = {
        'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
        'png': 'image/png', 'webp': 'image/webp',
        'mp4': 'video/mp4', 'webm': 'video/webm'
    }
    return types.get(ext, 'application/octet-stream')


def verify_admin_password(password):
    """Verify admin password from config."""
    return password == current_app.config.get('ADMIN_PASSWORD')


@bp.route('/verify', methods=['POST'])
def verify_password():
    """Verify admin password and return success status."""
    data = request.get_json()
    password = data.get('password', '')
    
    if verify_admin_password(password):
        return jsonify({'success': True}), 200
    return jsonify({'success': False, 'error': 'Invalid password'}), 401


@bp.route('/r2-config', methods=['GET'])
def get_r2_config():
    """Return R2 base URL for frontend."""
    password = request.headers.get('X-Admin-Password', '')
    if not verify_admin_password(password):
        return jsonify({'error': 'Unauthorized'}), 401
    
    base_url = get_r2_base_url()
    return jsonify({
        'base_url': f"{base_url}/landing" if base_url else None,
        'configured': base_url is not None
    }), 200


@bp.route('/media/<section>', methods=['GET'])
def get_section_media(section):
    """Get list of media files for a section from R2."""
    password = request.headers.get('X-Admin-Password', '')
    if not verify_admin_password(password):
        return jsonify({'error': 'Unauthorized'}), 401
    
    if section not in MEDIA_SECTIONS:
        return jsonify({'error': 'Invalid section'}), 400
    
    config = MEDIA_SECTIONS[section]
    base_url = get_r2_base_url()
    
    result = {
        'section': section,
        'info': {
            'aspectRatio': config.get('aspectRatio', ''),
            'recommendedSize': config.get('recommendedSize', ''),
            'formats': 'MP4, WebM' if config['type'] == 'video' else 'JPG, PNG, WebP',
            'description': config.get('description', '')
        },
        'files': {}
    }
    
    if section == 'presets':
        result['files'] = get_presets_files(config, base_url)
    elif section == 'clothing-try-on':
        result['files'] = get_tryon_files(config, base_url)
    else:
        result['files'] = get_standard_files(section, config, base_url)
    
    return jsonify(result), 200


def get_presets_files(config, base_url):
    """Get files for presets section from R2."""
    files = {}
    for category in config['categories']:
        category_files = []
        for i in range(1, config['files_per_category'] + 1):
            filename = f'{i}.jpg'
            r2_key = get_r2_landing_key('presets', category, filename)
            exists = check_r2_object_exists(r2_key)
            category_files.append({
                'name': filename,
                'exists': exists,
                'url': f"{base_url}/landing/presets/{category}/{filename}" if base_url else '',
                'r2_key': r2_key
            })
        files[category] = category_files
    return files


def get_tryon_files(config, base_url):
    """Get files for clothing-try-on section from R2."""
    files = {}
    labels = ['Before (Person)', 'Clothing', 'Result']
    for block in range(1, config['blocks'] + 1):
        block_files = []
        for i in range(1, config['files_per_block'] + 1):
            filename = f'{i}.jpg'
            r2_key = get_r2_landing_key('clothing-try-on', str(block), filename)
            exists = check_r2_object_exists(r2_key)
            block_files.append({
                'name': filename,
                'label': labels[i - 1],
                'exists': exists,
                'url': f"{base_url}/landing/clothing-try-on/{block}/{filename}" if base_url else '',
                'r2_key': r2_key
            })
        files[f'Block {block}'] = block_files
    return files


def get_standard_files(section, config, base_url):
    """Get files for standard sections from R2."""
    files = {}
    for subfolder, filenames in config['structure'].items():
        folder_files = []
        for filename in filenames:
            r2_key = get_r2_landing_key(section, subfolder, filename)
            exists = check_r2_object_exists(r2_key)
            folder_files.append({
                'name': filename,
                'exists': exists,
                'url': f"{base_url}/landing/{section}/{subfolder}/{filename}" if base_url else '',
                'r2_key': r2_key
            })
        files[subfolder] = folder_files
    return files


@bp.route('/media/<section>/upload', methods=['POST'])
def upload_media(section):
    """Upload a media file to R2."""
    password = request.headers.get('X-Admin-Password', '')
    if not verify_admin_password(password):
        return jsonify({'error': 'Unauthorized'}), 401
    
    if section not in MEDIA_SECTIONS:
        return jsonify({'error': 'Invalid section'}), 400
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    target_name = request.form.get('target_name', '')
    subfolder = request.form.get('subfolder', '')
    category = request.form.get('category', '')
    
    if not file or not file.filename:
        return jsonify({'error': 'Empty file'}), 400
    
    config = MEDIA_SECTIONS[section]
    if not allowed_file(file.filename, config['type']):
        return jsonify({'error': 'File type not allowed'}), 400
    
    # Build R2 key
    filename = secure_filename(target_name) if target_name else secure_filename(file.filename)
    r2_key = build_r2_key(section, config, subfolder, category, filename)
    
    if not r2_key:
        return jsonify({'error': 'Invalid upload target'}), 400
    
    # Upload to R2
    content_type = get_content_type(filename, config['type'])
    file_bytes = BytesIO(file.read())
    
    if upload_file_to_r2(file_obj=file_bytes, object_key=r2_key, 
                         content_type=content_type, acl='public-read'):
        logging.info(f'Admin uploaded to R2: {r2_key}')
        base_url = get_r2_base_url()
        return jsonify({
            'success': True, 
            'filename': filename,
            'url': f"{base_url}/{r2_key}" if base_url else r2_key
        }), 200
    
    return jsonify({'error': 'Upload to R2 failed'}), 500


def build_r2_key(section, config, subfolder, category, filename):
    """Build R2 object key for upload."""
    if section == 'presets':
        if category in config['categories']:
            return get_r2_landing_key('presets', category, filename)
    elif section == 'clothing-try-on':
        if subfolder and subfolder.startswith('Block '):
            block_num = subfolder.replace('Block ', '')
            return get_r2_landing_key('clothing-try-on', block_num, filename)
    elif section == 'live-photo':
        return get_r2_landing_key('live-photo', 'videos', filename)
    elif 'structure' in config and subfolder in config['structure']:
        return get_r2_landing_key(section, subfolder, filename)
    return None


@bp.route('/media/<section>/<path:filepath>', methods=['DELETE'])
def delete_media(section, filepath):
    """Delete a media file from R2."""
    password = request.headers.get('X-Admin-Password', '')
    if not verify_admin_password(password):
        return jsonify({'error': 'Unauthorized'}), 401
    
    if section not in MEDIA_SECTIONS:
        return jsonify({'error': 'Invalid section'}), 400
    
    # Build R2 key from filepath
    r2_key = f"landing/{section}/{filepath}"
    
    if delete_file_from_r2(r2_key):
        logging.info(f'Admin deleted from R2: {r2_key}')
        return jsonify({'success': True}), 200
    
    return jsonify({'error': 'Delete failed or file not found'}), 404


@bp.route('/sections', methods=['GET'])
def get_sections():
    """Get list of available media sections with requirements."""
    password = request.headers.get('X-Admin-Password', '')
    if not verify_admin_password(password):
        return jsonify({'error': 'Unauthorized'}), 401
    
    sections = []
    for key, config in MEDIA_SECTIONS.items():
        sections.append({
            'id': key,
            'name': key.replace('-', ' ').title(),
            'type': config['type'],
            'aspectRatio': config.get('aspectRatio', ''),
            'recommendedSize': config.get('recommendedSize', ''),
            'description': config.get('description', '')
        })
    return jsonify({'sections': sections}), 200
