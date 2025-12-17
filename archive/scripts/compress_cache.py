#!/usr/bin/env python3
"""
Compress Cache Migration Script
================================
Comprime el archivo msm_issues.json existente a formato .json.gz
Ahorra ~85-90% de espacio en disco.
Usage:
    python scripts/compress_cache.py
"""
import json
import gzip
import sys
from pathlib import Path
from datetime import datetime
def compress_cache_file():
    """Compress the JSON cache file to .json.gz"""
    cache_dir = Path("data/cache")
    json_file = cache_dir / "msm_issues.json"
    gz_file = cache_dir / "msm_issues.json.gz"
    print("🗜️  Cache Compression Tool")
    print("=" * 60)
    # Check if uncompressed file exists
    if not json_file.exists():
        print(f"❌ File not found: {json_file}")
        print(f"ℹ️  Looking for already compressed version...")
        if gz_file.exists():
            print(f"✅ Compressed file already exists: {gz_file}")
            print_file_stats(gz_file)
            return True
        else:
            print(f"❌ No cache file found (compressed or uncompressed)")
            return False
    # Get original size
    original_size = json_file.stat().st_size
    print(f"📄 Original file: {json_file.name}")
    print(f"📊 Original size: {original_size / 1024 / 1024:.2f} MB")
    # Load JSON
    print(f"\n🔄 Loading JSON data...")
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        issues_count = len(data.get('issues', []))
        print(f"✅ Loaded {issues_count:,} issues")
    except Exception as e:
        print(f"❌ Error loading JSON: {e}")
        return False
    # Compress and save
    print(f"\n🗜️  Compressing to {gz_file.name}...")
    try:
        start_time = datetime.now()
        json_str = json.dumps(data, indent=2, ensure_ascii=False)
        with gzip.open(gz_file, 'wt', encoding='utf-8', compresslevel=6) as f:
            f.write(json_str)
        elapsed = (datetime.now() - start_time).total_seconds()
        compressed_size = gz_file.stat().st_size
        ratio = (1 - compressed_size / original_size) * 100
        print(f"✅ Compression complete in {elapsed:.1f}s")
        print(f"\n📊 Results:")
        print(f"   Original:   {original_size / 1024 / 1024:.2f} MB")
        print(f"   Compressed: {compressed_size / 1024 / 1024:.2f} MB")
        print(f"   Saved:      {(original_size - compressed_size) / 1024 / 1024:.2f} MB ({ratio:.1f}%)")
        # Verify compressed file can be read
        print(f"\n🧪 Verifying compressed file...")
        with gzip.open(gz_file, 'rt', encoding='utf-8') as f:
            test_data = json.load(f)
            test_issues = len(test_data.get('issues', []))
        if test_issues == issues_count:
            print(f"✅ Verification passed: {test_issues:,} issues")
        else:
            print(f"⚠️  Issue count mismatch: {test_issues} vs {issues_count}")
            return False
        # Offer to delete original
        print(f"\n🗑️  Do you want to delete the original uncompressed file?")
        print(f"   This will save {original_size / 1024 / 1024:.2f} MB of disk space.")
        response = input("   Delete original? (yes/no): ").strip().lower()
        if response in ['yes', 'y']:
            json_file.unlink()
            print(f"✅ Deleted {json_file.name}")
            print(f"💾 Total space saved: {original_size / 1024 / 1024:.2f} MB")
        else:
            print(f"ℹ️  Original file kept: {json_file.name}")
            print(f"ℹ️  You can delete it manually later if needed")
        return True
    except Exception as e:
        print(f"❌ Error compressing: {e}")
        return False
def print_file_stats(file_path: Path):
    """Print stats for a file"""
    if not file_path.exists():
        print(f"❌ File not found: {file_path}")
        return
    size = file_path.stat().st_size
    print(f"\n📊 File Stats:")
    print(f"   Path: {file_path}")
    print(f"   Size: {size / 1024 / 1024:.2f} MB ({size:,} bytes)")
    # Try to read and get issue count
    try:
        if str(file_path).endswith('.gz'):
            with gzip.open(file_path, 'rt', encoding='utf-8') as f:
                data = json.load(f)
        else:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        issues_count = len(data.get('issues', []))
        print(f"   Issues: {issues_count:,}")
        print(f"   Size per issue: {size / issues_count / 1024:.2f} KB")
    except Exception as e:
        print(f"   Could not read file: {e}")
def main():
    """Main entry point"""
    print()
    success = compress_cache_file()
    print("\n" + "=" * 60)
    if success:
        print("✅ Compression successful!")
        print("\nℹ️  The application will now automatically use the compressed file.")
        print("ℹ️  No code changes needed - everything is backward compatible.")
    else:
        print("❌ Compression failed!")
        sys.exit(1)
    print()
if __name__ == "__main__":
    main()
