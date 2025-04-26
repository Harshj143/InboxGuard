import os
import re
import json
import time
from flask import Flask, request, jsonify, render_template
from urllib.parse import urlparse
from dotenv import load_dotenv
import google.genai as genai
from google.genai import types
import requests

# Load environment variables from .env file
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    return response

# Configure Google GenAI
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
client = genai.Client(api_key=GOOGLE_API_KEY)

# Function to extract email parts
def extract_email_parts(email_text):
    """Extract subject, sender, and links from an email"""
    # Simple regex patterns - in production, use more robust parsing
    subject_match = re.search(r'Subject:(.+)', email_text, re.IGNORECASE)
    subject = subject_match.group(1).strip() if subject_match else "Unknown Subject"
    
    from_match = re.search(r'From:(.+)', email_text, re.IGNORECASE)
    sender = from_match.group(1).strip() if from_match else "Unknown Sender"
    
    # Extract URLs - basic regex pattern for demonstration
    url_pattern = r'https?://[^\s<>"]+|www\.[^\s<>"]+'
    urls = re.findall(url_pattern, email_text)
    
    return {
        "subject": subject,
        "sender": sender,
        "urls": urls
    }

# Function to analyze URLs for suspicious characteristics
def analyze_urls(urls):
    """Analyze URLs for suspicious characteristics"""
    suspicious_urls = []
    
    for url in urls:
        issues = []
        parsed_url = urlparse(url)
        
        # Check for URL shorteners
        shorteners = ['bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly']
        if any(shortener in parsed_url.netloc for shortener in shorteners):
            issues.append("Uses URL shortening service")
        
        # Check for suspicious TLDs
        suspicious_tlds = ['.xyz', '.info', '.top', '.club', '.site']
        if any(parsed_url.netloc.endswith(tld) for tld in suspicious_tlds):
            issues.append("Uses suspicious TLD")
        
        # Check for IP addresses in URL
        if re.search(r'\d+\.\d+\.\d+\.\d+', parsed_url.netloc):
            issues.append("Uses IP address instead of domain name")
        
        # Check for suspicious terms in URL
        suspicious_terms = ['secure', 'login', 'verify', 'account', 'update', 'confirm']
        if any(term in parsed_url.path.lower() for term in suspicious_terms):
            issues.append("Contains suspicious terms in URL path")
        
        # Check for HTTPS
        if parsed_url.scheme != 'https':
            issues.append("Not using HTTPS secure connection")
        
        if issues:
            suspicious_urls.append({
                "url": url,
                "issues": issues
            })
    
    return suspicious_urls

