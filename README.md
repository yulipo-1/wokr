# Blackboard Ultra AI Solver

A production-ready Chrome Extension (Manifest V3) that automates answering multiple choice questions on Blackboard Ultra test pages using AI.

## Features

- 🤖 **AI-Powered**: Uses OpenRouter API with deepseek/deepseek-chat model
- 🎯 **Smart Matching**: Fuzzy matching algorithm to find correct answers
- 🔄 **Auto Navigation**: Automatically clicks "Next" button after answering
- 🌐 **SPA Support**: Uses MutationObserver to handle Single Page Applications
- 🔒 **Secure**: API key stored locally in Chrome storage

## Installation

1. Clone this repository or download the source code
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked"
5. Select the directory containing this extension

## Usage

1. **Get an API Key**
   - Visit [OpenRouter](https://openrouter.ai/keys) to get a free API key
   - You'll need a key starting with `sk-or-v1-...`

2. **Save Your API Key**
   - Click the extension icon in Chrome toolbar
   - Enter your OpenRouter API key
   - Click "Save API Key"

3. **Start Automation**
   - Navigate to a Blackboard Ultra test page on `online.epcc.edu`
   - Click the extension icon
   - Click "Start Automation"
   - The extension will:
     - Read the current question
     - Query the AI for the answer
     - Click the correct radio button
     - Automatically click "Next" to proceed

## File Structure

```
├── manifest.json      # Extension manifest (Manifest V3)
├── popup.html         # Extension popup UI (dark theme)
├── popup.js          # Popup logic and API key management
├── background.js     # Service worker for API communication
├── content.js        # Main content script with automation logic
└── README.md         # This file
```

## Technical Details

### Manifest V3
- **Permissions**: `activeTab`, `storage`, `scripting`
- **Host Permissions**: `https://online.epcc.edu/*`, `https://openrouter.ai/api/*`
- **Content Script**: Runs at `document_idle` for optimal SPA compatibility

### Question Scraping
The extension uses multiple CSS selectors to identify question elements:
- `[data-testid*="question"]`
- `[class*="question-content"]`
- `[class*="question-container"]`
- And more...

### Answer Detection
Radio buttons are detected using `input[type="radio"]` and their labels are extracted using multiple methods:
1. Associated `<label>` with matching `for` attribute
2. Parent `<label>` element
3. Sibling elements
4. Parent container text

### Fuzzy Matching
Uses Levenshtein distance algorithm to match AI responses with answer options, handling:
- Whitespace differences
- Case variations
- Minor text differences

## Requirements

- Chrome browser (version 88+)
- OpenRouter API key
- Access to Blackboard Ultra on `online.epcc.edu`

## Error Handling

The extension includes comprehensive error handling:
- Missing API key detection
- Invalid API key format validation
- Network error handling
- Rate limiting detection
- Missing element detection
- User-friendly error alerts

## Security

- API keys are stored securely in Chrome's local storage
- No data is sent to external servers except OpenRouter API
- Content script is isolated from page scripts
- API keys are validated before use

## Limitations

- Only works with multiple choice questions (radio buttons)
- Does not support checkbox (multi-select) questions
- Requires an active OpenRouter API key with credits
- Only works on `online.epcc.edu` domain

## Troubleshooting

**"API key not found" error**
- Make sure you've saved your API key in the popup first

**"Could not find question on the page" error**
- Ensure you're on a test page with a visible question
- Wait for the page to fully load before clicking "Start Automation"

**"Could not find Next button" error**
- The extension will notify you, please click Next manually
- This can happen on the last question which may have a "Submit" button instead

**Network errors**
- Check your internet connection
- Verify your OpenRouter API key is valid and has credits

## Development

To modify the extension:

1. Edit the source files
2. Reload the extension in `chrome://extensions/`
3. Test on a Blackboard Ultra test page

### Key Components

- **content.js**: Main automation logic, question scraping, answer selection
- **background.js**: API communication with OpenRouter
- **popup.js**: UI logic and API key management

## License

This is a demonstration project for educational purposes.

## Disclaimer

This extension is provided as-is for educational purposes. Users are responsible for ensuring their use complies with their institution's policies and applicable laws.
