"""
Preset API Routes

Provides endpoints for managing presets (categories and items).
"""
import logging
import re
from io import BytesIO
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename

from ..app import db
from ..models import PresetCategory, Preset
from ..utils.r2_utils import upload_file_to_r2, delete_file_from_r2

bp = Blueprint('preset', __name__)

ALLOWED_IMAGE_EXTENSIONS = {'jpg', 'jpeg', 'png', 'webp'}


def verify_admin_password(password):
    """Verify admin password from config."""
    return password == current_app.config.get('ADMIN_PASSWORD')


def allowed_file(filename):
    """Check if file extension is allowed."""
    if '.' not in filename:
        return False
    ext = filename.rsplit('.', 1)[1].lower()
    return ext in ALLOWED_IMAGE_EXTENSIONS


def get_content_type(filename):
    """Get MIME type for file."""
    ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
    types = {'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'webp': 'image/webp'}
    return types.get(ext, 'application/octet-stream')


def slugify(text):
    """Convert text to slug."""
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text)
    return text


# =============================================================================
# PUBLIC ENDPOINTS
# =============================================================================

@bp.route('/categories', methods=['GET'])
def get_categories():
    """Get all active preset categories."""
    categories = PresetCategory.query.filter_by(is_active=True)\
        .order_by(PresetCategory.sort_order, PresetCategory.name).all()
    return jsonify({'categories': [c.to_dict() for c in categories]}), 200


@bp.route('/list', methods=['GET'])
def get_presets():
    """Get all active presets, optionally filtered by category."""
    category_id = request.args.get('category_id', type=int)
    
    query = Preset.query.filter_by(is_active=True)
    if category_id:
        query = query.filter_by(category_id=category_id)
    
    presets = query.order_by(Preset.sort_order, Preset.name).all()
    return jsonify({'presets': [p.to_dict() for p in presets]}), 200


# =============================================================================
# ADMIN ENDPOINTS - CATEGORIES
# =============================================================================

@bp.route('/admin/categories', methods=['GET'])
def admin_get_categories():
    """Get all categories (including inactive) for admin."""
    password = request.headers.get('X-Admin-Password', '')
    if not verify_admin_password(password):
        return jsonify({'error': 'Unauthorized'}), 401
    
    categories = PresetCategory.query.order_by(
        PresetCategory.sort_order, PresetCategory.name
    ).all()
    return jsonify({'categories': [c.to_dict() for c in categories]}), 200


@bp.route('/admin/categories', methods=['POST'])
def admin_create_category():
    """Create a new preset category."""
    password = request.headers.get('X-Admin-Password', '')
    if not verify_admin_password(password):
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.get_json()
    name = data.get('name', '').strip()
    
    if not name:
        return jsonify({'error': 'Name is required'}), 400
    
    # Check if name already exists
    existing = PresetCategory.query.filter_by(name=name).first()
    if existing:
        return jsonify({'error': 'Category with this name already exists'}), 400
    
    slug = data.get('slug', '').strip() or slugify(name)
    
    # Check if slug already exists
    existing_slug = PresetCategory.query.filter_by(slug=slug).first()
    if existing_slug:
        return jsonify({'error': 'Category with this slug already exists'}), 400
    
    category = PresetCategory(
        name=name,
        slug=slug,
        description=data.get('description', '').strip() or None,
        sort_order=data.get('sort_order', 0),
        is_active=data.get('is_active', True)
    )
    
    db.session.add(category)
    db.session.commit()
    
    logging.info(f'Admin created preset category: {category.id} - {category.name}')
    return jsonify({'success': True, 'category': category.to_dict()}), 201


@bp.route('/admin/categories/<int:category_id>', methods=['PUT'])
def admin_update_category(category_id):
    """Update a preset category."""
    password = request.headers.get('X-Admin-Password', '')
    if not verify_admin_password(password):
        return jsonify({'error': 'Unauthorized'}), 401
    
    category = PresetCategory.query.get(category_id)
    if not category:
        return jsonify({'error': 'Category not found'}), 404
    
    data = request.get_json()
    
    if 'name' in data:
        name = data['name'].strip()
        if name and name != category.name:
            existing = PresetCategory.query.filter(
                PresetCategory.name == name,
                PresetCategory.id != category_id
            ).first()
            if existing:
                return jsonify({'error': 'Category with this name already exists'}), 400
            category.name = name
    
    if 'slug' in data:
        slug = data['slug'].strip()
        if slug and slug != category.slug:
            existing = PresetCategory.query.filter(
                PresetCategory.slug == slug,
                PresetCategory.id != category_id
            ).first()
            if existing:
                return jsonify({'error': 'Category with this slug already exists'}), 400
            category.slug = slug
    
    if 'description' in data:
        category.description = data['description'].strip() or None
    if 'sort_order' in data:
        category.sort_order = data['sort_order']
    if 'is_active' in data:
        category.is_active = data['is_active']
    
    db.session.commit()
    
    logging.info(f'Admin updated preset category: {category.id}')
    return jsonify({'success': True, 'category': category.to_dict()}), 200


@bp.route('/admin/categories/<int:category_id>', methods=['DELETE'])
def admin_delete_category(category_id):
    """Soft delete a preset category."""
    password = request.headers.get('X-Admin-Password', '')
    if not verify_admin_password(password):
        return jsonify({'error': 'Unauthorized'}), 401
    
    category = PresetCategory.query.get(category_id)
    if not category:
        return jsonify({'error': 'Category not found'}), 404
    
    # Check if category has active presets
    active_presets = category.presets.filter_by(is_active=True).count()
    if active_presets > 0:
        return jsonify({
            'error': f'Cannot delete category with {active_presets} active presets'
        }), 400
    
    # Soft delete
    category.is_active = False
    db.session.commit()
    
    logging.info(f'Admin soft-deleted preset category: {category.id}')
    return jsonify({'success': True}), 200


