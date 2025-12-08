#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Test Comment Suggestions Engine
Quick test to verify AI suggestions are working
"""

import requests
import json

API_URL = "http://127.0.0.1:5005/api/ml/comments/suggestions"

# Test tickets with different scenarios
test_tickets = [
    {
        "name": "Error/Exception Ticket",
        "data": {
            "summary": "Application crash on login",
            "description": "The app crashes with a NullPointerException when users try to login. Error appears in server logs.",
            "issue_type": "Bug",
            "status": "Open",
            "priority": "High",
            "max_suggestions": 5
        }
    },
    {
        "name": "Performance Issue",
        "data": {
            "summary": "Dashboard loading very slow",
            "description": "Users are reporting that the main dashboard takes over 30 seconds to load. Performance degradation started yesterday.",
            "issue_type": "Bug",
            "status": "In Progress",
            "priority": "Medium",
            "max_suggestions": 5
        }
    },
    {
        "name": "Feature Request",
        "data": {
            "summary": "Add export to PDF functionality",
            "description": "Users need the ability to export reports to PDF format for sharing with clients.",
            "issue_type": "Feature",
            "status": "Open",
            "priority": "Low",
            "max_suggestions": 5
        }
    }
]

def test_suggestions():
    print("=" * 80)
    print("🤖 Testing Comment Suggestions Engine")
    print("=" * 80)
    
    for test in test_tickets:
        print(f"\n📋 Testing: {test['name']}")
        print("-" * 80)
        print(f"Summary: {test['data']['summary']}")
        print(f"Type: {test['data']['issue_type']} | Priority: {test['data']['priority']}")
        
        try:
            response = requests.post(API_URL, json=test['data'], timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                suggestions = result.get('suggestions', [])
                
                print(f"\n✅ Got {len(suggestions)} suggestions:")
                for i, sugg in enumerate(suggestions, 1):
                    print(f"\n{i}. [{sugg['type'].upper()}] ({sugg['confidence']:.0%} confidence)")
                    print(f"   {sugg['text'][:150]}{'...' if len(sugg['text']) > 150 else ''}")
            else:
                print(f"❌ Error: HTTP {response.status_code}")
                print(f"   {response.text}")
                
        except Exception as e:
            print(f"❌ Exception: {e}")
    
    print("\n" + "=" * 80)
    print("✅ Test complete!")
    print("=" * 80)

if __name__ == "__main__":
    test_suggestions()
