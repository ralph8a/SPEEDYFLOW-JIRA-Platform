/**
 * ML Preloader - Background data loader for ML Dashboard
 * Automatically detects user context and preloads ML data on app init
 */

class MLPreloader {
    constructor() {
        this.statusCheckInterval = null;
        this.isReady = false;
        this.data = null;
        this.cacheInfo = null;  // Lightweight cache indicator
    }

    /**
     * Initialize preloader - call on app startup
     */
    async init() {
        console.log('🚀 ML Preloader: Initializing...');
        
        // First check cache info (lightweight)
        await this.loadCacheInfo();
        
        if (this.cacheInfo && this.cacheInfo.has_cache) {
            console.log(`✅ ML Preloader: Cache available - ${this.cacheInfo.total_tickets} tickets from ${this.cacheInfo.queue_name}`);
            
            // Load full data
            const cached = await this.checkCachedData();
            if (cached) {
                this.data = cached;
                this.isReady = true;
                this.exposeCacheIndicator();  // Expose globally
                this.notifyReady();
                return;
            }
        }
        
        console.log('⚙️ ML Preloader: No cache found, starting background preload...');
        // Start background preload
        await this.startPreload();
    }

    /**
     * Load cache info (lightweight metadata)
     */
    async loadCacheInfo() {
        try {
            const response = await fetch('/api/ml/preload/cache-info');
            const result = await response.json();
            
            if (result.success && result.cache_info) {
                this.cacheInfo = result.cache_info;
                console.log('📋 Cache Info:', this.cacheInfo);
            }
        } catch (error) {
            console.warn('⚠️ Could not load cache info:', error);
        }
    }

    /**
     * Expose cache indicator globally for other components
     */
    exposeCacheIndicator() {
        // Store in window for easy access by any component
        window.ML_CACHE_INDICATOR = {
            has_cache: true,
            total_tickets: this.cacheInfo.total_tickets,
            desk_id: this.cacheInfo.desk_id,
            desk_name: this.cacheInfo.desk_name,
            queue_id: this.cacheInfo.queue_id,
            queue_name: this.cacheInfo.queue_name,
            cached_at: this.cacheInfo.cached_at,
            
            // Helper methods
            getTickets: () => this.data?.tickets || [],
            getMetrics: () => this.data?.sla_metrics || {},
            getPriorities: () => this.data?.priority_distribution || {},
            getTrends: () => this.data?.trends || {}
        };
        
        console.log('🌍 ML_CACHE_INDICATOR exposed globally:', window.ML_CACHE_INDICATOR);
        console.log('💡 Other components can now use: window.ML_CACHE_INDICATOR.getTickets()');
    }

    /**
     * Check if preloaded data exists
     */
    async checkCachedData() {
        try {
            const response = await fetch('/api/ml/preload/data');
            const result = await response.json();
            
            if (result.success && result.data) {
                console.log(`💾 Found cached ML data: ${result.tickets_count} tickets`);
                return result.data;
            }
            return null;
        } catch (error) {
            // 404 means no cache yet - this is normal
            return null;
        }
    }

    /**
     * Start background preload
     */
    async startPreload() {
        try {
            console.log('📡 ML Preloader: Starting background preload...');
            
            const response = await fetch('/api/ml/preload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ ML Preloader: Background task started');
                this.startStatusPolling();
            } else {
                console.warn('⚠️ ML Preloader: Could not start preload:', result.message);
            }
        } catch (error) {
            console.error('❌ ML Preloader: Error starting preload:', error);
        }
    }

    /**
     * Poll preload status
     */
    startStatusPolling() {
        this.statusCheckInterval = setInterval(async () => {
            await this.checkStatus();
        }, 2000); // Check every 2 seconds
    }

    /**
     * Check current preload status
     */
    async checkStatus() {
        try {
            const response = await fetch('/api/ml/preload/status');
            const result = await response.json();
            
            if (!result.success) return;
            
            const status = result.status;
            
            // Update progress in UI if available
            this.updateProgress(status);
            
            // Check if complete
            if (status.progress === 100 && !status.is_loading) {
                console.log('✅ ML Preloader: Completed!');
                clearInterval(this.statusCheckInterval);
                
                // Reload cache info
                await this.loadCacheInfo();
                
                // Load the data
                const cached = await this.checkCachedData();
                if (cached) {
                    this.data = cached;
                    this.isReady = true;
                    
                    // Expose globally
                    this.exposeCacheIndicator();
                    
                    this.notifyReady();
                }
            }
            
            // Check for errors
            if (status.error) {
                console.error('❌ ML Preloader: Error:', status.error);
                clearInterval(this.statusCheckInterval);
            }
        } catch (error) {
            console.error('❌ ML Preloader: Error checking status:', error);
        }
    }

    /**
     * Update progress indicator
     */
    updateProgress(status) {
        // Update loading indicator if exists
        const indicator = document.getElementById('ml-preload-indicator');
        if (indicator) {
            indicator.textContent = `⚙️ ${status.message} (${status.progress}%)`;
            indicator.style.display = 'block';
        }
        
        // Log progress
        if (status.progress % 20 === 0) { // Log every 20%
            console.log(`📊 ML Preloader: ${status.progress}% - ${status.message}`);
        }
    }

    /**
     * Notify that ML Dashboard is ready
     */
    notifyReady() {
        console.log('🎉 ML Dashboard ready!', {
            desk: this.data.desk_name,
            queue: this.data.queue_name,
            tickets: this.data.total_tickets
        });
        
        // Show notification
        if (typeof showNotification === 'function') {
            showNotification(
                `🎯 ML Dashboard ready! ${this.data.total_tickets} tickets analyzed from ${this.data.queue_name}`,
                'success',
                5000
            );
        }
        
        // Hide loading indicator
        const indicator = document.getElementById('ml-preload-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
        
        // Enable ML Dashboard button
        const mlBtn = document.getElementById('mlAnalyzeBtn');
        if (mlBtn) {
            mlBtn.disabled = false;
            mlBtn.title = 'ML Dashboard Ready - Click to view analytics';
            mlBtn.classList.add('ml-ready');
        }
        
        // Dispatch ready event
        window.dispatchEvent(new CustomEvent('ml-dashboard-ready', {
            detail: {
                desk_id: this.data.desk_id,
                queue_id: this.data.queue_id,
                tickets_count: this.data.total_tickets
            }
        }));
    }

    /**
     * Get preloaded data
     */
    getData() {
        return this.data;
    }

    /**
     * Check if ready
     */
    isMLReady() {
        return this.isReady;
    }

    /**
     * Get cache info (for other components to check)
     */
    getCacheInfo() {
        return this.cacheInfo;
    }
}

// Global instance
window.mlPreloader = new MLPreloader();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.mlPreloader.init();
    });
} else {
    // DOM already loaded
    window.mlPreloader.init();
}

console.log('✅ ML Preloader module loaded');
