# Quick Start Guide

## 🚀 Installation (2 minutes)

1. **Load Extension**
   ```
   chrome://extensions/ → Enable "Developer mode" → "Load unpacked" → Select this folder
   ```

2. **Get API Key**
   ```
   Visit: https://openrouter.ai/keys
   Create account → Add credits → Generate key
   ```

3. **Configure**
   ```
   Click extension icon → Enter API key → Save
   ```

## 🎯 Usage (3 clicks)

1. Navigate to test site
2. Click "Solve with AI" button (bottom-right)
3. Done! (Auto-selects and submits)

## 📁 Files Overview

| File | Purpose | Lines |
|------|---------|-------|
| `manifest.json` | Extension config | 27 |
| `content.js` | Extract Q&A, click buttons | 221 |
| `background.js` | Call OpenRouter API | 67 |
| `popup.html` | UI for API key | 94 |
| `popup.js` | Popup logic | 38 |

## 🔑 Key Code Sections

### Question Extraction (content.js:39)
```javascript
const questionElement = document.querySelector('h3');
```

### Options Extraction (content.js:50)
```javascript
const labels = document.querySelectorAll('label');
```

### AI Model (background.js:32)
```javascript
model: 'deepseek/deepseek-chat'
```

### Click Delay (content.js:141)
```javascript
setTimeout(() => clickSubmitButton(), 2000);
```

## 🔧 Customization Cheat Sheet

### Change Question Selector
```javascript
// From: document.querySelector('h3')
// To:   document.querySelector('.question-text')
```

### Change Options Selector
```javascript
// From: document.querySelectorAll('label')
// To:   document.querySelectorAll('.answer-choice')
```

### Change AI Model
```javascript
// From: model: 'deepseek/deepseek-chat'
// To:   model: 'openai/gpt-4'
```

### Change Submit Delay
```javascript
// From: setTimeout(() => clickSubmitButton(), 2000)
// To:   setTimeout(() => clickSubmitButton(), 5000)
```

## 🔍 Finding CSS Selectors (30 seconds)

### Method 1: Inspect Element
```
Right-click element → Inspect → Look at HTML tag/class/id
```

### Method 2: Console Test
```javascript
document.querySelector('h3')              // Test question
document.querySelectorAll('label')        // Test options
document.querySelector('button')          // Test button
```

### Common Patterns
```
Questions:  h3, .question, #question, [data-question]
Options:    label, .option, .choice, .answer
Buttons:    button, input[type="submit"], .submit-btn
```

## 📊 API Costs

| Model | Cost per Question | $5 Gets You |
|-------|-------------------|-------------|
| deepseek/deepseek-chat | ~$0.0002 | ~25,000 questions |
| gpt-3.5-turbo | ~$0.002 | ~2,500 questions |
| gpt-4 | ~$0.03 | ~166 questions |

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Button not showing | Check extension is enabled |
| "No question found" | Question not in `<h3>` - update selector |
| "No options found" | Options not in `<label>` - update selector |
| API error | Check API key, credits, internet |
| Wrong answer clicked | AI made mistake or matching issue |
| Submit not clicked | Button text doesn't match pattern |

## 📚 Documentation Files

- **README.md** - Full documentation with examples
- **USAGE_GUIDE.md** - Detailed code walkthrough
- **IMPLEMENTATION_SUMMARY.md** - Project overview
- **QUICK_START.md** - This file

## ✅ Requirements Checklist

- [x] Manifest V3
- [x] activeTab permission
- [x] scripting permission
- [x] https://openrouter.ai/* permission
- [x] Question extraction (h3)
- [x] Options extraction (label)
- [x] Background API call
- [x] deepseek/deepseek-chat model
- [x] Click correct answer
- [x] 2-second delay
- [x] Click Submit/Next
- [x] CSS selector documentation

## 🎓 Learning Resources

### Chrome Extensions
- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration](https://developer.chrome.com/docs/extensions/mv3/intro/)

### OpenRouter
- [OpenRouter Docs](https://openrouter.ai/docs)
- [Model Comparison](https://openrouter.ai/models)

### CSS Selectors
- [MDN CSS Selectors](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors)
- [querySelector Guide](https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector)

---

**Need Help?** Check the other documentation files for detailed information!
