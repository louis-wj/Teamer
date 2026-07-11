import os, sys, traceback
from dotenv import load_dotenv
load_dotenv()

from flask import Flask, jsonify, request as flask_req
from flask_cors import CORS
from extensions import socketio

app = Flask(__name__)
app.url_map.strict_slashes = False
app.config['SECRET_KEY'] = os.getenv('JWT_ACCESS_SECRET', 'dev-secret')

# ── CORS — allow everything for dev ──────────────────────────────────────────
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=False)
socketio.init_app(app, cors_allowed_origins='*', async_mode='eventlet')

# ── Global error handlers — log full tracebacks ─────────────────────────────
@app.before_request
def log_request():
    print(f'[REQ] {flask_req.method} {flask_req.path}', flush=True)

@app.after_request
def log_response(response):
    print(f'[RES] {flask_req.method} {flask_req.path} → {response.status_code}', flush=True)
    return response

@app.errorhandler(Exception)
def handle_exception(e):
    traceback.print_exc()
    return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@app.errorhandler(404)
def handle_404(e):
    return jsonify({'error': f'Not found: {flask_req.path}'}), 404

@app.errorhandler(405)
def handle_405(e):
    return jsonify({'error': f'Method {flask_req.method} not allowed on {flask_req.path}'}), 405

# ── Blueprints ───────────────────────────────────────────────────────────────
from routes_auth import bp as auth_bp
from routes_servers import bp as servers_bp
from routes_channels import bp as channels_bp
from routes_invites import bp as invites_bp
from routes_roles import bp as roles_bp
from routes_dms import bp as dms_bp
from routes_friends import bp as friends_bp
from routes_uploads import bp as uploads_bp
from routes_search import bp as search_bp

app.register_blueprint(auth_bp)
app.register_blueprint(servers_bp)
app.register_blueprint(channels_bp)
app.register_blueprint(invites_bp)
app.register_blueprint(roles_bp)
app.register_blueprint(dms_bp)
app.register_blueprint(friends_bp)
app.register_blueprint(uploads_bp)
app.register_blueprint(search_bp)

from socket_handlers import register_handlers
register_handlers()

@app.route('/api/health')
def health():
    return jsonify({'status': 'ok', 'app': 'TEAMER', 'developer': 'REAPXR'})

# Print all registered routes on startup
print('\n✅ JSON database ready (data/ directory)')
print('📋 Registered routes:')
for rule in sorted(app.url_map.iter_rules(), key=lambda r: r.rule):
    if rule.rule.startswith('/api'):
        methods = ','.join(sorted(rule.methods - {'OPTIONS', 'HEAD'}))
        print(f'   {methods:8s} {rule.rule}')
print(flush=True)

if __name__ == '__main__':
    port = int(os.getenv('PORT', 3001))
    print(f'\n🚀 TEAMER server running on port {port}', flush=True)
    socketio.run(app, host='0.0.0.0', port=port, log_output=True)
