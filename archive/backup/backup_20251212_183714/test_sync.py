#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Test JIRA sync endpoint"""
import sys
sys.path.insert(0, '.')
from utils.config import config
from utils.common import _make_request, _get_credentials, _get_auth_header
import json
def test_sync():
    """Test JIRA sync"""
    try:
        site, email, api_token = _get_credentials(config)
        print(f"✓ Site: {site}")
        print(f"✓ Email: {email}")
        headers = _get_auth_header(email, api_token)
        jql = "updated >= -1d ORDER BY updated DESC"
        url = f"{site}/rest/api/2/search"
        params = {
            'jql': jql,
            'maxResults': 5,
            'fields': 'key,summary,status,assignee,updated'
        }
        print(f"\n🔍 Fetching: {url}")
        print(f"📋 JQL: {jql}")
        data = _make_request('GET', url, headers, params=params)
        if data is None:
            print("❌ _make_request returned None")
            return
        print(f"\n✓ Data type: {type(data)}")
        print(f"✓ Data keys: {data.keys() if isinstance(data, dict) else 'Not a dict'}")
        issues = data.get('issues', [])
        print(f"\n✓ Found {len(issues)} issues")
        if issues:
            first = issues[0]
            print(f"\n📄 First issue structure:")
            print(json.dumps(first, indent=2)[:500])
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
if __name__ == '__main__':
    test_sync()
