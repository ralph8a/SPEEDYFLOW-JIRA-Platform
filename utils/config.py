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
    site: str = JIRA_SITE
    email: str = JIRA_EMAIL
    api_token: str = JIRA_API_TOKEN
    request_timeout: int = 30
    max_retries: int = 3
    retry_backoff: list[int] = (1, 2, 4)
    default_page_size: int = 50
    max_page_size: int = 100

@dataclass
class CacheConfig:
    """Caching configuration"""
    enabled: bool = True
    default_ttl: int = 300  # 5 minutes
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

# Global configuration instance
config = AppConfig.from_env()