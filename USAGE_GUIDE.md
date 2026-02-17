# Chrome Extension Code Documentation

This document provides the complete code for the Test Site AI Solver Chrome Extension as requested.

## File Structure

```
wokr/
├── manifest.json          # Chrome Extension manifest
├── background.js          # Background service worker
├── content.js             # Content script (runs on web pages)
├── popup.html             # Extension popup UI
├── popup.js               # Popup logic
├── styles.css             # Optional styles
└── README.md             # Full documentation
```

## Complete File Contents

### 1. manifest.json

```json
{
  "manifest_version": 3,
  "name": "Test Site AI Solver",
  "version": "1.0.0",
  "description": "AI-powered answer assistant for test sites with OpenRouter integration",
  "permissions": [
    "activeTab",
    "scripting",
    "storage"
  ],
  "host_permissions": [
    "https://openrouter.ai/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "popup.html"
  }
}
```

**Key Features:**
- ✅ `activeTab` permission - Access to currently active tab
- ✅ `scripting` permission - Ability to inject scripts
- ✅ `https://openrouter.ai/*` host permission - API access
- ✅ Runs on all URLs (`<all_urls>`)

### 2. content.js

This script runs on every webpage and handles:
- Question extraction from `<h3>` tags
- Answer option extraction from `<label>` tags
- Sending data to background script
- Clicking the correct answer
- Clicking Submit/Next button after 2 seconds

**Key Functions:**
- `extractQuestion()` - Finds and extracts question from h3
- `extractOptions()` - Finds all labels and extracts text
- `solveQuestion()` - Main orchestration function
- `clickCorrectAnswer()` - Clicks the matching radio button
- `clickSubmitButton()` - Finds and clicks submit/next button

### 3. background.js

This service worker handles API communication:
- Listens for messages from content script
- Constructs prompts for the AI
- Calls OpenRouter API with `deepseek/deepseek-chat` model
- Returns only the exact answer text

**Key Functions:**
- `solveQuestion()` - Main API calling function
- Uses `fetch()` to call OpenRouter API
- Returns exact answer text (not JSON or complex data)

### 4. popup.html & popup.js

Simple popup interface for API key management:
- Input field for OpenRouter API key
- Save button to store key in Chrome storage
- Toggle visibility button for the key
- Link to get API key from OpenRouter

## How It Works

### Workflow:

1. **User visits a test site** with questions in `<h3>` tags and options in `<label>` tags

2. **Content script injects a button** ("Solve with AI") in the bottom-right corner

3. **User clicks the button**:
   - Content script extracts question and options
   - Retrieves API key from Chrome storage
   - Sends message to background script

4. **Background script**:
   - Receives the question and options
   - Constructs a prompt
   - Calls OpenRouter API with `deepseek/deepseek-chat`
   - Returns only the exact answer text

5. **Content script receives answer**:
   - Finds the matching radio button
   - Clicks it
   - Waits 2 seconds
   - Clicks the Submit/Next button

## Finding CSS Selectors

### Quick Method - Chrome DevTools:

1. Right-click on any element → "Inspect"
2. Look at the HTML structure
3. Note the tag names, classes, and IDs

### Test in Console:

```javascript
// Test question selector
document.querySelector('h3')

// Test options selector
document.querySelectorAll('label')

// Test radio buttons
document.querySelectorAll('input[type="radio"]')

// Test submit button
document.querySelector('button[type="submit"]')
```

### Common Patterns:

**Questions:**
- `h3` - Default
- `.question-text`
- `[data-testid="question"]`
- `#question`

**Options:**
- `label` - Default
- `.answer-option`
- `.choice`

**Submit Buttons:**
- `button[type="submit"]` - Default
- `#submit-btn`
- `.submit-button`

## Customization Guide

### Change Question Selector

In `content.js`, modify `extractQuestion()`:

```javascript
function extractQuestion() {
  // Change 'h3' to your selector
  const questionElement = document.querySelector('.your-question-selector');
  if (!questionElement) {
    console.error('[Content] No question found');
    return null;
  }
  return questionElement.textContent.trim();
}
```

### Change Options Selector

In `content.js`, modify `extractOptions()`:

```javascript
function extractOptions() {
  // Change 'label' to your selector
  const elements = document.querySelectorAll('.your-option-selector');
  const options = [];
  
  elements.forEach(element => {
    const text = element.textContent.trim();
    if (text) {
      options.push(text);
    }
  });

  return options;
}
```

### Change AI Model

In `background.js`, modify the model parameter:

```javascript
body: JSON.stringify({
  model: 'deepseek/deepseek-chat', // Change this to another model
  // ... rest of the configuration
})
```

Available models on OpenRouter:
- `deepseek/deepseek-chat` (default)
- `openai/gpt-4`
- `anthropic/claude-3-opus`
- `google/gemini-pro`
- Many more at https://openrouter.ai/models

## Installation Steps

1. **Download or clone the repository**
   ```bash
   git clone https://github.com/yulipo-1/wokr.git
   cd wokr
   ```

2. **Open Chrome Extensions page**
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (top-right toggle)

3. **Load the extension**
   - Click "Load unpacked"
   - Select the `wokr` folder

4. **Get API Key**
   - Visit https://openrouter.ai/
   - Create account and add credits
   - Generate API key

5. **Configure extension**
   - Click the extension icon
   - Enter API key
   - Click "Save API Key"

## Testing

A test page is included (`test_page.html`) with:
- Sample question in `<h3>` tag
- Options in `<label>` tags with radio buttons
- Submit button

To test:
1. Open `test_page.html` in Chrome
2. Ensure extension is loaded
3. Click "Solve with AI" button
4. Watch it automatically select and submit

## Troubleshooting

### Extension not appearing
- Check that it's enabled in `chrome://extensions/`
- Look for the green button in bottom-right corner

### "Could not find question"
- Page doesn't use `<h3>` for questions
- Use DevTools to find actual selector
- Modify `extractQuestion()` function

### "Could not find options"
- Page doesn't use `<label>` for options
- Use DevTools to find actual selector
- Modify `extractOptions()` function

### API errors
- Check API key is correct
- Ensure you have credits on OpenRouter
- Check browser console for detailed errors

### Radio button not clicking
- Radio button might be in different structure
- Check the label's relationship to input
- May need to adjust selector in `clickCorrectAnswer()`

## Security Notes

- API key is stored in Chrome's sync storage (encrypted)
- Extension only runs when you click the button
- No automatic data collection
- All API calls go through OpenRouter

## Cost Estimation

OpenRouter pricing for `deepseek/deepseek-chat`:
- Very economical model
- Typical question: ~200 tokens
- Cost: ~$0.0001-0.0003 per question
- $5 credit = thousands of questions

## License

Educational project - free to modify and use.
