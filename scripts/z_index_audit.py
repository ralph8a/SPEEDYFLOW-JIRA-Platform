#!/usr/bin/env python3
"""
SPEEDYFLOW - Z-Index Audit Script
Scans all CSS files for hardcoded z-index values and reports them
Usage: python z_index_audit.py
"""

import os
import re
import glob

def find_hardcoded_zindex():
    """Find all hardcoded z-index values in CSS files"""
    css_dir = "frontend/static/css"
    pattern = r'z-index:\s*(\d+)'
    
    results = []
    
    for css_file in glob.glob(f"{css_dir}/**/*.css", recursive=True):
        with open(css_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            
        for line_num, line in enumerate(lines, 1):
            match = re.search(pattern, line)
            if match:
                z_value = int(match.group(1))
                results.append({
                    'file': css_file,
                    'line': line_num,
                    'value': z_value,
                    'content': line.strip(),
                    'recommended_var': get_recommended_variable(z_value)
                })
    
    return results

def get_recommended_variable(z_value):
    """Suggest appropriate CSS variable based on z-index value"""
    if z_value == 0:
        return "var(--z-base) or 0"
    elif z_value <= 10:
        return "var(--z-background)"
    elif z_value <= 50:
        return "var(--z-content)"
    elif z_value <= 100:
        return "var(--z-sidebar-btn)"
    elif z_value <= 200:
        return "var(--z-filter-bar) or var(--z-header)"
    elif z_value <= 500:
        return "var(--z-sidebar) or var(--z-main-content)"
    elif z_value <= 1000:
        return "var(--z-dropdown)"
    elif z_value <= 1100:
        return "var(--z-modal) or var(--z-tooltip) or var(--z-notification)"
    elif z_value <= 2000:
        return "var(--z-system-tooltip)"
    elif z_value <= 9000:
        return "var(--z-loading-overlay)"
    elif z_value <= 9999:
        return "var(--z-debug)"
    else:
        return "var(--z-critical)"

def generate_report():
    """Generate a comprehensive report of hardcoded z-index values"""
    results = find_hardcoded_zindex()
    
    if not results:
        print("✅ No hardcoded z-index values found!")
        return
    
    print("🔍 SPEEDYFLOW Z-Index Audit Report")
    print("=" * 50)
    print(f"Found {len(results)} hardcoded z-index values:\n")
    
    # Sort by z-index value
    results.sort(key=lambda x: x['value'])
    
    for result in results:
        print(f"📁 File: {result['file']}")
        print(f"📍 Line {result['line']}: {result['content']}")
        print(f"🔢 Current: z-index: {result['value']}")
        print(f"💡 Recommended: {result['recommended_var']}")
        print("-" * 40)
    
    print("\n📋 Summary by Z-Index Range:")
    ranges = {
        "0-10 (Base/Background)": [r for r in results if 0 <= r['value'] <= 10],
        "11-100 (UI Elements)": [r for r in results if 11 <= r['value'] <= 100],
        "101-1000 (Interactive)": [r for r in results if 101 <= r['value'] <= 1000],
        "1001-2000 (System)": [r for r in results if 1001 <= r['value'] <= 2000],
        "2001+ (Critical)": [r for r in results if r['value'] > 2000]
    }
    
    for range_name, range_results in ranges.items():
        if range_results:
            print(f"{range_name}: {len(range_results)} instances")
    
    print(f"\n🎯 Priority: Update the {len([r for r in results if r['value'] > 1000])} high z-index values first")

if __name__ == "__main__":
    generate_report()