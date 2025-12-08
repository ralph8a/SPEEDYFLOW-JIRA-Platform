#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Test Script for Login Flow
Tests the new login implementation and credential saving
"""

import os
import sys
import json

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.config import config, save_user_credentials


def test_needs_login():
    """Test if login is needed"""
    print("\n🔍 Testing needs_login()...")
    needs_login = config.needs_login()
    print(f"   needs_login: {needs_login}")
    print(f"   has_site: {bool(config.jira.site)}")
    print(f"   has_email: {bool(config.jira.email)}")
    print(f"   has_token: {bool(config.jira.api_token)}")
    return needs_login


def test_save_credentials():
    """Test credential saving"""
    print("\n💾 Testing save_user_credentials()...")
    
    # Test data
    test_site = "https://test.atlassian.net"
    test_email = "test@example.com"
    test_token = "TEST_TOKEN_123"
    test_project = "TEST"
    
    success = save_user_credentials(
        jira_site=test_site,
        jira_email=test_email,
        jira_token=test_token,
        project_key=test_project
    )
    
    print(f"   Save result: {'✅ SUCCESS' if success else '❌ FAILED'}")
    
    # Verify .env file
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
    if os.path.exists(env_path):
        print(f"   ✅ .env file exists")
        with open(env_path, 'r') as f:
            content = f.read()
            if test_site in content:
                print(f"   ✅ Site saved in .env")
            if test_email in content:
                print(f"   ✅ Email saved in .env")
            if test_token in content:
                print(f"   ✅ Token saved in .env")
    else:
        print(f"   ❌ .env file not found")
    
    # Verify backup file
    backup_path = os.path.expanduser('~/Documents/SpeedyFlow/credentials.env')
    if os.path.exists(backup_path):
        print(f"   ✅ Backup file exists: {backup_path}")
    else:
        print(f"   ⚠️  Backup file not found (may be expected)")
    
    return success


def test_config_reload():
    """Test configuration reload"""
    print("\n🔄 Testing config reload...")
    
    # Reload config
    from utils import config as config_module
    config_module.config = config_module.AppConfig.from_env()
    
    print(f"   Site: {config_module.config.jira.site}")
    print(f"   Email: {config_module.config.jira.email}")
    print(f"   Project Key: {config_module.config.user.project_key}")
    
    return True


def test_user_config():
    """Test UserConfig fields"""
    print("\n👤 Testing UserConfig...")
    
    print(f"   project_key: {config.user.project_key}")
    print(f"   desk_id: {config.user.desk_id}")
    print(f"   jira_site: {config.user.jira_site}")
    print(f"   jira_email: {config.user.jira_email}")
    print(f"   jira_token: {'***' if config.user.jira_token else None}")
    
    return True


def cleanup_test_data():
    """Clean up test data from .env"""
    print("\n🧹 Cleaning up test data...")
    
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            lines = f.readlines()
        
        # Remove test lines
        cleaned_lines = []
        for line in lines:
            if not any(test_val in line for test_val in ['test.atlassian.net', 'test@example.com', 'TEST_TOKEN_123', 'USER_PROJECT_KEY=TEST']):
                cleaned_lines.append(line)
        
        with open(env_path, 'w') as f:
            f.writelines(cleaned_lines)
        
        print("   ✅ Test data cleaned from .env")
    
    return True


def main():
    """Run all tests"""
    print("=" * 60)
    print("🧪 SPEEDYFLOW LOGIN FLOW TEST SUITE")
    print("=" * 60)
    
    results = []
    
    # Test 1: Check needs_login
    try:
        test_needs_login()
        results.append(("needs_login", True))
    except Exception as e:
        print(f"   ❌ Error: {e}")
        results.append(("needs_login", False))
    
    # Test 2: Check UserConfig
    try:
        test_user_config()
        results.append(("user_config", True))
    except Exception as e:
        print(f"   ❌ Error: {e}")
        results.append(("user_config", False))
    
    # Test 3: Save credentials
    try:
        success = test_save_credentials()
        results.append(("save_credentials", success))
    except Exception as e:
        print(f"   ❌ Error: {e}")
        results.append(("save_credentials", False))
    
    # Test 4: Reload config
    try:
        test_config_reload()
        results.append(("config_reload", True))
    except Exception as e:
        print(f"   ❌ Error: {e}")
        results.append(("config_reload", False))
    
    # Cleanup
    try:
        cleanup_test_data()
    except Exception as e:
        print(f"   ⚠️  Cleanup error: {e}")
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {status} - {test_name}")
    
    print("\n" + "=" * 60)
    print(f"✅ {passed}/{total} tests passed")
    print("=" * 60)
    
    return passed == total


if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
