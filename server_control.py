#!/usr/bin/env python3
"""
SPEEDYFLOW Server Controller
Mantiene el servidor ejecutándose de forma estable y maneja reinicios automáticos
"""

import subprocess
import time
import sys
import os
import signal
import threading
import logging
from pathlib import Path

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ServerController:
    def __init__(self):
        self.process = None
        self.running = False
        self.restart_count = 0
        self.max_restarts = 5
        
    def start_server(self):
        """Inicia el servidor Flask"""
        try:
            logger.info("🚀 Starting SPEEDYFLOW server...")
            
            # Start server process
            self.process = subprocess.Popen(
                [sys.executable, "run_server.py"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                universal_newlines=True,
                bufsize=1
            )
            
            self.running = True
            logger.info(f"✅ Server started with PID: {self.process.pid}")
            
            # Monitor server output in separate thread
            output_thread = threading.Thread(target=self.monitor_output)
            output_thread.daemon = True
            output_thread.start()
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to start server: {e}")
            return False
    
    def monitor_output(self):
        """Monitor server output and handle errors"""
        if not self.process:
            return
            
        try:
            for line in self.process.stdout:
                if line.strip():
                    print(f"[SERVER] {line.strip()}")
                    
                # Check for specific errors that require restart
                error_patterns = [
                    "Address already in use",
                    "Connection refused", 
                    "Network unreachable",
                    "Broken pipe"
                ]
                
                for pattern in error_patterns:
                    if pattern.lower() in line.lower():
                        print(f"⚠️  Detected network error: {pattern}")
                        self.schedule_restart()
                        return
        except Exception as e:
            print(f"⚠️  Output monitor error: {e}")
    
    def schedule_restart(self):
        """Schedule server restart"""
        if self.restart_count >= self.max_restarts:
            print(f"❌ Max restart attempts ({self.max_restarts}) reached. Stopping.")
            self.stop_server()
            return
            
        print(f"🔄 Scheduling restart ({self.restart_count + 1}/{self.max_restarts})...")
        
        # Stop current server
        self.stop_server()
        
        # Wait a bit before restarting
        time.sleep(2)
        
        # Restart
        self.restart_count += 1
        self.start_server()
    
    def stop_server(self):
        """Stop the server process"""
        self.running = False
        
        if self.process:
            try:
                logger.info(f"🛑 Stopping server...")
                
                # Terminate gracefully
                self.process.terminate()
                
                # Wait for termination
                try:
                    self.process.wait(timeout=5)
                    print("✅ Server stopped gracefully")
                except subprocess.TimeoutExpired:
                    print("⚠️  Force killing server...")
                    self.process.kill()
                    self.process.wait()
                    print("✅ Server force stopped")
                    
            except Exception as e:
                print(f"❌ Error stopping server: {e}")
            finally:
                self.process = None
    
    def is_port_available(self, port=5005):
        """Check if port is available"""
        import socket
        
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(1)
                result = s.connect_ex(('127.0.0.1', port))
                return result != 0  # Port is available if connection fails
        except Exception:
            return True
    
    def cleanup_port(self, port=5005):
        """Kill any process using the specified port"""
        try:
            if os.name == 'nt':  # Windows
                result = subprocess.run(
                    f'netstat -ano | findstr :{port}',
                    shell=True,
                    capture_output=True,
                    text=True
                )
                
                if result.stdout:
                    lines = result.stdout.strip().split('\n')
                    for line in lines:
                        parts = line.split()
                        if len(parts) >= 5 and f':{port}' in parts[1]:
                            pid = parts[4]
                            print(f"🧹 Killing process {pid} using port {port}")
                            subprocess.run(f'taskkill /PID {pid} /F', shell=True)
            else:  # Unix-like
                subprocess.run(f'lsof -ti:{port} | xargs kill -9', shell=True)
                
        except Exception as e:
            print(f"⚠️  Could not cleanup port {port}: {e}")
    
    def run(self):
        """Main run loop"""
        print("🎮 SPEEDYFLOW Server Controller")
        print("=" * 40)
        
        # Cleanup port first
        if not self.is_port_available():
            print("⚠️  Port 5005 is in use. Cleaning up...")
            self.cleanup_port()
            time.sleep(2)
        
        # Start server
        if not self.start_server():
            print("❌ Failed to start server")
            return 1
        
        try:
            print("\n💡 Server is running. Press Ctrl+C to stop.")
            print("📊 Monitoring for network errors and auto-restart...")
            print("-" * 40)
            
            # Main monitoring loop
            while self.running:
                time.sleep(1)
                
                # Check if process is still alive
                if self.process and self.process.poll() is not None:
                    exit_code = self.process.poll()
                    print(f"⚠️  Server process exited with code: {exit_code}")
                    
                    if exit_code != 0 and self.restart_count < self.max_restarts:
                        self.schedule_restart()
                    else:
                        print("🛑 Server stopped")
                        break
                        
        except KeyboardInterrupt:
            print("\n\n🛑 Received stop signal")
        finally:
            self.stop_server()
            print("👋 Server controller stopped")
            
        return 0

def main():
    """Main function"""
    try:
        controller = ServerController()
        return controller.run()
    except Exception as e:
        print(f"❌ Controller error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())