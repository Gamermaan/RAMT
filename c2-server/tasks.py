"""
Task Queue module using Redis for scalable task management
Falls back to in-memory queue if Redis is not available
"""

import json
import uuid
from datetime import datetime
from typing import List, Dict, Optional

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False


class TaskQueue:
    def __init__(self, redis_host='localhost', redis_port=6379):
        self.use_redis = REDIS_AVAILABLE
        
        if self.use_redis:
            try:
                self.redis_client = redis.Redis(
                    host=redis_host,
                    port=redis_port,
                    decode_responses=True
                )
                # Test connection
                self.redis_client.ping()
                print("[+] Redis connection established")
            except Exception as e:
                print(f"[!] Redis connection failed: {e}")
                print("[*] Falling back to in-memory queue")
                self.use_redis = False
                self.init_memory_queue()
        else:
            print("[*] Redis not available, using in-memory queue")
            self.init_memory_queue()
    
    def init_memory_queue(self):
        """Initialize in-memory task queue"""
        self.task_queues = {}  # agent_id -> list of tasks
        self.tasks = {}  # task_id -> task data
    
    def add_task(self, agent_id: str, task_data: Dict) -> str:
        """Add task to queue for specific agent"""
        task_id = str(uuid.uuid4())
        task = {
            'task_id': task_id,
            'agent_id': agent_id,
            'type': task_data.get('type'),
            'data': task_data.get('data', {}),
            'created_at': datetime.now().isoformat(),
            'status': 'pending'
        }
        
        if self.use_redis:
            # Store task in Redis
            task_key = f"task:{task_id}"
            queue_key = f"queue:{agent_id}"
            
            self.redis_client.set(task_key, json.dumps(task))
            self.redis_client.rpush(queue_key, task_id)
        else:
            # Store in memory
            if agent_id not in self.task_queues:
                self.task_queues[agent_id] = []
            
            self.task_queues[agent_id].append(task_id)
            self.tasks[task_id] = task
        
        return task_id
    
    def get_tasks(self, agent_id: str, limit: int = 10) -> List[Dict]:
        """Get pending tasks for agent"""
        tasks = []
        
        if self.use_redis:
            queue_key = f"queue:{agent_id}"
            
            # Get task IDs from queue
            task_ids = self.redis_client.lrange(queue_key, 0, limit - 1)
            
            for task_id in task_ids:
                task_key = f"task:{task_id}"
                task_data = self.redis_client.get(task_key)
                
                if task_data:
                    task = json.loads(task_data)
                    tasks.append(task)
                    
                    # Remove from queue
                    self.redis_client.lrem(queue_key, 1, task_id)
        else:
            # Get from memory
            if agent_id in self.task_queues:
                task_ids = self.task_queues[agent_id][:limit]
                
                for task_id in task_ids:
                    if task_id in self.tasks:
                        tasks.append(self.tasks[task_id])
                
                # Remove retrieved tasks from queue
                self.task_queues[agent_id] = self.task_queues[agent_id][limit:]
        
        return tasks
    
    def get_task_status(self, task_id: str) -> Optional[Dict]:
        """Get status of specific task"""
        if self.use_redis:
            task_key = f"task:{task_id}"
            task_data = self.redis_client.get(task_key)
            
            if task_data:
                return json.loads(task_data)
        else:
            return self.tasks.get(task_id)
        
        return None
    
    def update_task_status(self, task_id: str, status: str):
        """Update task status"""
        if self.use_redis:
            task_key = f"task:{task_id}"
            task_data = self.redis_client.get(task_key)
            
            if task_data:
                task = json.loads(task_data)
                task['status'] = status
                task['updated_at'] = datetime.now().isoformat()
                self.redis_client.set(task_key, json.dumps(task))
        else:
            if task_id in self.tasks:
                self.tasks[task_id]['status'] = status
                self.tasks[task_id]['updated_at'] = datetime.now().isoformat()
    
    def clear_agent_queue(self, agent_id: str):
        """Clear all tasks for specific agent"""
        if self.use_redis:
            queue_key = f"queue:{agent_id}"
            self.redis_client.delete(queue_key)
        else:
            if agent_id in self.task_queues:
                del self.task_queues[agent_id]
