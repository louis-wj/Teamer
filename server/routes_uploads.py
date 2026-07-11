import os, uuid
from flask import Blueprint, request, jsonify, g, send_from_directory
from utils import check_auth

bp = Blueprint('uploads', __name__, url_prefix='/api/uploads')

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'uploads')
MAX_SIZE = 8 * 1024 * 1024  # 8MB
ALLOWED_EXT = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'mp4', 'webm', 'pdf', 'txt'}


def _ext(filename):
    return filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''


@bp.route('', methods=['POST'])
def upload_file():
    from utils import check_auth as _ca
    result = _ca()
    if result: return result

    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    f = request.files['file']
    if not f.filename:
        return jsonify({'error': 'No file selected'}), 400

    ext = _ext(f.filename)
    if ext not in ALLOWED_EXT:
        return jsonify({'error': f'File type .{ext} not allowed'}), 400

    # Read and check size
    data = f.read()
    if len(data) > MAX_SIZE:
        return jsonify({'error': 'File too large (max 8MB)'}), 400

    user_dir = os.path.join(DATA_DIR, g.user_id)
    os.makedirs(user_dir, exist_ok=True)

    filename = f'{uuid.uuid4().hex[:12]}.{ext}'
    filepath = os.path.join(user_dir, filename)
    with open(filepath, 'wb') as out:
        out.write(data)

    base_url = request.host_url.rstrip('/')
    url = f'{base_url}/api/uploads/{g.user_id}/{filename}'
    return jsonify({'url': url, 'filename': filename}), 201


@bp.route('/<user_id>/<filename>')
def serve_file(user_id, filename):
    # Public — files are unguessable (UUID filenames)
    user_dir = os.path.join(DATA_DIR, user_id)
    if not os.path.exists(os.path.join(user_dir, filename)):
        return jsonify({'error': 'File not found'}), 404
    return send_from_directory(user_dir, filename)
