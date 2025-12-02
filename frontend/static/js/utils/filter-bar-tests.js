/**
 * SPEEDYFLOW - Filter Bar Testing Suite
 * Comprehensive testing for minimalist filter bar functionality
 */

class FilterBarTestSuite {
  constructor() {
    this.results = [];
    this.manager = null;
  }

  /**
   * Run comprehensive test suite
   */
  async runAllTests() {
    console.log('🧪 Starting Filter Bar Test Suite...');
    console.log('=====================================');
    
    // Wait for manager to be available
    await this.waitForManager();
    
    try {
      // Test 1: Basic toggle functionality
      await this.testBasicToggle();
      
      // Test 2: State persistence
      await this.testStatePersistence();
      
      // Test 3: Responsive behavior
      await this.testResponsiveBehavior();
      
      // Test 4: Filter state management
      await this.testFilterStates();
      
      // Test 5: Performance comparison
      await this.testPerformance();
      
      // Test 6: Visual consistency
      await this.testVisualConsistency();
      
      // Display results
      this.displayResults();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }
  }

  /**
   * Wait for minimalist filter manager to be available
   */
  async waitForManager() {
    return new Promise((resolve) => {
      const check = () => {
        if (window.minimalistFilterManager) {
          this.manager = window.minimalistFilterManager;
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }

  /**
   * Test 1: Basic Toggle Functionality
   */
  async testBasicToggle() {
    console.log('🔄 Test 1: Basic Toggle Functionality');
    
    const initialMode = this.manager.getCurrentMode();
    
    // Toggle mode
    this.manager.toggleMode();
    const afterToggle = this.manager.getCurrentMode();
    
    // Toggle back
    this.manager.toggleMode();
    const afterSecondToggle = this.manager.getCurrentMode();
    
    const passed = (
      initialMode.isMinimalist !== afterToggle.isMinimalist &&
      initialMode.isMinimalist === afterSecondToggle.isMinimalist
    );
    
    this.results.push({
      test: 'Basic Toggle',
      passed,
      details: `Initial: ${initialMode.mode}, After toggle: ${afterToggle.mode}, After return: ${afterSecondToggle.mode}`
    });
    
    console.log(passed ? '✅ PASS' : '❌ FAIL', '- Basic toggle functionality');
  }

  /**
   * Test 2: State Persistence
   */
  async testStatePersistence() {
    console.log('💾 Test 2: State Persistence');
    
    // Set to minimalist and check localStorage
    this.manager.setMode(true);
    const storedMinimalist = localStorage.getItem('filterMode') === 'minimalist';
    
    // Set to normal and check localStorage
    this.manager.setMode(false);
    const storedNormal = localStorage.getItem('filterMode') === 'normal';
    
    const passed = storedMinimalist && storedNormal;
    
    this.results.push({
      test: 'State Persistence',
      passed,
      details: `Minimalist stored: ${storedMinimalist}, Normal stored: ${storedNormal}`
    });
    
    console.log(passed ? '✅ PASS' : '❌ FAIL', '- State persistence');
  }

  /**
   * Test 3: Responsive Behavior
   */
  async testResponsiveBehavior() {
    console.log('📱 Test 3: Responsive Behavior');
    
    const filterBar = document.querySelector('.filter-bar-enhanced');
    
    if (!filterBar) {
      this.results.push({
        test: 'Responsive Behavior',
        passed: false,
        details: 'Filter bar not found'
      });
      return;
    }
    
    // Test minimalist mode classes
    this.manager.setMode(true);
    const hasMinimalistClass = filterBar.classList.contains('minimalist');
    
    // Test normal mode classes
    this.manager.setMode(false);
    const noMinimalistClass = !filterBar.classList.contains('minimalist');
    
    const passed = hasMinimalistClass && noMinimalistClass;
    
    this.results.push({
      test: 'Responsive Behavior',
      passed,
      details: `Minimalist class applied: ${hasMinimalistClass}, Normal class removed: ${noMinimalistClass}`
    });
    
    console.log(passed ? '✅ PASS' : '❌ FAIL', '- Responsive behavior');
  }

  /**
   * Test 4: Filter State Management
   */
  async testFilterStates() {
    console.log('🎛️ Test 4: Filter State Management');
    
    // Switch to minimalist mode
    this.manager.setMode(true);
    
    // Simulate filter selection
    const deskSelect = document.getElementById('serviceDeskSelectFilter');
    const queueSelect = document.getElementById('queueSelectFilter');
    
    let stateTestPassed = true;
    let details = 'Filter elements found: ';
    
    if (deskSelect) {
      // Add a test option
      const testOption = document.createElement('option');
      testOption.value = 'test-desk';
      testOption.textContent = 'Test Desk';
      deskSelect.appendChild(testOption);
      
      // Select it
      deskSelect.value = 'test-desk';
      deskSelect.dispatchEvent(new Event('change'));
      
      // Check if active state is applied
      const filterGroup = deskSelect.closest('.filter-group');
      const hasActiveState = filterGroup?.classList.contains('active');
      
      details += `Desk (${hasActiveState ? 'active' : 'inactive'})`;
      
      if (!hasActiveState) stateTestPassed = false;
      
      // Clean up
      deskSelect.removeChild(testOption);
    } else {
      details += 'Desk (not found)';
      stateTestPassed = false;
    }
    
    this.results.push({
      test: 'Filter State Management',
      passed: stateTestPassed,
      details
    });
    
    console.log(stateTestPassed ? '✅ PASS' : '❌ FAIL', '- Filter state management');
  }

  /**
   * Test 5: Performance Comparison
   */
  async testPerformance() {
    console.log('⚡ Test 5: Performance Comparison');
    
    const iterations = 20;
    const minimalistTimes = [];
    const normalTimes = [];
    
    // Test minimalist mode performance
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      this.manager.applyMode(true);
      const end = performance.now();
      minimalistTimes.push(end - start);
    }
    
    // Test normal mode performance
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      this.manager.applyMode(false);
      const end = performance.now();
      normalTimes.push(end - start);
    }
    
    const avgMinimalist = minimalistTimes.reduce((a, b) => a + b) / iterations;
    const avgNormal = normalTimes.reduce((a, b) => a + b) / iterations;
    const improvement = ((avgNormal - avgMinimalist) / avgNormal * 100);
    
    const passed = avgMinimalist <= avgNormal; // Minimalist should be faster or equal
    
    this.results.push({
      test: 'Performance Comparison',
      passed,
      details: `Minimalist: ${avgMinimalist.toFixed(2)}ms, Normal: ${avgNormal.toFixed(2)}ms, Improvement: ${improvement.toFixed(1)}%`
    });
    
    console.log(passed ? '✅ PASS' : '❌ FAIL', '- Performance comparison');
  }

  /**
   * Test 6: Visual Consistency
   */
  async testVisualConsistency() {
    console.log('🎨 Test 6: Visual Consistency');
    
    const filterBar = document.querySelector('.filter-bar-enhanced');
    
    if (!filterBar) {
      this.results.push({
        test: 'Visual Consistency',
        passed: false,
        details: 'Filter bar not found'
      });
      return;
    }
    
    // Test minimalist styling
    this.manager.setMode(true);
    const minimalistStyles = window.getComputedStyle(filterBar);
    const hasBackdropFilter = minimalistStyles.backdropFilter !== 'none';
    const hasBorderRadius = parseInt(minimalistStyles.borderRadius) >= 0;
    
    // Test toggle button presence
    const toggleButton = filterBar.querySelector('.filter-mode-toggle');
    const hasToggleButton = !!toggleButton;
    
    const passed = hasBackdropFilter && hasBorderRadius && hasToggleButton;
    
    this.results.push({
      test: 'Visual Consistency',
      passed,
      details: `Backdrop filter: ${hasBackdropFilter}, Border radius: ${hasBorderRadius}, Toggle button: ${hasToggleButton}`
    });
    
    console.log(passed ? '✅ PASS' : '❌ FAIL', '- Visual consistency');
  }

  /**
   * Display comprehensive test results
   */
  displayResults() {
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('=======================');
    
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const successRate = ((passedTests / totalTests) * 100).toFixed(1);
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} ✅`);
    console.log(`Failed: ${failedTests} ❌`);
    console.log(`Success Rate: ${successRate}%`);
    
    console.log('\nDETAILED RESULTS:');
    this.results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.test}: ${result.passed ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`   Details: ${result.details}`);
    });
    
    // Create visual report
    this.createVisualReport(successRate, passedTests, failedTests);
    
    console.log('\n🏁 Test suite completed!');
  }

  /**
   * Create visual test report in UI
   */
  createVisualReport(successRate, passed, failed) {
    // Create floating test report
    const report = document.createElement('div');
    report.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 12px;
      padding: 1rem;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      z-index: 9999;
      font-family: 'SF Pro Display', -apple-system, sans-serif;
      font-size: 14px;
      max-width: 300px;
    `;
    
    report.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <div style="font-size: 18px;">🧪</div>
        <div style="font-weight: 600;">Filter Bar Tests</div>
        <button onclick="this.parentElement.parentElement.remove()" style="
          margin-left: auto;
          background: none;
          border: none;
          font-size: 16px;
          cursor: pointer;
          opacity: 0.7;
        ">✕</button>
      </div>
      <div style="margin-bottom: 12px;">
        <div style="font-weight: 500; color: ${successRate >= 80 ? '#22c55e' : '#ef4444'};">
          Success Rate: ${successRate}%
        </div>
        <div style="font-size: 12px; color: #666;">
          ${passed} passed, ${failed} failed
        </div>
      </div>
      <div style="background: #f8f9fa; padding: 8px; border-radius: 6px; font-size: 12px;">
        <strong>Features Tested:</strong><br>
        • Toggle functionality<br>
        • State persistence<br>
        • Responsive design<br>
        • Filter states<br>
        • Performance<br>
        • Visual consistency
      </div>
    `;
    
    document.body.appendChild(report);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (report.parentElement) {
        report.remove();
      }
    }, 10000);
  }

  /**
   * Quick visual demo of the minimalist filter
   */
  async runVisualDemo() {
    console.log('🎬 Running visual demo...');
    
    await this.waitForManager();
    
    const originalMode = this.manager.getCurrentMode().isMinimalist;
    
    // Show normal mode
    this.manager.setMode(false);
    console.log('📋 Normal mode active');
    
    await this.delay(2000);
    
    // Show minimalist mode
    this.manager.setMode(true);
    console.log('🎯 Minimalist mode active');
    
    await this.delay(2000);
    
    // Return to original
    this.manager.setMode(originalMode);
    console.log('🔄 Returned to original mode');
    
    console.log('✅ Visual demo completed');
  }

  /**
   * Utility: delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Make available globally for console testing
window.FilterBarTestSuite = FilterBarTestSuite;

// Auto-run tests if in development mode
if (localStorage.getItem('devMode') === 'true') {
  document.addEventListener('DOMContentLoaded', async () => {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for everything to load
    const testSuite = new FilterBarTestSuite();
    await testSuite.runAllTests();
  });
}

console.log('🧪 Filter Bar Test Suite loaded. Run tests with:');
console.log('   const tests = new FilterBarTestSuite();');
console.log('   tests.runAllTests();');
console.log('   tests.runVisualDemo();');