"""
Database module for session management and agent data
Uses SQLite for simplicity (can be upgraded to PostgreSQL for production)
"""

import sqlite3
import json
from datetime import datetime
from typing import List, Dict, Optional


class Database:
    def __init__(self, db_path='ramp.db'):
        self.db_path = db_path
        self.init_database()
    
    def get_connection(self):
        """Get database connection"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def init_database(self):
        """Initialize database schema"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Agents table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS agents (
                agent_id TEXT PRIMARY KEY,
                hostname TEXT,
                username TEXT,
                platform TEXT,
                version TEXT,
                ip_address TEXT,
                first_seen TEXT,
                last_seen TEXT,
                status TEXT DEFAULT 'active'
            )
        ''')
        
        # Results table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                agent_id TEXT,
                timestamp TEXT,
                result_data TEXT,
                FOREIGN KEY (agent_id) REFERENCES agents(agent_id)
            )
        ''')
        
        # Sessions table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sessions (
                session_id TEXT PRIMARY KEY,
                agent_id TEXT,
                started_at TEXT,
                ended_at TEXT,
                status TEXT,
                FOREIGN KEY (agent_id) REFERENCES agents(agent_id)
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def register_agent(self, agent_data: Dict):
        """Register or update agent information"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Check if agent exists
        cursor.execute('SELECT agent_id FROM agents WHERE agent_id = ?', 
                      (agent_data['agent_id'],))
        exists = cursor.fetchone()
        
        if exists:
            # Update existing agent
            cursor.execute('''
                UPDATE agents 
                SET hostname = ?, username = ?, platform = ?, version = ?,
                    ip_address = ?, last_seen = ?, status = 'active'
                WHERE agent_id = ?
            ''', (
                agent_data['hostname'],
                agent_data['username'],
                agent_data['platform'],
                agent_data['version'],
                agent_data['ip_address'],
                agent_data['last_seen'],
                agent_data['agent_id']
            ))
        else:
            # Insert new agent
            cursor.execute('''
                INSERT INTO agents 
                (agent_id, hostname, username, platform, version, ip_address, 
                 first_seen, last_seen, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
            ''', (
                agent_data['agent_id'],
                agent_data['hostname'],
                agent_data['username'],
                agent_data['platform'],
                agent_data['version'],
                agent_data['ip_address'],
                agent_data['last_seen'],
                agent_data['last_seen']
            ))
        
        conn.commit()
        conn.close()
    
    def get_all_agents(self) -> List[Dict]:
        """Get list of all agents"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM agents ORDER BY last_seen DESC')
        rows = cursor.fetchall()
        
        agents = [dict(row) for row in rows]
        conn.close()
        
        return agents
    
    def get_agent(self, agent_id: str) -> Optional[Dict]:
        """Get specific agent information"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM agents WHERE agent_id = ?', (agent_id,))
        row = cursor.fetchone()
        
        conn.close()
        
        return dict(row) if row else None
    
    def update_agent_heartbeat(self, agent_id: str):
        """Update agent's last seen timestamp"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE agents 
            SET last_seen = ?, status = 'active'
            WHERE agent_id = ?
        ''', (datetime.now().isoformat(), agent_id))
        
        conn.commit()
        conn.close()
    
    def store_result(self, agent_id: str, result_data: Dict):
        """Store task result from agent"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO results (agent_id, timestamp, result_data)
            VALUES (?, ?, ?)
        ''', (
            agent_id,
            datetime.now().isoformat(),
            json.dumps(result_data)
        ))
        
        conn.commit()
        conn.close()
    
    def get_results(self, agent_id: str, limit: int = 100) -> List[Dict]:
        """Get results for specific agent"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM results 
            WHERE agent_id = ?
            ORDER BY timestamp DESC
            LIMIT ?
        ''', (agent_id, limit))
        
        rows = cursor.fetchall()
        results = []
        
        for row in rows:
            result = dict(row)
            result['result_data'] = json.loads(result['result_data'])
            results.append(result)
        
        conn.close()
        return results
    
    def get_agent_results(self, agent_id: str, limit: int = 50) -> List[Dict]:
        """Get agent results with formatted output"""
        results = self.get_results(agent_id, limit)
        formatted = []
        
        for result in results:
            data = result.get('result_data', {})
            formatted.append({
                'id': result.get('id'),
                'output': data.get('output', ''),
                'error': data.get('error', ''),
                'timestamp': result.get('timestamp')
            })
        
        return formatted
