# Test Site AI Solver - Chrome Extension

A simple Chrome Extension (Manifest V3) that uses AI to solve multiple-choice questions on test sites.

## Features

- Extracts questions from `<h3>` tags
- Extracts answer options from `<label>` tags
- Uses OpenRouter API with the `deepseek/deepseek-chat` model to determine the correct answer
- Automatically clicks the correct answer radio button
- Waits 2 seconds and clicks the Submit/Next button

## Files

### 1. manifest.json
Chrome Extension manifest file with:
- `activeTab` permission
- `scripting` permission
- Host permission for `https://openrouter.ai/*`
- Storage permission for API key

### 2. content.js
Content script that:
- Extracts the question text from `<h3>` tags
- Extracts all answer choices from `<label>` tags
- Sends this data to the background script
- Waits for the AI response
- Finds the radio button corresponding to the correct answer and clicks it
- After a 2-second delay, finds and clicks the 'Submit' or 'Next' button

### 3. background.js
Background service worker that:
- Listens for messages from content.js
- Uses `fetch()` to send the question to the OpenRouter API
- Uses the `deepseek/deepseek-chat` model
- Returns only the exact text of the correct answer back to the content script

## Installation

1. Clone this repository or download the files
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked"
5. Select the folder containing these files
6. Get your API key from [OpenRouter](https://openrouter.ai/)
7. Click the extension icon and enter your API key in the popup

## Usage

1. Navigate to a test site with multiple-choice questions
2. Ensure the question is in an `<h3>` tag and options are in `<label>` tags
3. Click the "Solve with AI" button that appears in the bottom-right corner
4. The extension will:
   - Extract the question and options
   - Send them to the AI
   - Click the correct answer
   - Wait 2 seconds
   - Click the Submit/Next button

## Finding CSS Selectors for Your Specific Test Site

If your test site uses different HTML structure, you may need to modify the selectors in `content.js`. Here's how to find the right selectors:

### Method 1: Using Chrome DevTools

1. **Right-click** on the question text → Select "Inspect" or press `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (Mac)
2. The DevTools will open and highlight the HTML element
3. Look at the element's:
   - **Tag name** (e.g., `h3`, `div`, `p`)
   - **Class names** (e.g., `class="question-text"`)
   - **ID** (e.g., `id="question-1"`)
   - **Data attributes** (e.g., `data-testid="question"`)

4. Repeat for answer options (labels/radio buttons) and submit button

### Method 2: Using the Console

1. Open Chrome DevTools (`F12` or `Ctrl+Shift+I`)
2. Go to the **Console** tab
3. Try these commands to test selectors:

```javascript
// Find question element
document.querySelector('h3')
document.querySelector('.question-text')
document.querySelector('[data-testid="question"]')

// Find all labels/options
document.querySelectorAll('label')
document.querySelectorAll('.answer-option')

// Find radio buttons
document.querySelectorAll('input[type="radio"]')

// Find submit button
document.querySelector('button[type="submit"]')
document.querySelector('button:contains("Submit")')
```

### Common Selector Patterns

#### Questions
```javascript
// By tag
'h3'
'h2'
'div.question'

// By class
'.question-text'
'.prompt-container'
'.quiz-question'

// By data attribute
'[data-testid="question"]'
'[data-question-id]'

// By ID
'#question-text'
'#current-question'
```

#### Answer Options
```javascript
// By tag
'label'

// By class
'.answer-option'
'.choice-label'
'.option-text'

// Radio buttons
'input[type="radio"]'
'[role="radio"]'

// Checkboxes (for multiple select)
'input[type="checkbox"]'
```

#### Submit/Next Buttons
```javascript
// By type
'button[type="submit"]'
'input[type="submit"]'

// By text content (use in querySelector)
Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Submit'))

// By class
'.submit-button'
'.next-button'
'.btn-primary'

// By ID
'#submit-btn'
'#next-question'
```

### Modifying the Extension

Once you've identified the correct selectors, modify `content.js`:

1. **For questions**, update the `extractQuestion()` function:
```javascript
function extractQuestion() {
  // Change 'h3' to your selector
  const questionElement = document.querySelector('.your-question-class');
  if (!questionElement) {
    console.error('[Content] No question found');
    return null;
  }
  return questionElement.textContent.trim();
}
```

2. **For options**, update the `extractOptions()` function:
```javascript
function extractOptions() {
  // Change 'label' to your selector
  const labels = document.querySelectorAll('.your-option-class');
  const options = [];
  
  labels.forEach(label => {
    const text = label.textContent.trim();
    if (text) {
      options.push(text);
    }
  });

  return options;
}
```

3. **For radio buttons**, update the `clickCorrectAnswer()` function:
```javascript
// Update the radio button selector
const radioButton = label.querySelector('input[type="radio"]') || 
                    document.querySelector('.your-radio-class');
```

4. **For submit button**, update the `clickSubmitButton()` function:
```javascript
const submitButton = document.querySelector('.your-submit-button-class');
if (submitButton) {
  submitButton.click();
}
```

## Troubleshooting

### "Could not find question or answer options"
- The page structure doesn't match the expected `<h3>` and `<label>` tags
- Use DevTools to find the actual selectors and modify `content.js`

### "Could not find matching radio button"
- The AI returned text that doesn't exactly match any option
- Check the console logs to see what text was returned
- The radio button might not be directly inside the label

### "Could not find Submit/Next button"
- The button uses a different selector
- Use DevTools to find the button and update `clickSubmitButton()`

### Extension doesn't appear on page
- Check if the page URL matches the content script patterns in `manifest.json`
- The extension runs on all URLs by default (`<all_urls>`)
- Make sure the extension is enabled in `chrome://extensions/`

## API Key

This extension requires an OpenRouter API key:
1. Visit [https://openrouter.ai/](https://openrouter.ai/)
2. Create an account
3. Add credits to your account
4. Generate an API key
5. Enter it in the extension popup

## Model

The extension uses the `deepseek/deepseek-chat` model by default. This can be changed in `background.js` by modifying the `model` parameter in the fetch request.

## License

This is a simple educational project. Feel free to modify and use as needed.
