// Content script for Blackboard Ultra AI Solver
(() => {
  'use strict';

  // Prevent multiple injections
  if (window.blackboardSolverInjected) {
    console.log('[Blackboard Solver] Already injected, skipping');
    return;
  }
  window.blackboardSolverInjected = true;

  console.log('[Blackboard Solver] Initializing...');

  class BlackboardSolver {
    constructor() {
      this.isProcessing = false;
      this.observer = null;
      this.retryCount = 0;
      this.maxRetries = 3;
      
      // Configuration constants
      this.FUZZY_MATCH_THRESHOLD = 0.3; // Maximum 30% difference for fuzzy matching
      this.RIGHT_SIDE_THRESHOLD = 0.7; // Buttons on right 70% of screen width
    }

    // Initialize the solver
    init() {
      console.log('[Blackboard Solver] Waiting for page to be ready...');
      
      // Listen for messages from popup
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'startAutomation') {
          console.log('[Blackboard Solver] Start automation message received');
          this.startAutomation()
            .then(() => sendResponse({ success: true }))
            .catch(error => {
              console.error('[Blackboard Solver] Error:', error);
              alert('Error: ' + error.message);
              sendResponse({ success: false, error: error.message });
            });
          return true; // Keep the message channel open for async response
        }
      });

      console.log('[Blackboard Solver] ✓ Ready and listening for commands');
    }

    // Main automation flow
    async startAutomation() {
      if (this.isProcessing) {
        console.log('[Blackboard Solver] Already processing, please wait');
        return;
      }

      this.isProcessing = true;
      console.log('[Blackboard Solver] Starting automation...');

      try {
        // Wait for question container to load using MutationObserver
        await this.waitForQuestionContainer();
        
        // Scrape the current question and answer options
        const questionData = await this.scrapeQuestion();
        
        if (!questionData) {
          throw new Error('Could not find question on the page');
        }

        console.log('[Blackboard Solver] Question scraped:', questionData);

        // Get API key from storage
        const apiKey = await this.getApiKey();
        
        // Send to background script to get the answer
        const result = await this.queryAI(questionData, apiKey);
        
        if (result.error) {
          throw new Error(result.error);
        }

        console.log('[Blackboard Solver] AI response:', result.answer);

        // Click the correct answer using fuzzy matching
        await this.clickAnswer(questionData.options, result.answer);

        // Wait and click Next button
        await this.sleep(2000);
        await this.clickNextButton();

        console.log('[Blackboard Solver] ✓ Automation complete for this question');

      } catch (error) {
        console.error('[Blackboard Solver] Automation error:', error);
        throw error;
      } finally {
        this.isProcessing = false;
      }
    }

    // Wait for the question container to be fully loaded
    waitForQuestionContainer() {
      return new Promise((resolve, reject) => {
        console.log('[Blackboard Solver] Waiting for question container...');
        
        // Check if question is already present
        const questionExists = this.findQuestionContainer();
        if (questionExists) {
          console.log('[Blackboard Solver] Question container found immediately');
          resolve();
          return;
        }

        // Otherwise, wait for it to appear
        const timeout = setTimeout(() => {
          if (this.observer) this.observer.disconnect();
          reject(new Error('Timeout waiting for question container'));
        }, 10000);

        this.observer = new MutationObserver((mutations) => {
          const container = this.findQuestionContainer();
          if (container) {
            console.log('[Blackboard Solver] Question container appeared');
            clearTimeout(timeout);
            this.observer.disconnect();
            resolve();
          }
        });

        this.observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      });
    }

    // Find the question container element
    // Blackboard Ultra uses various selectors, trying common ones
    findQuestionContainer() {
      const selectors = [
        '[data-testid*="question"]',
        '[class*="question-content"]',
        '[class*="question-container"]',
        '[class*="assessment-question"]',
        '[class*="quiz-question"]',
        '[id*="question"]',
        '.question',
        '[role="group"]' // Blackboard often uses role="group" for question sections
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim().length > 0) {
          console.log('[Blackboard Solver] Found question container with selector:', selector);
          return element;
        }
      }

      return null;
    }

    // Scrape the question text and answer options
    async scrapeQuestion() {
      console.log('[Blackboard Solver] Scraping question...');
      
      const questionContainer = this.findQuestionContainer();
      if (!questionContainer) {
        throw new Error('Question container not found');
      }

      // Extract question text
      // Look for common Blackboard question text elements
      let questionText = '';
      const questionSelectors = [
        '[class*="question-text"]',
        '[class*="prompt"]',
        '[class*="stem"]',
        '[data-testid*="question-text"]',
        'h3', 'h4', 'p' // Sometimes question is just in a paragraph or heading
      ];

      for (const selector of questionSelectors) {
        const element = questionContainer.querySelector(selector);
        if (element && element.textContent.trim().length > 20) {
          questionText = element.textContent.trim();
          // Remove "Question X" prefix if present
          questionText = questionText.replace(/^Question\s+\d+\s*/i, '');
          break;
        }
      }

      // If no specific selector worked, try to get the largest text block
      if (!questionText) {
        const textBlocks = Array.from(questionContainer.querySelectorAll('p, div, span'))
          .filter(el => {
            const text = el.textContent.trim();
            return text.length > 20 && !text.match(/^Question\s+\d+$/i);
          })
          .sort((a, b) => b.textContent.length - a.textContent.length);
        
        if (textBlocks.length > 0) {
          questionText = textBlocks[0].textContent.trim();
          questionText = questionText.replace(/^Question\s+\d+\s*/i, '');
        }
      }

      console.log('[Blackboard Solver] Question text:', questionText);

      // Extract answer options (radio buttons)
      const radioButtons = questionContainer.querySelectorAll('input[type="radio"]');
      
      if (radioButtons.length === 0) {
        throw new Error('No radio buttons found. Make sure you are on a multiple choice question.');
      }

      const options = [];
      radioButtons.forEach((radio) => {
        // Find the associated label text
        let labelText = '';
        
        // Method 1: Look for label with matching 'for' attribute
        const label = document.querySelector(`label[for="${radio.id}"]`);
        if (label) {
          labelText = label.textContent.trim();
        }
        
        // Method 2: Check if radio is inside a label
        if (!labelText) {
          const parentLabel = radio.closest('label');
          if (parentLabel) {
            labelText = parentLabel.textContent.trim();
          }
        }
        
        // Method 3: Look for sibling elements
        if (!labelText) {
          let sibling = radio.nextElementSibling;
          while (sibling && !labelText) {
            if (sibling.textContent.trim().length > 0) {
              labelText = sibling.textContent.trim();
              break;
            }
            sibling = sibling.nextElementSibling;
          }
        }
        
        // Method 4: Check parent container for text
        if (!labelText) {
          const parent = radio.parentElement;
          if (parent) {
            labelText = parent.textContent.trim();
          }
        }

        if (labelText) {
          options.push({
            id: radio.id || radio.name,
            element: radio,
            text: labelText
          });
        }
      });

      console.log('[Blackboard Solver] Found', options.length, 'options:', options.map(o => o.text));

      if (options.length === 0) {
        throw new Error('Could not extract answer option texts');
      }

      return {
        questionText,
        options
      };
    }

    // Get API key from storage
    getApiKey() {
      return new Promise((resolve, reject) => {
        chrome.storage.local.get(['openRouterKey'], (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (!result.openRouterKey) {
            reject(new Error('API key not found. Please save your API key in the extension popup.'));
          } else {
            resolve(result.openRouterKey);
          }
        });
      });
    }

    // Query the AI for the answer
    queryAI(questionData, apiKey) {
      return new Promise((resolve, reject) => {
        console.log('[Blackboard Solver] Sending query to background script...');
        
        chrome.runtime.sendMessage({
          action: 'solveQuestion',
          data: {
            questionText: questionData.questionText,
            answerOptions: questionData.options.map(o => o.text),
            apiKey: apiKey
          }
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
    }

    // Click the correct answer using fuzzy matching
    async clickAnswer(options, aiAnswer) {
      console.log('[Blackboard Solver] Matching answer:', aiAnswer);
      
      // Clean the AI answer
      const cleanAI = aiAnswer.trim().toLowerCase();
      
      // Try exact match first
      let matchedOption = options.find(opt => 
        opt.text.trim().toLowerCase() === cleanAI
      );

      // If no exact match, try fuzzy matching (contains or is contained)
      if (!matchedOption) {
        matchedOption = options.find(opt => {
          const cleanOpt = opt.text.trim().toLowerCase();
          return cleanOpt.includes(cleanAI) || cleanAI.includes(cleanOpt);
        });
      }

      // If still no match, try Levenshtein distance
      if (!matchedOption) {
        matchedOption = this.findBestMatch(cleanAI, options);
      }

      if (!matchedOption) {
        throw new Error('Could not find matching answer option for: ' + aiAnswer);
      }

      console.log('[Blackboard Solver] Matched option:', matchedOption.text);
      console.log('[Blackboard Solver] Clicking radio button...');

      // Click the radio button
      matchedOption.element.click();
      
      // Also trigger change event
      matchedOption.element.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Highlight the selected option
      const selectedElement = matchedOption.element.closest('label, div');
      if (selectedElement) {
        selectedElement.style.backgroundColor = '#d4edda';
      }

      await this.sleep(500);
      console.log('[Blackboard Solver] ✓ Answer selected');
    }

    // Find best match using Levenshtein distance
    findBestMatch(target, options) {
      let bestMatch = null;
      let bestScore = Infinity;

      for (const option of options) {
        const distance = this.levenshteinDistance(target, option.text.trim().toLowerCase());
        if (distance < bestScore) {
          bestScore = distance;
          bestMatch = option;
        }
      }

      // Only return if the match is reasonably good (threshold defined in constructor)
      if (bestScore < target.length * this.FUZZY_MATCH_THRESHOLD) {
        console.log('[Blackboard Solver] Best fuzzy match score:', bestScore);
        return bestMatch;
      }

      return null;
    }

    // Calculate Levenshtein distance between two strings
    levenshteinDistance(str1, str2) {
      const matrix = [];

      for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
      }

      for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
      }

      for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
          if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
          }
        }
      }

      return matrix[str2.length][str1.length];
    }

    // Click the Next button
    async clickNextButton() {
      console.log('[Blackboard Solver] Looking for Next button...');
      
      // Common Blackboard Ultra next button selectors
      const nextButtonSelectors = [
        'button[data-testid*="next"]',
        'button[title*="Next"]',
        'button[aria-label*="Next"]',
        'button:contains("Next")',
        'button:contains("Continue")',
        'button:contains("Submit")',
        'button.next',
        'button.btn-primary',
        'button[type="submit"]',
        '[class*="next-button"]',
        '[class*="submit-button"]',
        // Arrow buttons (Blackboard often uses arrow icons)
        'button[aria-label*="arrow"]',
        'button[title*="arrow"]'
      ];

      let nextButton = null;

      // Try each selector
      for (const selector of nextButtonSelectors) {
        if (selector.includes(':contains')) {
          // Handle pseudo-selector manually
          const text = selector.match(/\("(.+)"\)/)[1];
          const buttons = Array.from(document.querySelectorAll('button'));
          nextButton = buttons.find(btn => 
            btn.textContent.trim().toLowerCase().includes(text.toLowerCase())
          );
        } else {
          nextButton = document.querySelector(selector);
        }

        if (nextButton && !nextButton.disabled) {
          break;
        }
      }

      // If still not found, look for any button with arrow icon or on the right side
      if (!nextButton) {
        const buttons = Array.from(document.querySelectorAll('button'));
        nextButton = buttons.find(btn => {
          const rect = btn.getBoundingClientRect();
          const text = btn.textContent.trim();
          const hasArrow = btn.innerHTML.includes('arrow') || btn.innerHTML.includes('→') || btn.innerHTML.includes('&gt;');
          const isOnRight = rect.right > window.innerWidth * this.RIGHT_SIDE_THRESHOLD;
          return (hasArrow || isOnRight || text.match(/next|continue|submit/i)) && !btn.disabled;
        });
      }

      if (!nextButton) {
        console.warn('[Blackboard Solver] Could not find Next button, automation will stop here');
        alert('Could not find Next button. Please click Next manually.');
        return;
      }

      console.log('[Blackboard Solver] Found Next button, clicking...');
      nextButton.click();
      
      await this.sleep(500);
      console.log('[Blackboard Solver] ✓ Next button clicked');
    }

    // Utility function to sleep
    sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  }

  // Initialize the solver
  const solver = new BlackboardSolver();
  solver.init();

  console.log('[Blackboard Solver] ✓ Content script loaded successfully');
})();
