"""
Authentication module with JWT token management
"""

import jwt
import os
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify

SECRET_KEY = os.environ.get('JWT_SECRET_KEY', os.urandom(32).hex())
TOKEN_EXPIRATION_HOURS = 24


def generate_token(username):
    """Generate JWT token for authenticated user"""
    payload = {
        'username': username,
        'exp': datetime.utcnow() + timedelta(hours=TOKEN_EXPIRATION_HOURS),
        'iat': datetime.utcnow()
    }
    
    token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')
    return token


def verify_token(token):
    """Verify JWT token validity"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def token_required(f):
    """Decorator to protect endpoints with JWT authentication"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Get token from header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(' ')[1]  # Bearer <token>
            except IndexError:
                return jsonify({'error': 'Invalid token format'}), 401
        
        if not token:
            return jsonify({'error': 'Missing authentication token'}), 401
        
        # Verify token
        payload = verify_token(token)
        if not payload:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Add user info to request context
        request.user = payload['username']
        
        return f(*args, **kwargs)
    
    return decorated


def check_ip_whitelist(ip_address):
    """Check if IP address is whitelisted"""
    whitelist = os.environ.get('IP_WHITELIST', '').split(',')
    
    if not whitelist or whitelist == ['']:
        return True  # No whitelist configured
    
    return ip_address in whitelist
