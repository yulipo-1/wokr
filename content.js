(() => {
  'use strict';

  if (window.smartBookSolverInjected) return;
  window.smartBookSolverInjected = true;

  // Global error handler
  window.addEventListener('error', (event) => {
    if (event.message.includes('SmartBook')) {
      console.error('[SmartBook Solver] Global error caught:', event.error);
    }
  });

  class SmartBookSolver {
    constructor() {
      this.isProcessing = false;
      this.autoMode = false;
      this.shadow = null;
      this.host = null;
      this.observer = null;
      this.currentQuestionIndex = 0;
      this.processedQuestions = new Set();
      
      this.config = {
        apiTimeout: 45000,
        autoClickDelay: 1500,
        nextButtonDelay: 2000,
        maxRetries: 2
      };

      this.selectors = {
        questions: [
          '[data-testid*="question"]',
          '[class*="question-content"]',
          '[class*="prompt-container"]',
          '.stem',
          '.question-text',
          '[data-mh*="question"]',
          '[id*="question"]'
        ],
        options: [
          'input[type="radio"]',
          'input[type="checkbox"]',
          '[role="radio"]',
          '[role="checkbox"]',
          '.answer-option',
          '.choice',
          '[class*="option"]'
        ],
        nextButtons: [
          'button:contains("Next")',
          'button:contains("Continue")',
          'button:contains("Submit")',
          'button:contains("Check Answer")',
          'button:contains("Save")',
          '[data-testid*="next"]',
          '[data-testid*="submit"]',
          '.next-button',
          '.submit-button',
          'button.primary',
          'button.btn-primary'
        ],
        text: [
          'p', 'span', 'div', 'label', 'h1', 'h2', 'h3', 'h4'
        ]
      };
    }

    init() {
      try {
        console.log('[SmartBook Solver] Starting initialization...');
        this.injectUI();
        console.log('[SmartBook Solver] UI injected successfully');
        this.setupMutationObserver();
        console.log('[SmartBook Solver] Mutation observer set up');
        console.log('[SmartBook Solver] ✓ Initialization complete');
      } catch (err) {
        console.error('[SmartBook Solver] Fatal error during init:', err);
        console.error(err.stack);
      }
    }

    injectUI() {
      try {
        this.host = document.createElement('div');
        this.host.id = 'smartbook-solver-host';
        document.body.appendChild(this.host);

        this.shadow = this.host.attachShadow({ mode: 'open' });

        const style = document.createElement('style');
      style.textContent = `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        .solver-panel {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 340px;
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.25);
          z-index: 2147483647;
          border: 3px solid #4285f4;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          transition: transform 0.3s ease;
        }
        
        .solver-panel.dragging { cursor: move; }
        
        .solver-header {
          background: linear-gradient(135deg, #4285f4, #34a853);
          color: white;
          padding: 14px 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: move;
        }
        
        .solver-title { font-weight: 700; font-size: 15px; }
        
        .header-controls { display: flex; gap: 8px; }
        
        .control-btn {
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
          pointer-events: auto;
        }
        
        .control-btn:hover { background: rgba(255,255,255,0.3); }
        
        .solver-body { padding: 18px; }
        
        .form-group { margin-bottom: 14px; }
        
        .form-group label {
          display: block;
          font-size: 11px;
          font-weight: 700;
          color: #5f6368;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        select, .toggle-switch {
          width: 100%;
          padding: 10px 14px;
          border: 2px solid #dadce0;
          border-radius: 8px;
          font-size: 13px;
          background: white;
          cursor: pointer;
          outline: none;
          pointer-events: auto;
        }
        
        select:focus { border-color: #4285f4; }
        
        .toggle-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        
        .switch {
          position: relative;
          display: inline-block;
          width: 50px;
          height: 24px;
        }
        
        .switch input { opacity: 0; width: 0; height: 0; pointer-events: auto; }
        
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: #ccc;
          transition: .4s;
          border-radius: 24px;
          pointer-events: auto;
        }
        
        .slider:before {
          position: absolute;
          content: "";
          height: 16px;
          width: 16px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
        }
        
        input:checked + .slider { background-color: #4285f4; }
        input:checked + .slider:before { transform: translateX(26px); }
        
        .solve-btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #4285f4, #1a73e8);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
          box-shadow: 0 2px 8px rgba(66,133,244,0.3);
          pointer-events: auto;
        }
        
        .solve-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(66,133,244,0.4);
        }
        
        .solve-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        
        .spinner {
          width: 18px;
          height: 18px;
          border: 3px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin { to { transform: rotate(360deg); } }
        
        .status-panel {
          margin-top: 12px;
          padding: 12px;
          border-radius: 8px;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .status-panel.processing { background: #e3f2fd; color: #1565c0; }
        .status-panel.success { background: #e8f5e9; color: #2e7d32; }
        .status-panel.error { background: #ffebee; color: #c62828; }
        
        .status-icon { font-size: 16px; }
        
        .results-panel {
          margin-top: 12px;
          max-height: 250px;
          overflow-y: auto;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 12px;
          background: #fafafa;
        }
        
        .result-item {
          padding: 10px;
          margin-bottom: 8px;
          background: white;
          border-radius: 6px;
          border-left: 4px solid #34a853;
          font-size: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .result-item.multiple { border-left-color: #ff9800; }
        .result-item.error { border-left-color: #f44336; }
        
        .result-label {
          font-weight: 700;
          color: #4285f4;
          margin-bottom: 4px;
          display: block;
        }
        
        .hidden { display: none !important; }
        
        .floating-btn {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, #4285f4, #34a853);
          color: white;
          border: none;
          font-size: 28px;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(0,0,0,0.3);
          z-index: 2147483646;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s;
          pointer-events: auto;
        }
        
        .floating-btn:hover { transform: scale(1.1); }
      `;

      const html = `
        <div class="solver-panel" id="panel">
          <div class="solver-header" id="header">
            <span class="solver-title">🎓 SmartBook AI Pro</span>
            <div class="header-controls">
              <button class="control-btn" id="minimize-btn" title="Minimize">−</button>
            </div>
          </div>
          
          <div class="solver-body">
            <div class="form-group">
              <label>AI Model</label>
              <select id="model-select">
                <option value="stepfun/step-3.5-flash">StepFun 3.5 Flash (Free) ⭐</option>
                <option value="qwen/qwen-2.5-72b-instruct">Qwen 2.5 72B (Free, High Accuracy)</option>
                <option value="meta-llama/llama-3.1-8b-instruct">Llama 3.1 8B (Free)</option>
                <option value="meta-llama/llama-3.1-70b-instruct">Llama 3.1 70B (Free)</option>
                <option value="mistralai/mistral-7b-instruct:free">Mistral 7B (Free)</option>
                <option value="qwen/qwen-2.5-7b-instruct">Qwen 2.5 7B (Free)</option>
                <option value="lynn/soliloquy-7b">Soliloquy 7B (Free)</option>
                <option value="google/gemini-flash-1.5">Gemini Flash 1.5</option>
                <option value="openai/gpt-4o-mini">GPT-4o Mini</option>
                <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</option>
              </select>
            </div>
            
            <div class="toggle-row">
              <label>Auto-Continue (Auto-next question)</label>
              <label class="switch">
                <input type="checkbox" id="auto-toggle">
                <span class="slider"></span>
              </label>
            </div>
            
            <button class="solve-btn" id="solve-btn">
              <span class="btn-text">🚀 Solve & Auto-Continue</span>
              <div class="spinner hidden" id="btn-spinner"></div>
            </button>
            
            <div id="status-panel" class="status-panel hidden">
              <span class="status-icon" id="status-icon">⏳</span>
              <span id="status-text">Ready</span>
            </div>
            
            <div id="results-panel" class="results-panel hidden">
              <div id="results-list"></div>
            </div>
          </div>
        </div>
        
        <button class="floating-btn hidden" id="restore-btn" title="Open SmartBook Solver">🎓</button>
      `;

      const container = document.createElement('div');
      container.innerHTML = html;
      
      this.shadow.appendChild(style);
      this.shadow.appendChild(container);

      this.attachEventListeners();
      this.loadSettings();
      this.makeDraggable();
      } catch (err) {
        console.error('[SmartBook Solver] Error in injectUI:', err);
        console.error(err.stack);
      }
    }

    attachEventListeners() {
      try {
        const solveBtn = this.shadow.querySelector('#solve-btn');
        const minimizeBtn = this.shadow.querySelector('#minimize-btn');
        const restoreBtn = this.shadow.querySelector('#restore-btn');
        const autoToggle = this.shadow.querySelector('#auto-toggle');
        const modelSelect = this.shadow.querySelector('#model-select');
        const panel = this.shadow.querySelector('#panel');

        if (!solveBtn || !minimizeBtn || !restoreBtn || !autoToggle || !modelSelect || !panel) {
          console.error('[SmartBook Solver] UI elements not found');
          console.error('solveBtn:', !!solveBtn, 'minimizeBtn:', !!minimizeBtn, 'restoreBtn:', !!restoreBtn);
          return;
        }

        const self = this;

        solveBtn.addEventListener('click', (e) => {
          try {
            e.preventDefault();
            e.stopPropagation();
            console.log('[SmartBook Solver] Solve button clicked');
            const model = modelSelect.value;
            self.handleSolve(model);
          } catch (err) {
            console.error('[SmartBook Solver] Error in solve click handler:', err);
          }
        });

        minimizeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          panel.classList.add('hidden');
          restoreBtn.classList.remove('hidden');
        });

        restoreBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          panel.classList.remove('hidden');
          restoreBtn.classList.add('hidden');
        });

        autoToggle.addEventListener('change', (e) => {
          e.stopPropagation();
          this.autoMode = e.target.checked;
          chrome.storage.local.set({ autoMode: this.autoMode });
        });

        modelSelect.addEventListener('change', (e) => {
          e.stopPropagation();
          chrome.storage.local.set({ preferredModel: e.target.value });
        });

        console.log('[SmartBook Solver] ✓ All event listeners attached');
      } catch (err) {
        console.error('[SmartBook Solver] Error attaching event listeners:', err);
      }
    }

    loadSettings() {
      chrome.storage.local.get(['preferredModel', 'autoMode'], (result) => {
        const modelSelect = this.shadow.querySelector('#model-select');
        const autoToggle = this.shadow.querySelector('#auto-toggle');
        
        if (modelSelect && result.preferredModel) {
          modelSelect.value = result.preferredModel;
        }
        if (autoToggle && result.autoMode) {
          this.autoMode = result.autoMode;
          autoToggle.checked = true;
        }
      });
    }

    makeDraggable() {
      const header = this.shadow.querySelector('#header');
      const panel = this.shadow.querySelector('#panel');
      let isDragging = false;
      let currentX = 0;
      let currentY = 0;
      let initialX = 0;
      let initialY = 0;
      let xOffset = 0;
      let yOffset = 0;

      if (!header || !panel) return;

      header.addEventListener('mousedown', (e) => {
        // Don't drag if clicking a button
        if (e.target.tagName === 'BUTTON') return;
        
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;
        isDragging = true;
        panel.classList.add('dragging');
      });

      document.addEventListener('mousemove', (e) => {
        if (isDragging) {
          currentX = e.clientX - initialX;
          currentY = e.clientY - initialY;
          xOffset = currentX;
          yOffset = currentY;

          panel.style.transform = `translate(${currentX}px, ${currentY}px)`;
        }
      });

      document.addEventListener('mouseup', () => {
        isDragging = false;
        panel.classList.remove('dragging');
      });
    }

    updateStatus(type, message) {
      const panel = this.shadow.querySelector('#status-panel');
      const text = this.shadow.querySelector('#status-text');
      const icon = this.shadow.querySelector('#status-icon');
      const solveBtn = this.shadow.querySelector('#solve-btn');
      const spinner = this.shadow.querySelector('#btn-spinner');
      const btnText = this.shadow.querySelector('.btn-text');

      if (!panel || !text || !icon || !solveBtn || !spinner || !btnText) {
        console.error('[SmartBook Solver] Status elements not found');
        return;
      }

      panel.classList.remove('hidden', 'processing', 'success', 'error');
      panel.classList.add(type);
      text.textContent = message;

      if (type === 'processing') {
        solveBtn.disabled = true;
        spinner.classList.remove('hidden');
        btnText.textContent = 'Solving...';
        icon.textContent = '⏳';
      } else {
        solveBtn.disabled = false;
        spinner.classList.add('hidden');
        btnText.textContent = this.autoMode ? '🚀 Auto-Solving...' : '🚀 Solve & Auto-Continue';
        icon.textContent = type === 'success' ? '✓' : '✗';
      }
    }

    async handleSolve(model) {
      if (this.isProcessing) return;
      this.isProcessing = true;

      try {
        this.updateStatus('processing', 'Reading page content...');
        
        // Get API key from storage
        const apiKey = await this.getApiKey();
        if (!apiKey) throw new Error('API key not set - check popup');

        const content = this.extractContent();
        if (content.questions.length === 0) throw new Error('No questions found');

        this.updateStatus('processing', 'Sending to AI...');
        const response = await this.sendToAPI(content, model, apiKey);
        
        this.updateStatus('processing', 'Applying answers...');
        const results = await this.applyAnswers(response.answers);
        this.showResults(results);

        if (response.answers && response.answers.length > 0) {
          const successCount = results.filter(r => r.success).length;
          this.updateStatus('success', `Solved ${successCount}/${results.length} questions`);
          
          await this.clickConfidenceAndSubmit();
          
          if (this.autoMode) {
            await new Promise(r => setTimeout(r, 1000));
            await this.moveToNextQuestion(model);
          } else {
            this.isProcessing = false;
          }
        } else {
          this.updateStatus('error', 'No answers from AI');
          this.isProcessing = false;
        }
        
      } catch (error) {
        console.error('[SmartBook Solver] handleSolve error:', error);
        this.updateStatus('error', error.message);
        this.isProcessing = false;
      }
    }

    getApiKey() {
      return new Promise((resolve, reject) => {
        chrome.storage.local.get('openRouterKey', (result) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
            return;
          }
          resolve(result.openRouterKey || null);
        });
      });
    }

    async moveToNextQuestion(model) {
      try {
        this.updateStatus('processing', 'Moving to next question...');
        
        // Find and click the next button
        const nextBtn = this.findNextButton();
        if (nextBtn) {
          nextBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await new Promise(r => setTimeout(r, 300));

          this.simulateClick(nextBtn);
          
          console.log('[SmartBook Solver] Clicked next button');
          
          // Wait for page to transition and new content to load
          await new Promise(r => setTimeout(r, 2500));
          
          // Verify new question loaded
          const newContent = this.extractContent();
          if (newContent.questions.length > 0 || newContent.rawText) {
            console.log('[SmartBook Solver] New question detected, solving...');
            // Reset processing flag and solve the new question
            this.isProcessing = false;
            await new Promise(r => setTimeout(r, 500));
            await this.handleSolve(model);
          } else {
            throw new Error('Could not load new question');
          }
        } else {
          this.updateStatus('success', 'Done! No next button found.');
          this.isProcessing = false;
        }
      } catch (err) {
        console.error('[SmartBook Solver] Error moving to next question:', err);
        this.updateStatus('error', `Auto-continue failed: ${err.message}. Click manually to continue.`);
        this.isProcessing = false;
      }
    }

    isElementClickable(el) {
      if (!el) return false;
      if (el.disabled || el.getAttribute('aria-disabled') === 'true') return false;

      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.pointerEvents === 'none') return false;

      const rect = el.getBoundingClientRect();
      if (rect.width < 8 || rect.height < 8) return false;

      return !(el.offsetParent === null && style.position !== 'fixed');
    }

    findNextButton() {
      const candidates = document.querySelectorAll('button, a, [role="button"], [aria-label], [title]');
      const nextKeywords = ['next', 'continue', 'proceed'];
      const blockedKeywords = ['save & exit', 'save and exit', 'exit now', 'exit', 'quit', 'help', 'reference', 'reading'];
      const scored = [];

      for (const el of candidates) {
        if (!this.isElementClickable(el)) continue;

        const text = this.cleanText(`${el.textContent || ''} ${el.getAttribute('aria-label') || ''} ${el.getAttribute('title') || ''}`).toLowerCase();
        if (!text) continue;
        if (blockedKeywords.some(keyword => text.includes(keyword))) continue;
        if (!nextKeywords.some(keyword => text.includes(keyword))) continue;

        const rect = el.getBoundingClientRect();
        let score = 0;

        if (text === 'next' || text.startsWith('next ')) score += 12;
        if (text.includes('next')) score += 8;
        if (text.includes('continue')) score += 6;
        if (text.includes('proceed')) score += 5;

        if (rect.top > window.innerHeight * 0.55) score += 7;
        if (rect.top > window.innerHeight * 0.75) score += 4;
        if (el.closest('nav, [class*="pagination"], [class*="pager"], [class*="footer"], [class*="bottom"]')) score += 6;

        scored.push({ el, score, text });
      }

      scored.sort((a, b) => b.score - a.score);
      if (scored.length > 0) {
        console.log('[SmartBook Solver] Selected next control:', scored[0].text, 'score:', scored[0].score);
        return scored[0].el;
      }

      return null;
    }

    extractContent() {
      const content = {
        url: window.location.href,
        title: document.title,
        questions: [],
        rawText: ''
      };

      // Strategy 1: Look for structured question containers
      const questionElements = document.querySelectorAll([
        '[data-testid*="question"]',
        '[class*="question-container"]',
        '.question',
        '[data-mh-question]',
        '.stem-container',
        '.prompt'
      ].join(', '));

      questionElements.forEach((el, idx) => {
        const text = this.cleanText(el.textContent);
        if (text && text.length > 20) {
          const options = this.findOptionsForElement(el);
          content.questions.push({
            index: idx,
            text: text.substring(0, 800),
            options: options,
            isMultiple: this.isMultipleChoice(options.elements)
          });
        }
      });

      // Strategy 2: If no structured questions, grab all inputs
      if (content.questions.length === 0) {
        const allInputs = document.querySelectorAll('input[type="radio"], input[type="checkbox"]');
        if (allInputs.length > 0) {
          const parent = this.findCommonParent(Array.from(allInputs));
          if (parent) {
            content.questions.push({
              index: 0,
              text: this.cleanText(parent.textContent).substring(0, 1000),
              options: this.extractOptionsFromInputs(allInputs),
              isMultiple: Array.from(allInputs).some(i => i.type === 'checkbox')
            });
          }
        }
      }

      return content;
    }

    findOptionsForElement(element) {
      const options = [];
      const elements = [];
      let parent = element;
      
      // Go up 3 levels looking for options
      for (let i = 0; i < 4; i++) {
        if (!parent) break;
        
        const inputs = parent.querySelectorAll('input[type="radio"], input[type="checkbox"], [role="radio"], [role="checkbox"]');
        
        if (inputs.length > 1) {
          inputs.forEach((input, idx) => {
            const label = this.findLabelForInput(input);
            const text = label ? this.cleanText(label) : `Option ${idx + 1}`;
            if (!options.some(o => o.text === text)) {
              options.push({ text: text.substring(0, 300), index: idx });
              elements.push(input);
            }
          });
          break;
        }
        parent = parent.parentElement;
      }

      return { texts: options.map(o => o.text), elements, objects: options };
    }

    isMultipleChoice(elements) {
      if (!elements || elements.length === 0) return false;
      return elements.some(el => el.type === 'checkbox' || el.getAttribute('role') === 'checkbox');
    }

    extractOptionsFromInputs(inputs) {
      return Array.from(inputs).map((input, idx) => {
        const label = this.findLabelForInput(input);
        return {
          text: label ? this.cleanText(label).substring(0, 300) : `Option ${idx + 1}`,
          index: idx,
          type: input.type
        };
      });
    }

    findLabelForInput(input) {
      // Method 1: By for attribute
      const id = input.id;
      if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label) return label.textContent;
      }
      
      // Method 2: Parent label
      let parent = input.parentElement;
      for (let i = 0; i < 3; i++) {
        if (!parent) break;
        if (parent.tagName === 'LABEL') return parent.textContent;
        parent = parent.parentElement;
      }

      // Method 3: Next sibling or text node
      const parentText = input.parentElement.textContent.replace(input.value, '');
      if (parentText.length > 5) return parentText;

      // Method 4: Aria label
      return input.getAttribute('aria-label') || input.value;
    }

    findCommonParent(elements) {
      if (elements.length === 0) return null;
      let parent = elements[0].parentElement;
      while (parent) {
        if (elements.every(el => parent.contains(el) || el === parent)) {
          return parent;
        }
        parent = parent.parentElement;
      }
      return document.body;
    }

    cleanText(text) {
      if (!text) return '';
      return text.replace(/\s+/g, ' ').trim();
    }

    async sendToAPI(content, model, apiKey) {
      console.log('[SmartBook Solver] sendToAPI called with:', {
        hasApiKey: !!apiKey,
        apiKeyStart: apiKey ? apiKey.substring(0, 15) : 'none',
        apiKeyValid: apiKey && apiKey.startsWith('sk-or-v1-'),
        model: model,
        contentQuestions: content.questions.length
      });
      
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            action: 'solveQuestions',
            data: { content, model, apiKey }
          },
          (response) => {
            console.log('[SmartBook Solver] Background response:', response);
            if (chrome.runtime.lastError) {
              console.error('[SmartBook Solver] Runtime error:', chrome.runtime.lastError);
              reject(new Error(`Runtime error: ${chrome.runtime.lastError.message}`));
              return;
            }
            
            if (!response) {
              console.error('[SmartBook Solver] No response from background');
              reject(new Error('No response from background script'));
              return;
            }
            
            if (response.error) {
              console.error('[SmartBook Solver] Backend error:', response.error);
              reject(new Error(response.error));
              return;
            }
            
            resolve(response);
          }
        );
      });
    }

    constructPrompt(content) {
      let prompt = `Analyze this McGraw Hill SmartBook question and identify the correct answer(s).\n\n`;
      
      content.questions.forEach((q, idx) => {
        prompt += `QUESTION ${idx + 1}:\n${q.text}\n\n`;
        
        if (q.options.texts && q.options.texts.length > 0) {
          prompt += `OPTIONS:\n`;
          q.options.texts.forEach((opt, i) => {
            prompt += `${String.fromCharCode(65 + i)}. ${opt}\n`;
          });
          prompt += `\n`;
        }
        
        prompt += `QUESTION TYPE: ${q.isMultiple ? 'MULTIPLE SELECT (Choose ALL correct answers)' : 'SINGLE SELECT (Choose ONE)'}\n\n`;
      });

      prompt += `Respond with this exact JSON structure:
{
  "answers": [
    {
      "question_index": 0,
      "correct_indices": [0],
      "correct_letters": ["A"],
      "explanation": "brief reason",
      "is_multiple": false
    }
  ]
}

If multiple answers are correct, include ALL indices in the correct_indices array.`;

      return prompt;
    }

    parseAIResponse(data) {
      try {
        const content = data.choices[0].message.content;
        const parsed = JSON.parse(content);
        return { answers: parsed.answers || [] };
      } catch (e) {
        console.error('Parse error:', e, data);
        throw new Error('Failed to parse AI response');
      }
    }

    async applyAnswers(answers) {
      // Wait for page to stabilize before attempting to click
      await new Promise(r => setTimeout(r, 500));
      
      const results = [];
      
      for (const answer of answers) {
        const result = {
          success: false,
          question: answer.question_index || 0,
          selected: [],
          error: null
        };

        try {
          if (!answer.correct_indices || answer.correct_indices.length === 0) {
            if (answer.correct_letters && answer.correct_letters.length > 0) {
              // Convert letters to indices
              answer.correct_indices = answer.correct_letters.map(l => 
                l.charCodeAt(0) - 65
              );
            } else {
              result.error = 'No answer provided by AI';
              results.push(result);
              continue;
            }
          }

          // Find the current question container to scope inputs to just this question
          let questionContainer = null;
          
          // Try multiple selector strategies to find the question container
          const containerSelectors = [
            '.mcb-question',
            '.pii-question', 
            '.question-prompt',
            '.prompt-container',
            '.question-content',
            '[data-testid*="question"]',
            '.question-item',
            '.quest-container'
          ];
          
          for (const selector of containerSelectors) {
            const found = document.querySelector(selector);
            if (found && found.querySelectorAll('input[type="radio"], input[type="checkbox"]').length > 0) {
              questionContainer = found;
              console.log(`[SmartBook Solver] Found question container with selector: ${selector}`);
              break;
            }
          }
          
          // If we found a container, get inputs only from within it; otherwise use all page inputs
          const inputSelector = questionContainer || document;
          
          const allInputs = Array.from(inputSelector.querySelectorAll('input[type="radio"], input[type="checkbox"]'))
            .filter(input => {
              // Skip disabled inputs
              if (input.disabled) return false;
              
              // Check visibility using computed styles
              const style = window.getComputedStyle(input);
              if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                return false;
              }
              
              // Must have non-zero dimensions
              if (input.offsetWidth === 0 || input.offsetHeight === 0) {
                return false;
              }
              
              // Must be in viewport or near it
              const rect = input.getBoundingClientRect();
              if (rect.bottom < -100 || rect.top > window.innerHeight + 100) {
                return false;
              }
              
              return true;
            });

          console.log(`[SmartBook Solver] Found ${allInputs.length} visible inputs in ${questionContainer ? 'question container' : 'entire page'}`);
          allInputs.forEach((input, i) => {
            const label = input.parentElement?.textContent?.substring(0, 50) || 'unknown';
            console.log(`[SmartBook Solver]   Input ${i}: type=${input.type}, name=${input.name}, label=${label}`);
          });
          console.log(`[SmartBook Solver] Need to select indices: [${answer.correct_indices.join(', ')}]`);
          
          const targetInputs = [];

          // Find inputs matching the indices
          answer.correct_indices.forEach(idx => {
            if (allInputs[idx]) {
              targetInputs.push(allInputs[idx]);
              console.log(`[SmartBook Solver] Target index ${idx} found, input type: ${allInputs[idx].type}`);
            }
          });

          if (targetInputs.length === 0) {
            result.error = `Could not find inputs at indices: ${answer.correct_indices}`;
            results.push(result);
            continue;
          }

          console.log(`[SmartBook Solver] Clicking ${targetInputs.length} target inputs for question ${answer.question_index}`);

          // Click all targets - with extensive delays for multi-select to ensure all register
          for (let i = 0; i < targetInputs.length; i++) {
            const input = targetInputs[i];
            
            // Check if already checked
            if (input.checked) {
              console.log(`[SmartBook Solver] Input ${i} already checked, skipping`);
              result.selected.push(input.value || input.id || `option-${i}`);
              continue;
            }
            
            console.log(`[SmartBook Solver] Clicking input ${i} of ${targetInputs.length}`);
            this.simulateClick(input);
            
            // Verify it got checked - wait longer
            await new Promise(r => setTimeout(r, 600));
            
            if (!input.checked) {
              // Try again if first click didn't work
              console.log(`[SmartBook Solver] First click didn't register, retrying (attempt 2)...`);
              this.simulateClick(input);
              await new Promise(r => setTimeout(r, 600));
            }
            
            if (!input.checked) {
              // Third attempt - most aggressive
              console.log(`[SmartBook Solver] Second click didn't register, aggressive retry (attempt 3)...`);
              input.checked = true;
              input.dispatchEvent(new Event('change', { bubbles: true }));
              input.dispatchEvent(new Event('input', { bubbles: true }));
              await new Promise(r => setTimeout(r, 400));
            }
            
            if (input.checked) {
              result.selected.push(input.value || input.id || `option-${i}`);
              console.log(`[SmartBook Solver] Successfully selected option ${i}`);
            } else {
              console.log(`[SmartBook Solver] Failed to select option ${i} after 3 attempts`);
            }
            
            // Much longer delay between multiple selections
            if (targetInputs.length > 1 && i < targetInputs.length - 1) {
              await new Promise(r => setTimeout(r, 1000));
            }
          }

          result.success = result.selected.length > 0;
          if (result.success) {
            this.highlightElements(targetInputs);
            // Long wait for all clicks to register before submitting
            await new Promise(r => setTimeout(r, 2000));
          }

        } catch (err) {
          result.error = err.message;
          console.error('[SmartBook Solver] Error applying answers:', err);
        }
        
        results.push(result);
      }

      return results;
    }

    simulateClick(element) {
      // Ensure element is visible and clickable
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Focus the element first
      element.focus();
      
      // Force the element to be checked BEFORE events (for stubborn inputs)
      if (element.type === 'radio' || element.type === 'checkbox') {
        element.checked = true;
      }
      
      // Dispatch multiple events in sequence to ensure full registration
      const events = [
        new MouseEvent('mouseover', { bubbles: true, cancelable: true, composed: true }),
        new MouseEvent('mousedown', { bubbles: true, cancelable: true, composed: true }),
        new FocusEvent('focus', { bubbles: true, cancelable: true, composed: true }),
        new MouseEvent('mouseup', { bubbles: true, cancelable: true, composed: true }),
        new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }),
        new Event('change', { bubbles: true, cancelable: true, composed: true }),
        new Event('input', { bubbles: true, cancelable: true, composed: true }),
        new Event('click', { bubbles: true }),
      ];
      
      events.forEach(event => {
        try {
          element.dispatchEvent(event);
        } catch (e) {
          console.warn('[SmartBook Solver] Could not dispatch event:', e);
        }
      });
      
      // Force the element to be checked AGAIN after events
      if (element.type === 'radio' || element.type === 'checkbox') {
        element.checked = true;
        // Trigger on change handlers if they exist
        if (element.onchange) element.onchange({ target: element });
      }
      
      // Try native click method
      try {
        element.click();
      } catch (e) {
        console.warn('[SmartBook Solver] Native click failed:', e);
      }
      
      // Try clicking the parent label if it exists
      let parent = element.parentElement;
      for (let i = 0; i < 5; i++) {
        if (!parent) break;
        
        if (parent.tagName === 'LABEL') {
          console.log('[SmartBook Solver] Clicking parent LABEL');
          try {
            parent.click();
          } catch (e) {
            console.warn('[SmartBook Solver] Label click failed:', e);
          }
        }
        
        // Also try clicking the parent div if it looks clickable
        if (parent.tagName === 'DIV' && parent.classList.contains('form-check')) {
          console.log('[SmartBook Solver] Clicking parent DIV.form-check');
          try {
            parent.click();
          } catch (e) {
            console.warn('[SmartBook Solver] DIV click failed:', e);
          }
        }
        
        parent = parent.parentElement;
      }
    }

    highlightElements(elements) {
      elements.forEach((el, i) => {
        setTimeout(() => {
          const original = el.style.cssText;
          el.style.cssText = 'outline: 3px solid #34a853 !important; background: rgba(52, 168, 83, 0.2) !important; box-shadow: 0 0 20px #34a853 !important; transform: scale(1.05); transition: all 0.3s;';
          
          setTimeout(() => {
            el.style.cssText = original;
          }, 2000);
        }, i * 100);
      });
    }

    async clickConfidenceAndSubmit() {
      try {
        // Wait longer for confidence buttons to appear and page to stabilize
        await new Promise(r => setTimeout(r, 1500));
        
        // Find and click High confidence button
        const buttons = document.querySelectorAll('button');
        let highBtn = null;
        
        for (const btn of buttons) {
          if (btn.textContent.toLowerCase().includes('high')) {
            highBtn = btn;
            break;
          }
        }
        
        // Alternative: Look for confidence buttons by other patterns
        if (!highBtn) {
          const allElements = document.querySelectorAll('[role="button"], button, [class*="confidence"]');
          for (const el of allElements) {
            if (el.textContent.toLowerCase() === 'high' || el.getAttribute('aria-label')?.toLowerCase().includes('high')) {
              highBtn = el;
              break;
            }
          }
        }
        
        // Click High confidence
        if (highBtn) {
          highBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await new Promise(r => setTimeout(r, 500));
          
          const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
          highBtn.dispatchEvent(clickEvent);
          highBtn.click();
          
          console.log('[SmartBook Solver] Clicked High confidence button');
          await new Promise(r => setTimeout(r, 800));
        }
        
        // Find and click Submit/Check Answer button
        const submitBtn = this.findSubmitButton();
        if (submitBtn) {
          submitBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await new Promise(r => setTimeout(r, 500));
          
          const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
          submitBtn.dispatchEvent(clickEvent);
          submitBtn.click();
          
          console.log('[SmartBook Solver] Clicked Submit button');
        }
        
      } catch (err) {
        console.error('[SmartBook Solver] Error clicking confidence:', err);
      }
    }

    findSubmitButton() {
      const buttons = document.querySelectorAll('button, [role="button"], a');
      // Only look for explicit submission keywords - NO fallback to primary/action buttons
      // This prevents accidentally clicking "Reading", "Help", or other non-submission buttons
      const submitKeywords = ['submit', 'check answer', 'check'];
      const blockedKeywords = ['save & exit', 'save and exit', 'exit now', 'exit', 'quit'];
      
      for (const btn of buttons) {
        const text = this.cleanText(`${btn.textContent || ''} ${btn.getAttribute('aria-label') || ''} ${btn.getAttribute('title') || ''}`).toLowerCase();
        
        // Skip if disabled or hidden
        if (!this.isElementClickable(btn)) continue;
        
        // Skip reading, help, and reference buttons
        if (text.includes('reading') || text.includes('help') || text.includes('reference')) continue;
        if (blockedKeywords.some(keyword => text.includes(keyword))) continue;
        
        // Must match one of the submit keywords
        if (submitKeywords.some(keyword => text.includes(keyword))) {
          console.log('[SmartBook Solver] Found submit button:', text);
          return btn;
        }
      }
      
      console.log('[SmartBook Solver] No submit button found');
      return null;
    }

    showResults(results) {
      const panel = this.shadow.querySelector('#results-panel');
      const list = this.shadow.querySelector('#results-list');
      
      if (!panel || !list) return;
      
      list.innerHTML = results.map((r, i) => `
        <div class="result-item ${r.selected.length > 1 ? 'multiple' : ''} ${r.success ? '' : 'error'}">
          <span class="result-label">Q${r.question + 1}</span>
          ${r.success 
            ? `✓ Selected: ${r.selected.length} answer(s)` 
            : `✗ ${r.error || 'Failed to select'}`}
        </div>
      `).join('');
      
      panel.classList.remove('hidden');
    }

    setupMutationObserver() {
      // Watch for URL changes (SPA navigation)
      let lastUrl = location.href;
      new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl && this.autoMode && !this.isProcessing) {
          lastUrl = url;
          setTimeout(() => {
            const model = this.shadow.getElementById('model-select').value;
            this.handleSolve(model);
          }, 3000);
        }
      }).observe(document, { subtree: true, childList: true });
    }
  }

  // Initialize
  setTimeout(() => {
    try {
      console.log('[SmartBook Solver] ⏳ Bootstrap starting...');
      const solver = new SmartBookSolver();
      console.log('[SmartBook Solver] Instance created');
      solver.init();
      console.log('[SmartBook Solver] ✓ Bootstrap complete');
    } catch (error) {
      console.error('[SmartBook Solver] ❌ Bootstrap failed:', error);
      console.error(error.stack);
    }
  }, 1500);

})();