# Define the PhishingAnalysisSchema as a Gemini tool for function calling
phishing_analysis = types.FunctionDeclaration(
    name="analyze_email",
    description="Analyze an email for phishing indicators",
    parameters=types.Schema(
        type=types.Type.OBJECT,
        properties={
            "spoofed_sender": types.Schema(
                type=types.Type.BOOLEAN,
                description="Does the sender email address appear to be spoofed or impersonating a legitimate organization?"
            ),
            "sender_analysis": types.Schema(
                type=types.Type.STRING,
                description="Analysis of the sender's email address and display name"
            ),
            "urgency_indicators": types.Schema(
                type=types.Type.ARRAY,
                items=types.Schema(type=types.Type.STRING),
                description="Phrases that create a false sense of urgency"
            ),
            "threat_indicators": types.Schema(
                type=types.Type.ARRAY,
                items=types.Schema(type=types.Type.STRING),
                description="Phrases that include threats or negative consequences"
            ),
            "suspicious_links": types.Schema(
                type=types.Type.ARRAY,
                items=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "text": types.Schema(
                            type=types.Type.STRING,
                            description="The text shown for the link"
                        ),
                        "url": types.Schema(
                            type=types.Type.STRING,
                            description="The actual URL the link points to"
                        ),
                        "issues": types.Schema(
                            type=types.Type.ARRAY,
                            items=types.Schema(type=types.Type.STRING),
                            description="Issues with this link that make it suspicious"
                        )
                    }
                ),
                description="Links in the email that appear suspicious"
            ),
            "data_requests": types.Schema(
                type=types.Type.ARRAY,
                items=types.Schema(type=types.Type.STRING),
                description="Requests for sensitive personal or financial information"
            ),
            "linguistic_manipulation": types.Schema(
                type=types.Type.ARRAY,
                items=types.Schema(type=types.Type.STRING),
                description="Psychological manipulation tactics used in the email"
            ),
            "grammar_spelling_issues": types.Schema(
                type=types.Type.BOOLEAN,
                description="Are there significant grammar or spelling issues?"
            ),
            "impersonation_attempt": types.Schema(
                type=types.Type.STRING,
                description="If the email appears to impersonate a specific company or service, name it here"
            ),
            "confidence_score": types.Schema(
                type=types.Type.NUMBER,
                description="Confidence score that this is a phishing attempt (0-100)"
            ),
            "risk_assessment": types.Schema(
                type=types.Type.STRING,
                enum=["Low", "Medium", "High", "Critical"],
                description="Overall risk assessment of this email"
            ),
            "explanation": types.Schema(
                type=types.Type.STRING,
                description="Detailed explanation of why this is or isn't a phishing attempt"
            )
        },
        required=["spoofed_sender", "confidence_score", "risk_assessment", "explanation"]
    )
)

# Create a Tool that contains the function declaration
phishing_tool = types.Tool(
    function_declarations=[phishing_analysis]
)

def analyze_email_with_gemini(email_text):
    """Use Gemini API with function calling to analyze the email"""
    try:
        # 1. Extract basic email parts for context
        email_parts     = extract_email_parts(email_text)
        suspicious_urls = analyze_urls(email_parts["urls"])

        # 2. Build the system prompt
        system_prompt = """You are PhishAI, an expert cybersecurity assistant specialized in detecting phishing emails. 
Analyze the email content carefully for signs of phishing including:

1. Sender spoofing or impersonation
2. Urgency or fear tactics
3. Suspicious links
4. Requests for sensitive information
5. Linguistic manipulation
6. Grammar and spelling issues
7. Impersonation of known organizations

Use your analysis to determine if this is a phishing attempt. Be thorough and precise."""
        if suspicious_urls:
            system_prompt += "\n\nSuspicious URLs already detected:"
            for info in suspicious_urls:
                system_prompt += f"\n- {info['url']}: {', '.join(info['issues'])}"

        # 3. Prepare the function‑calling schema
        generation_config = types.GenerateContentConfig(
            system_instruction=system_prompt,
            tools=[phishing_tool]
        )

        # 4. Call the Gemini API
        response = client.models.generate_content(
            model="gemini-2.0-flash-001",
            contents=f"Analyze this email for phishing indicators:\n\n{email_text}",
            config=generation_config
        )
        print("=== Gemini raw response ===")
        print(response)
        print("function_calls:", getattr(response, "function_calls", None))
        print("candidates[0].content.parts[0].function_call:",
            response.candidates[0].content.parts[0].function_call)

        # 5. Pull out the function call
        if getattr(response, "function_calls", None):
            fc = response.function_calls[0]
            if fc.name != "analyze_email":
                return {"error": f"Unexpected function call: {fc.name}"}
            # **Use .args, not .arguments** :contentReference[oaicite:0]{index=0}
            raw_args = fc.args
            result = raw_args if isinstance(raw_args, dict) else json.loads(raw_args)

        else:
            part = response.candidates[0].content.parts[0]
            if not part.function_call or part.function_call.name != "analyze_email":
                return {"error": "Failed to get function call results"}
            result = json.loads(part.function_call.args)

        # 6. Merge in our extra URL analysis
        if suspicious_urls and result.get("suspicious_links") is not None:
            for url_info in suspicious_urls:
                found = False
                for link in result["suspicious_links"]:
                    if link.get("url") == url_info["url"]:
                        found = True
                        for issue in url_info["issues"]:
                            if issue not in link["issues"]:
                                link["issues"].append(issue)
                        break
                if not found:
                    result["suspicious_links"].append({
                        "text": url_info["url"],
                        "url": url_info["url"],
                        "issues": url_info["issues"]
                    })

        return result

    except Exception as e:
        return {"error": str(e)}


