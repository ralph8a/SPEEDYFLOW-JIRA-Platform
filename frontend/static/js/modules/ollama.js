/**
 * Ollama AI Integration Module
 * Uses backend proxy at /api/ollama/call to avoid CORS issues
 * Adds AI analysis buttons to tickets when filters are applied
 */

const OllamaModule = (() => {
  const BACKEND_PROXY = '/api/ollama/call';
  let isAvailable = false;
  let initialized = false;

  /**
   * Initialize - check if backend Ollama proxy is available
   */
  async function init() {
    if (initialized) return;
    initialized = true;
    
    try {
      console.log('🔍 Checking Ollama availability via backend proxy...');
      
      const response = await fetch(BACKEND_PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'ping' }),
        timeout: 3000
      });
      
      if (response.ok) {
        isAvailable = true;
        console.log('✅ Ollama Available (via backend proxy)');
        updateUIStatus(true);
        setupTicketButtonInjection();
      } else {
        console.warn('⚠️ Backend proxy returned:', response.status);
        isAvailable = false;
        updateUIStatus(false);
      }
    } catch (error) {
      console.warn('⚠️ Ollama not available:', error.message);
      isAvailable = false;
      updateUIStatus(false);
    }
  }

  /**
   * Update UI status badge
   */
  function updateUIStatus(available) {
    const statusBadge = document.getElementById('ollama-status-badge');
    if (statusBadge) {
      if (available) {
        statusBadge.classList.add('active');
        const statusText = statusBadge.querySelector('.status-text');
        if (statusText) {
          statusText.innerHTML = '🤖 AI Ready';
        }
      } else {
        statusBadge.classList.remove('active');
        const statusText = statusBadge.querySelector('.status-text');
        if (statusText) {
          statusText.innerHTML = '🤖 AI Offline';
        }
      }
    }
  }

  /**
   * Call Ollama via backend proxy with optimized timeout
   */
  async function callOllama(prompt, stream = false) {
    if (!isAvailable) {
      throw new Error('Ollama not available');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout (was 120s)

    try {
      console.log('📤 Sending prompt to Ollama...');
      
      const response = await fetch(BACKEND_PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log(`Backend response status: ${response.status}`);

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || `Backend error: ${response.status}`);
      }

      return data.data.response || '';
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('❌ Ollama call failed:', error);
      throw error;
    }
  }

  /**
   * Analyze ticket with Ollama - OPTIMIZED FOR SPEED
   */
  async function analyzeTicket(ticket) {
    if (!isAvailable) {
      throw new Error('Ollama AI is not available');
    }

    try {
      console.log('🤖 Analyzing ticket with Ollama...', ticket.key);
      
      // OPTIMIZED PROMPT - Much shorter for faster analysis
      const prompt = `Quick analysis of: "${ticket.summary}"

Format your response as:
Priority: [High/Medium/Low]
Type: [Bug/Feature/Task]
Status: Ready/Needs Review

Keep it brief (max 3 lines total).`;

      const response = await callOllama(prompt);
      
      return {
        success: true,
        ticket_key: ticket.key,
        analysis: response,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Find duplicates with AI
   */
  async function findDuplicates(ticket) {
    if (!isAvailable) {
      throw new Error('Ollama AI is not available');
    }

    try {
      console.log('🔍 Finding duplicates with AI...', ticket.key);
      
      const prompt = `Based on this ticket summary and description, identify potential duplicate issues:

TICKET:
Summary: ${ticket.summary}
Description: ${ticket.description || ticket.summary}

List any potential duplicate keywords or similar problem areas. Keep response brief.`;

      const response = await callOllama(prompt);
      
      return {
        success: true,
        ticket_key: ticket.key,
        potential_issues: response
      };
    } catch (error) {
      console.error('❌ Duplicate search failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate summary
   */
  async function generateSummary(ticket) {
    if (!isAvailable) {
      throw new Error('Ollama AI is not available');
    }

    try {
      console.log('📝 Generating summary...', ticket.key);
      
      const prompt = `Create a brief, professional summary (max 30 words) of this ticket:

${ticket.description || ticket.summary}

Summary:`;

      const response = await callOllama(prompt);
      
      return {
        success: true,
        summary: response.trim()
      };
    } catch (error) {
      console.error('❌ Summary generation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Suggest response
   */
  async function suggestResponse(ticket) {
    if (!isAvailable) {
      throw new Error('Ollama AI is not available');
    }

    try {
      console.log('💬 Generating response suggestion...', ticket.key);
      
      const prompt = `Generate a professional response to this support ticket (max 100 words):

Summary: ${ticket.summary}
Description: ${ticket.description || 'No details provided'}
Status: ${ticket.status}

Response:`;

      const response = await callOllama(prompt);
      
      return {
        success: true,
        suggestion: response.trim()
      };
    } catch (error) {
      console.error('❌ Response suggestion failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Display analysis in UI
   */
  function displayAnalysis(analysis) {
    const panelEl = document.getElementById('ollama-analysis-panel');
    if (!panelEl) return;

    // Don't show empty or analyzing states
    if (!analysis || analysis === 'analyzing') return;

    let content = '';
    
    if (analysis.error) {
      content = `
        <div style="padding: 15px; background: #fee2e2; border-left: 4px solid #dc2626; border-radius: 4px;">
          <strong>⚠️ Error:</strong>
          <p style="margin: 10px 0 0 0; font-size: 14px;">${analysis.error}</p>
        </div>
      `;
    } else {
      const analysisText = (analysis.analysis || analysis.suggestion || analysis.summary || 'No analysis available')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
      
      content = `
        <div style="padding: 15px;">
          <strong style="display: block; margin-bottom: 10px; font-size: 14px;">📊 Analysis Results:</strong>
          <div style="white-space: pre-wrap; line-height: 1.6; font-size: 13px; color: #333;">
${analysisText}
          </div>
        </div>
      `;
    }

    const html = `
      <div class="ollama-analysis" style="position: fixed; top: 60px; right: 20px; width: 420px; max-height: 65vh; background: white; border-radius: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); z-index: 10000; display: flex; flex-direction: column; border: 1px solid #e5e7eb;">
        <div style="padding: 15px 15px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);">
          <h3 style="margin: 0; font-size: 16px; color: white; font-weight: 600;">🤖 AI Analysis</h3>
          <button onclick="window.ollama.closeAnalysis()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: white; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">✕</button>
        </div>
        
        <div style="flex: 1; overflow-y: auto; padding: 0;">
          ${content}
        </div>
      </div>
    `;

    panelEl.innerHTML = html;
    panelEl.style.display = 'block';
  }

  /**
   * Close analysis panel
   */
  function closeAnalysis() {
    const panelEl = document.getElementById('ollama-analysis-panel');
    if (panelEl) {
      panelEl.style.display = 'none';
    }
  }

  /**
   * Add AI button to ticket card
   */
  function addAIButton(ticketElement) {
    if (!isAvailable) return;
    if (ticketElement.querySelector('.btn-ai-ollama')) return;

    // Find button group or create one
    let buttonGroup = ticketElement.querySelector('.ticket-actions') || ticketElement.querySelector('.card-footer');
    
    if (!buttonGroup) {
      buttonGroup = document.createElement('div');
      buttonGroup.className = 'ticket-actions';
      ticketElement.appendChild(buttonGroup);
    }

    const aiBtn = document.createElement('button');
    aiBtn.className = 'btn btn-ai-ollama';
    aiBtn.innerHTML = '⏳ Analyzing...';
    aiBtn.title = 'Analysis in progress...';
    aiBtn.disabled = true;
    
    aiBtn.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const ticketKey = ticketElement.dataset.key || ticketElement.dataset.ticketKey;
      
      // Show cached analysis if available
      if (analysisCache[ticketKey] && analysisCache[ticketKey] !== 'analyzing') {
        displayAnalysis(analysisCache[ticketKey]);
      } else {
        // Still analyzing
        aiBtn.innerHTML = '⏳ Still analyzing...';
      }
    };

    buttonGroup.appendChild(aiBtn);
    console.log(`✅ AI button added to ${ticketElement.dataset.key || 'ticket'}`);
  }

  /**
   * Background analysis cache - stores results as they complete
   */
  const analysisCache = {};

  /**
   * Start all ticket analyses in background (no UI blocking)
   */
  function startBackgroundAnalyses(ticketElements) {
    ticketElements.forEach(ticketElement => {
      const ticketKey = ticketElement.dataset.key || ticketElement.dataset.ticketKey;
      if (!ticketKey || analysisCache[ticketKey]) return; // Skip if already analyzed
      
      // Mark as "in progress" but don't wait
      analysisCache[ticketKey] = 'analyzing';
      
      // Extract ticket data
      let ticketData = {
        key: ticketKey,
        summary: ticketElement.textContent || 'Unknown',
        description: '',
        status: 'Unknown',
        priority: 'Unknown',
        type: 'Unknown'
      };
      
      const summaryEl = ticketElement.querySelector('[data-field="summary"]') || ticketElement.querySelector('.ticket-summary');
      if (summaryEl) ticketData.summary = summaryEl.textContent;
      
      // Execute analysis in background (don't await)
      analyzeTicket(ticketData).then(result => {
        analysisCache[ticketKey] = result;
        
        // Update button to show "Ready" state and ENABLE IT
        const btn = ticketElement.querySelector('.btn-ai-ollama');
        if (btn) {
          btn.classList.add('analysis-ready');
          btn.innerHTML = '✅ View Analysis';
          btn.disabled = false;  // ENABLE THE BUTTON!
          btn.title = 'Click to view analysis';
        }
        
        console.log(`✅ Analysis complete for ${ticketKey}`);
      }).catch(error => {
        // Better error handling for timeout vs other errors
        let errorMsg = error.message;
        if (error.name === 'AbortError' || errorMsg.includes('abort')) {
          errorMsg = 'Analysis timeout (90s) - Model too slow';
        } else if (errorMsg.includes('Ollama not available')) {
          errorMsg = 'Ollama not available';
        }
        
        analysisCache[ticketKey] = { error: errorMsg };
        
        // Update button to show error state and ENABLE IT
        const btn = ticketElement.querySelector('.btn-ai-ollama');
        if (btn) {
          btn.classList.add('analysis-error');  // Add error styling
          btn.innerHTML = '⚠️ Timeout';  // Changed from ❌ Error
          btn.disabled = false;  // ENABLE SO USER CAN CLICK TO SEE ERROR
          btn.title = errorMsg;  // Show full error on hover
        }
        
        console.error(`❌ Analysis failed for ${ticketKey}: ${errorMsg}`);
      });
    });
  }

  /**
   * Inject buttons into all visible ticket cards
   */
  function injectButtons() {
    if (!isAvailable) return;

    // Multiple selectors to catch different ticket card formats
    const selectors = [
      '[data-key]',
      '[data-ticket-key]',
      '.ticket-card',
      '.issue-card',
      '.list-issue',
      '[data-issue-key]'
    ];

    let ticketsToAnalyze = [];
    let count = 0;
    
    selectors.forEach(selector => {
      const tickets = document.querySelectorAll(selector);
      tickets.forEach(ticket => {
        if (!ticket.querySelector('.btn-ai-ollama')) {
          addAIButton(ticket);
          ticketsToAnalyze.push(ticket);
          count++;
        }
      });
    });

    if (count > 0) {
      console.log(`✅ Injected ${count} AI buttons`);
      // Start background analysis for all new tickets
      setTimeout(() => startBackgroundAnalyses(ticketsToAnalyze), 100);
    }
  }

  /**
   * Setup automatic button injection when filters are applied
   */
  function setupTicketButtonInjection() {
    console.log('📌 Setting up ticket button injection...');

    // Hook into fetch to detect API calls
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      return originalFetch.apply(this, args).then(response => {
        // After any API call, try to inject buttons
        if (isAvailable) {
          // Wait a bit for DOM to update
          setTimeout(() => {
            console.log('🔍 Checking for tickets to add AI buttons...');
            injectButtons();
          }, 100);
        }
        return response;
      }).catch(error => {
        throw error;
      });
    };

    // Also try initial injection
    setTimeout(() => {
      console.log('🔍 Initial ticket search...');
      injectButtons();
    }, 500);
  }

  /**
   * Initialize AI buttons
   */
  function initializeAIButtons() {
    if (!isAvailable) return;
    injectButtons();
  }

  // Public API
  return {
    init,
    checkAvailability: () => isAvailable,
    isAvailable: () => isAvailable,
    analyzeTicket,
    findDuplicates,
    generateSummary,
    suggestResponse,
    displayAnalysis,
    closeAnalysis,
    addAIButton,
    initializeAIButtons,
    callOllama,
    injectButtons
  };
})();

// Make Ollama globally available
window.ollama = OllamaModule;

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => OllamaModule.init());
} else {
  OllamaModule.init();
}

export default OllamaModule;

