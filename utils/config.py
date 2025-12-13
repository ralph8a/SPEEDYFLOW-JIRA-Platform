# -*- coding: utf-8 -*-
"""
Configuration management for the application.
"""

from typing import Any, Dict, Optional
import os
from dataclasses import dataclass

# Load environment variables from .env file
from dotenv import load_dotenv
import logging

logger = logging.getLogger(__name__)

def load_env_config():
    """Load configuration from .env file"""
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
    
    if os.path.exists(env_path):
        load_dotenv(env_path, override=True)
        logger.info(f"Loaded environment from {env_path}")
    else:
        logger.warning(f"No .env file found at {env_path}")
    
    # Validate required environment variables
    site = os.getenv('JIRA_CLOUD_SITE')
    email = os.getenv('JIRA_EMAIL')
    token = os.getenv('JIRA_API_TOKEN')
    
    if not all([site, email, token]):
        logger.warning("Missing required JIRA credentials in .env file")
        logger.warning("Please ensure JIRA_CLOUD_SITE, JIRA_EMAIL, and JIRA_API_TOKEN are set")
    
    return site, email, token

# Load environment configuration
JIRA_SITE, JIRA_EMAIL, JIRA_API_TOKEN = load_env_config()

@dataclass
class JiraConfig:
    """JIRA API configuration"""
    site: str = JIRA_SITE or ""
    email: str = JIRA_EMAIL or ""
    api_token: str = JIRA_API_TOKEN or ""
    request_timeout: int = 30
    max_retries: int = 3
    retry_backoff: list[int] = (1, 2, 4)
    default_page_size: int = 50
    max_page_size: int = 100

@dataclass
class UserConfig:
    """User-specific configuration"""
    project_key: Optional[str] = None  # User's primary project/desk (e.g., "MSM")
    desk_id: Optional[str] = None      # User's primary service desk ID
    queue_id: Optional[str] = None     # User's preferred queue ID
    jira_site: Optional[str] = None    # User's JIRA site URL
    jira_email: Optional[str] = None   # User's JIRA email
    jira_token: Optional[str] = None   # User's JIRA API token

@dataclass
class CacheConfig:
    """Caching configuration"""
    enabled: bool = True
    default_ttl: int = 900  # 15 minutes (was 5 - increased for performance)
    max_ttl: int = 3600    # 1 hour

@dataclass
class LoggingConfig:
    """Logging configuration"""
    level: str = "INFO"
    file: Optional[str] = "logs/salesjira.log"
    max_size: int = 10485760  # 10MB
    backup_count: int = 5

@dataclass
class AppConfig:
    """Application configuration"""
    jira: JiraConfig
    cache: CacheConfig
    logging: LoggingConfig
    user: UserConfig
    env_label: str = "PROD"
    env_color: str = "#2e7d32"

    @classmethod
    def from_env(cls) -> 'AppConfig':
        """Create configuration from environment variables"""
        return cls(
            jira=JiraConfig(
                site=os.getenv("JIRA_CLOUD_SITE", "").rstrip("/"),
                email=os.getenv("JIRA_EMAIL", ""),
                api_token=os.getenv("JIRA_API_TOKEN") or os.getenv("ATLASSIAN_API_TOKEN", ""),
                request_timeout=int(os.getenv("JIRA_REQUEST_TIMEOUT", "30")),
                max_retries=int(os.getenv("JIRA_MAX_RETRIES", "3")),
                retry_backoff=[int(x) for x in os.getenv("JIRA_RETRY_BACKOFF", "1,2,4").split(",")],
                default_page_size=int(os.getenv("JIRA_DEFAULT_PAGE_SIZE", "50")),
                max_page_size=int(os.getenv("JIRA_MAX_PAGE_SIZE", "100"))
            ),
            cache=CacheConfig(
                enabled=os.getenv("CACHE_ENABLED", "true").lower() == "true",
                default_ttl=int(os.getenv("CACHE_DEFAULT_TTL", "300")),
                max_ttl=int(os.getenv("CACHE_MAX_TTL", "3600"))
            ),
            logging=LoggingConfig(
                level=os.getenv("LOG_LEVEL", "INFO"),
                file=os.getenv("LOG_FILE", "logs/salesjira.log"),
                max_size=int(os.getenv("LOG_MAX_SIZE", "10485760")),
                backup_count=int(os.getenv("LOG_BACKUP_COUNT", "5"))
            ),
            user=UserConfig(
                project_key=os.getenv("USER_PROJECT_KEY"),
                desk_id=os.getenv("USER_DESK_ID"),
                queue_id=os.getenv("USER_QUEUE_ID"),
                jira_site=os.getenv("JIRA_CLOUD_SITE"),
                jira_email=os.getenv("JIRA_EMAIL"),
                jira_token=os.getenv("JIRA_API_TOKEN")
            ),
            env_label=os.getenv("ENV_LABEL", "PROD"),
            env_color=os.getenv("ENV_COLOR", "#2e7d32")
        )

    def validate(self) -> list[str]:
        """Validate configuration and return list of errors"""
        errors = []
        if not self.jira.site:
            errors.append("JIRA_CLOUD_SITE not configured")
        if not self.jira.email:
            errors.append("JIRA_EMAIL not configured")
        if not self.jira.api_token:
            errors.append("No API token found (JIRA_API_TOKEN or ATLASSIAN_API_TOKEN)")
        return errors
    
    def needs_login(self) -> bool:
        """Check if login credentials are needed"""
        return not all([
            self.jira.site,
            self.jira.email,
            self.jira.api_token
        ])
    
    def needs_user_setup(self) -> bool:
        """Check if user configuration is needed"""
        return not self.user.project_key

