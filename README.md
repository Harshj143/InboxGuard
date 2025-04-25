# PhishAI Detector - Powered by Google Gemini

An AI-powered web application for detecting phishing emails using Google's Gemini API with function calling capabilities.

## Features

- **Gemini AI-Powered Analysis**: Leverages Google's Gemini AI models to analyze email content for phishing indicators
- **Multi-factor Detection**: Examines sender information, links, urgency language, threats, and manipulation tactics
- **Comprehensive Reporting**: Provides a risk assessment with confidence score and detailed explanations
- **User-Friendly Interface**: Clean, intuitive UI for easy analysis of suspicious emails

## Technology Stack

- **Backend**: Flask (Python)
- **AI Integration**: Google Gemini API with function calling
- **Frontend**: HTML, CSS, JavaScript
- **Styling**: TailwindCSS and Font Awesome

## Getting Started

### Prerequisites

- Python 3.8 or higher
- Google Gemini API key
- pip (Python package installer)

### Installation

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/phishai-detector.git
   cd phishai-detector
   ```

2. Create a virtual environment:
   ```
   python -m venv venv
   
   # On Windows
   venv\Scripts\activate
   
   # On macOS/Linux
   source venv/bin/activate
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Create a `.env` file in the root directory with your Google Gemini API key:
   ```
   GOOGLE_API_KEY=your_gemini_api_key_here
   FLASK_ENV=development
   ```

### Running the Application

1. Start the Flask application:
   ```
   python app.py
   ```

2. Open your web browser and navigate to:
   ```
   http://127.0.0.1:5000
   ```

## Project Structure

```
phishai-detector/
├── static/
│   ├── css/
│   │   └── styles.css
│   └── js/
│       └── app.js
├── templates/
│   └── index.html
├── app.py
├── requirements.txt
├── README.md
└── .env
```

## Usage

1. Paste a suspicious email into the text area
2. Click "Analyze Email" to start the AI analysis
3. Review the risk assessment and detailed indicators
4. Alternatively, try one of the example phishing emails

## Mock Mode

If you don't have a Google Gemini API key, the application will run in mock mode with simulated analysis. This is useful for development and testing.

## Getting a Google Gemini API Key

1. Visit the [Google AI Developer Portal](https://ai.google.dev/)
2. Sign in with your Google account
3. Navigate to the API section
4. Create a new API key
5. Add the key to your `.env` file

## Extension Ideas

- Add user authentication
- Implement email forwarding for automatic checking
- Create a database to store analysis history
- Build a browser extension for quick analysis
- Add reporting and sharing features

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

This tool is for educational purposes only. Always exercise caution with suspicious emails and follow your organization's security policies.