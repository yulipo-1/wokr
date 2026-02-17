// Simple content script for test sites
// This script extracts questions and answers, sends to background for solving

(function() {
  'use strict';

  console.log('[Content] Test Site AI Solver loaded');

  // Add a solve button to the page
  function addSolveButton() {
    // Check if button already exists
    if (document.getElementById('ai-solve-button')) {
      return;
    }

    const button = document.createElement('button');
    button.id = 'ai-solve-button';
    button.textContent = 'Solve with AI';
    button.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 10000;
      padding: 12px 24px;
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 5px;
      font-size: 16px;
      cursor: pointer;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;

    button.addEventListener('click', solveQuestion);
    document.body.appendChild(button);
  }

  // Extract question text from h3 tag
  function extractQuestion() {
    const questionElement = document.querySelector('h3');
    if (!questionElement) {
      console.error('[Content] No question found (h3 tag)');
      return null;
    }
    return questionElement.textContent.trim();
  }

  // Extract answer options from label tags
  function extractOptions() {
    const labels = document.querySelectorAll('label');
    const options = [];
    
    labels.forEach(label => {
      const text = label.textContent.trim();
      if (text) {
        options.push(text);
      }
    });

    if (options.length === 0) {
      console.error('[Content] No options found (label tags)');
    }

    return options;
  }

  // Get API key from storage
  async function getApiKey() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['apiKey'], (result) => {
        resolve(result.apiKey || '');
      });
    });
  }

  // Main function to solve the question
  async function solveQuestion() {
    console.log('[Content] Solving question...');

    // Extract question and options
    const questionText = extractQuestion();
    const options = extractOptions();

    if (!questionText || options.length === 0) {
      alert('Could not find question or answer options on this page. Make sure the question is in an <h3> tag and options are in <label> tags.');
      return;
    }

    console.log('[Content] Question:', questionText);
    console.log('[Content] Options:', options);

    // Get API key
    const apiKey = await getApiKey();
    if (!apiKey) {
      alert('Please set your OpenRouter API key in the extension popup first.');
      return;
    }

    // Send to background script
    chrome.runtime.sendMessage(
      {
        action: 'solveQuestion',
        question: questionText,
        options: options,
        apiKey: apiKey
      },
      (response) => {
        if (response.error) {
          console.error('[Content] Error:', response.error);
          alert(`Error: ${response.error}`);
          return;
        }

        console.log('[Content] AI Answer:', response.answer);
        clickCorrectAnswer(response.answer, options);
      }
    );
  }

  // Click the radio button corresponding to the correct answer
  function clickCorrectAnswer(answerText, options) {
    // Find the option that matches the answer
    const labels = document.querySelectorAll('label');
    let foundAnswer = false;

    labels.forEach(label => {
      const labelText = label.textContent.trim();
      
      // Check if this label contains the answer text
      if (labelText.includes(answerText) || answerText.includes(labelText)) {
        // Find associated radio button
        const radioButton = label.querySelector('input[type="radio"]') || 
                          document.querySelector(`input[type="radio"]#${label.htmlFor}`);

        if (radioButton) {
          console.log('[Content] Clicking radio button for:', labelText);
          radioButton.click();
          foundAnswer = true;

          // Wait 2 seconds, then click Submit/Next button
          setTimeout(() => {
            clickSubmitButton();
          }, 2000);
        }
      }
    });

    if (!foundAnswer) {
      console.error('[Content] Could not find matching radio button');
      alert('Could not find matching answer option. The AI returned: ' + answerText);
    }
  }

  // Find and click the Submit or Next button
  function clickSubmitButton() {
    console.log('[Content] Looking for Submit/Next button...');

    // Try various common button selectors
    const buttonSelectors = [
      'button:contains("Submit")',
      'button:contains("Next")',
      'button:contains("Continue")',
      'input[type="submit"]',
      'button[type="submit"]',
      '.submit-button',
      '.next-button',
      '#submit',
      '#next'
    ];

    // Since :contains is not standard, we need to check text content
    const buttons = document.querySelectorAll('button, input[type="submit"]');
    
    for (const button of buttons) {
      const text = button.textContent || button.value || '';
      if (text.match(/submit|next|continue/i)) {
        console.log('[Content] Clicking button:', text);
        button.click();
        return;
      }
    }

    console.warn('[Content] Could not find Submit/Next button');
    alert('Could not find Submit or Next button. Please click it manually.');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addSolveButton);
  } else {
    addSolveButton();
  }

})();