def save_user_credentials(jira_site: str, jira_email: str, jira_token: str, project_key: str = None, desk_id: str = None) -> bool:
    """
    Save user credentials and configuration to .env file and user documents
    
    Args:
        jira_site: JIRA site URL (e.g., "https://speedymovil.atlassian.net")
        jira_email: User's JIRA email
        jira_token: User's JIRA API token
        project_key: Optional user's primary project key (e.g., "MSM")
        desk_id: Optional service desk ID
    
    Returns:
        bool: True if saved successfully
    """
    try:
        env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
        
        # Read existing .env
        if os.path.exists(env_path):
            with open(env_path, 'r') as f:
                env_lines = f.readlines()
        else:
            env_lines = ['# SpeedyFlow Configuration\n\n']
        
        # Update or add credentials
        credentials = {
            'JIRA_CLOUD_SITE': jira_site,
            'JIRA_EMAIL': jira_email,
            'JIRA_API_TOKEN': jira_token,
        }
        
        if project_key:
            credentials['USER_PROJECT_KEY'] = project_key
        if desk_id:
            credentials['USER_DESK_ID'] = desk_id
        
        # Update existing lines or mark as not found
        for key, value in credentials.items():
            found = False
            for i, line in enumerate(env_lines):
                if line.startswith(f'{key}='):
                    env_lines[i] = f'{key}={value}\n'
                    found = True
                    break
            if not found:
                env_lines.append(f'{key}={value}\n')
        
        # Write back to .env
        with open(env_path, 'w') as f:
            f.writelines(env_lines)
        
        # Also save to user documents for backup
        try:
            user_home = os.path.expanduser('~')
            speedyflow_dir = os.path.join(user_home, 'Documents', 'SpeedyFlow')
            os.makedirs(speedyflow_dir, exist_ok=True)
            
            config_file = os.path.join(speedyflow_dir, 'credentials.env')
            with open(config_file, 'w') as f:
                f.write('# SpeedyFlow JIRA Credentials\n')
                f.write('# Este archivo es un respaldo de tus credenciales\n\n')
                for key, value in credentials.items():
                    f.write(f'{key}={value}\n')
            
            logger.info(f"✅ Credentials also saved to: {config_file}")
        except Exception as e:
            logger.warning(f"⚠️ Could not save backup to Documents: {e}")
        
        logger.info(f"✅ User credentials saved: SITE={jira_site}, EMAIL={jira_email}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to save user credentials: {e}")
        return False

def save_user_config(project_key: str, desk_id: str = None, queue_id: str = None) -> bool:
    """Save user configuration to .env file"""
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
    
    try:
        # Read existing .env content
        env_lines = []
        if os.path.exists(env_path):
            with open(env_path, 'r') as f:
                env_lines = f.readlines()
        
        # Update or add USER_PROJECT_KEY, USER_DESK_ID, and USER_QUEUE_ID
        updated = False
        desk_updated = False
        queue_updated = False
        
        for i, line in enumerate(env_lines):
            if line.startswith('USER_PROJECT_KEY='):
                env_lines[i] = f'USER_PROJECT_KEY={project_key}\n'
                updated = True
            elif line.startswith('USER_DESK_ID=') and desk_id:
                env_lines[i] = f'USER_DESK_ID={desk_id}\n'
                desk_updated = True
            elif line.startswith('USER_QUEUE_ID=') and queue_id:
                env_lines[i] = f'USER_QUEUE_ID={queue_id}\n'
                queue_updated = True
        
        # Add if not found
        if not updated:
            env_lines.append(f'\n# User Configuration\nUSER_PROJECT_KEY={project_key}\n')
        if desk_id and not desk_updated:
            env_lines.append(f'USER_DESK_ID={desk_id}\n')
        if queue_id and not queue_updated:
            env_lines.append(f'USER_QUEUE_ID={queue_id}\n')
        
        # Write back to .env
        with open(env_path, 'w') as f:
            f.writelines(env_lines)
        
        logger.info(f"✅ User configuration saved: PROJECT_KEY={project_key}, DESK_ID={desk_id}, QUEUE_ID={queue_id}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to save user configuration: {e}")
        return False

# Global configuration instance
config = AppConfig.from_env()