# Mock function for testing without API key
def mock_analyze_email(email_text):
    """Use for testing without an API key"""
    # This function simulates the API response
    # Implement more sophisticated logic based on patterns in the email

    # Basic check for common phishing indicators
    has_urgency = any(word in email_text.lower() for word in ["urgent", "immediate", "alert", "attention"])
    has_threats = any(word in email_text.lower() for word in ["suspend", "terminate", "blocked"])
    has_requests = any(word in email_text.lower() for word in ["password", "verify", "confirm", "account"])
    has_sus_links = "http://" in email_text or "bit.ly" in email_text
    has_spoofing = "@bank" in email_text or "microsoft" in email_text or "support" in email_text

    # Compute a score based on indicators
    score = 0
    if has_urgency: score += 20
    if has_threats: score += 20
    if has_requests: score += 20
    if has_sus_links: score += 20
    if has_spoofing: score += 20
    
    score = min(score, 95)  # Cap at 95%
    
    # Determine risk level
    risk = "Low"
    if score > 75:
        risk = "Critical"
    elif score > 50:
        risk = "High"
    elif score > 25:
        risk = "Medium"
    
    # Create mock result
    return {
        "spoofed_sender": has_spoofing,
        "urgency_indicators": ["Creates false sense of urgency"] if has_urgency else [],
        "threat_indicators": ["Uses threats to create fear"] if has_threats else [],
        "suspicious_links": [{"url": "example.com", "issues": ["Suspicious URL"]}] if has_sus_links else [],
        "data_requests": ["Requests sensitive information"] if has_requests else [],
        "confidence_score": score,
        "risk_assessment": risk,
        "explanation": f"This{'appears to be a phishing email' if score > 50 else ' may be legitimate but exercise caution'}."
    }

@app.route('/')
def index():
    return render_template('index.html')
@app.route('/resource.html')
def resource():
    return render_template('resource.html')
# Store analysis results temporarily in memory
analysis_results = {}

@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.json
    email_text = data.get('email_text', '')

    if not email_text:
        return jsonify({"error": "No email text provided"}), 400

    # For development/demo, add a small delay to simulate processing
    time.sleep(1.5)

    # Use the real Gemini analysis or the mock function for testing
    if GOOGLE_API_KEY:
        result = analyze_email_with_gemini(email_text)
    else:
        # Fall back to mock function if no API key is provided
        result = mock_analyze_email(email_text)

    # Generate a unique email_id and store the result
    email_id = str(len(analysis_results) + 1)
    result['email_id'] = email_id
    analysis_results[email_id] = result

    return jsonify(result)

@app.route('/preview', methods=['POST'])
def preview_link():
    try:
        # Get the URL from the request
        url = request.json.get('url')
        if not url:
            return jsonify({'error': 'URL is required'}), 400

        # Fetch the URL content
        response = requests.get(url, timeout=5)
        response.raise_for_status()

        # Return the preview data
        return jsonify({
            'url': url
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/report', methods=['GET'])
def report():
    email_id = request.args.get('email_id')
    if not email_id or email_id not in analysis_results:
        return "<h1>Error: Invalid or missing email ID</h1>", 400

    # Fetch the analysis result using the email_id
    result = analysis_results[email_id]

    # Render the result in a simple HTML page
    return render_template('report.html', result=result)

if __name__ == '__main__':
    app.run(debug=True)