# =============================================================================
# ADMIN ENDPOINTS - PRESETS
# =============================================================================

@bp.route('/admin/presets', methods=['GET'])
def admin_get_presets():
    """Get all presets (including inactive) for admin."""
    password = request.headers.get('X-Admin-Password', '')
    if not verify_admin_password(password):
        return jsonify({'error': 'Unauthorized'}), 401
    
    category_id = request.args.get('category_id', type=int)
    
    query = Preset.query
    if category_id:
        query = query.filter_by(category_id=category_id)
    
    presets = query.order_by(Preset.sort_order, Preset.name).all()
    return jsonify({'presets': [p.to_dict() for p in presets]}), 200


@bp.route('/admin/presets', methods=['POST'])
def admin_create_preset():
    """Create a new preset with optional image upload."""
    password = request.headers.get('X-Admin-Password', '')
    if not verify_admin_password(password):
        return jsonify({'error': 'Unauthorized'}), 401
    
    # Get form data
    category_id = request.form.get('category_id', type=int)
    name = request.form.get('name', '').strip()
    prompt = request.form.get('prompt', '').strip()
    sort_order = request.form.get('sort_order', 0, type=int)
    is_active = request.form.get('is_active', 'true').lower() == 'true'
    
    if not category_id:
        return jsonify({'error': 'category_id is required'}), 400
    if not name:
        return jsonify({'error': 'name is required'}), 400
    if not prompt:
        return jsonify({'error': 'prompt is required'}), 400
    
    # Check category exists
    category = PresetCategory.query.get(category_id)
    if not category:
        return jsonify({'error': 'Category not found'}), 404
    
    # Create preset
    preset = Preset(
        category_id=category_id,
        name=name,
        prompt=prompt,
        sort_order=sort_order,
        is_active=is_active
    )
    
    db.session.add(preset)
    db.session.flush()  # Get preset ID
    
    # Handle image upload
    if 'image' in request.files:
        file = request.files['image']
        if file and file.filename and allowed_file(file.filename):
            ext = file.filename.rsplit('.', 1)[1].lower()
            r2_key = f"presets/{preset.id}.{ext}"
            content_type = get_content_type(file.filename)
            file_bytes = BytesIO(file.read())
            
            if upload_file_to_r2(
                file_obj=file_bytes,
                object_key=r2_key,
                content_type=content_type,
                acl='public-read'
            ):
                preset.r2_object_key = r2_key
                logging.info(f'Uploaded preset image: {r2_key}')
            else:
                logging.error(f'Failed to upload preset image for preset {preset.id}')
    
    db.session.commit()
    
    logging.info(f'Admin created preset: {preset.id} - {preset.name}')
    return jsonify({'success': True, 'preset': preset.to_dict()}), 201


@bp.route('/admin/presets/<int:preset_id>', methods=['PUT'])
def admin_update_preset(preset_id):
    """Update a preset."""
    password = request.headers.get('X-Admin-Password', '')
    if not verify_admin_password(password):
        return jsonify({'error': 'Unauthorized'}), 401
    
    preset = Preset.query.get(preset_id)
    if not preset:
        return jsonify({'error': 'Preset not found'}), 404
    
    # Handle both JSON and FormData
    if request.content_type and 'multipart/form-data' in request.content_type:
        data = request.form
    else:
        data = request.get_json() or {}
    
    if 'category_id' in data:
        category_id = int(data['category_id'])
        category = PresetCategory.query.get(category_id)
        if not category:
            return jsonify({'error': 'Category not found'}), 404
        preset.category_id = category_id
    
    if 'name' in data:
        preset.name = data['name'].strip()
    if 'prompt' in data:
        preset.prompt = data['prompt'].strip()
    if 'sort_order' in data:
        preset.sort_order = int(data['sort_order'])
    if 'is_active' in data:
        is_active = data['is_active']
        if isinstance(is_active, str):
            is_active = is_active.lower() == 'true'
        preset.is_active = is_active
    
    # Handle image upload
    if 'image' in request.files:
        file = request.files['image']
        if file and file.filename and allowed_file(file.filename):
            # Delete old image if exists
            if preset.r2_object_key:
                delete_file_from_r2(preset.r2_object_key)
            
            ext = file.filename.rsplit('.', 1)[1].lower()
            r2_key = f"presets/{preset.id}.{ext}"
            content_type = get_content_type(file.filename)
            file_bytes = BytesIO(file.read())
            
            if upload_file_to_r2(
                file_obj=file_bytes,
                object_key=r2_key,
                content_type=content_type,
                acl='public-read'
            ):
                preset.r2_object_key = r2_key
                logging.info(f'Updated preset image: {r2_key}')
    
    db.session.commit()
    
    logging.info(f'Admin updated preset: {preset.id}')
    return jsonify({'success': True, 'preset': preset.to_dict()}), 200


@bp.route('/admin/presets/<int:preset_id>', methods=['DELETE'])
def admin_delete_preset(preset_id):
    """Delete a preset and its image."""
    password = request.headers.get('X-Admin-Password', '')
    if not verify_admin_password(password):
        return jsonify({'error': 'Unauthorized'}), 401
    
    preset = Preset.query.get(preset_id)
    if not preset:
        return jsonify({'error': 'Preset not found'}), 404
    
    # Delete image from R2
    if preset.r2_object_key:
        delete_file_from_r2(preset.r2_object_key)
        logging.info(f'Deleted preset image: {preset.r2_object_key}')
    
    db.session.delete(preset)
    db.session.commit()
    
    logging.info(f'Admin deleted preset: {preset_id}')
    return jsonify({'success': True}), 200
