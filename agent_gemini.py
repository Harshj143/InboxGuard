# agent_gemini.py

import os
import sys
import json
from dotenv import load_dotenv
import google.genai as genai
from google.genai import types
from flask import Flask, request, jsonify

# 1) Make sure app.py (your helpers) is importable
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
from app import extract_email_parts, analyze_urls, analyze_email_with_gemini

# 2) Load your Google API key
load_dotenv()
client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

# 3) Declare the three FunctionDeclaration schemas

parse_email_fn = types.FunctionDeclaration(
    name="parse_email",
    description="Extract subject, sender, and URLs from raw email text",
    parameters=types.Schema(
        type=types.Type.OBJECT,
        properties={
            "email_text": types.Schema(type=types.Type.STRING, description="The full raw email")
        },
        required=["email_text"]
    )
)

analyze_urls_fn = types.FunctionDeclaration(
    name="analyze_urls",
    description="Given a list of URLs, check them for phishing red flags",
    parameters=types.Schema(
        type=types.Type.OBJECT,
        properties={
            "urls": types.Schema(
                type=types.Type.ARRAY,
                items=types.Schema(type=types.Type.STRING),
                description="List of URLs extracted from the email"
            )
        },
        required=["urls"]
    )
)

deep_analysis_fn = types.FunctionDeclaration(
    name="deep_phish_analysis",
    description="Perform a comprehensive phishing analysis on the full email",
    parameters=types.Schema(
        type=types.Type.OBJECT,
        properties={
            "email_text": types.Schema(type=types.Type.STRING, description="The full raw email")
        },
        required=["email_text"]
    )
)

# 4) Wrap them in Tool objects
parse_email_tool   = types.Tool(function_declarations=[parse_email_fn])
analyze_urls_tool  = types.Tool(function_declarations=[analyze_urls_fn])
deep_analysis_tool = types.Tool(function_declarations=[deep_analysis_fn])

tools = [parse_email_tool, analyze_urls_tool, deep_analysis_tool]

# 5) Agent orchestration loop
def run_phishai_agent(email_text: str):
    system_prompt = (
        "You are PhishAI Agent. When given an email, you MUST call exactly one tool per step: "
        "first parse_email, then analyze_urls, then deep_phish_analysis. Do NOT reply in plain text."
    )

    # seed conversation
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user",   "content": email_text}
    ]

    while True:
        # force ANY‐mode function‐calling via tool_config
        response = client.models.generate_content(
            model="gemini-2.0-flash-001",
            contents=messages[-1]["content"],
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                tools=tools,
                tool_config=types.ToolConfig(
                    function_calling_config=types.FunctionCallingConfig(
                        mode="ANY"
                    )
                )
            )
        )

        # now we can safely assume a function call exists
        fc = response.function_calls[0]
        name = fc.name
        args = fc.args if isinstance(fc.args, dict) else json.loads(fc.args)

        # dispatch to your Python helpers
        if name == "parse_email":
            result = extract_email_parts(args["email_text"])
        elif name == "analyze_urls":
            result = analyze_urls(args["urls"])
        elif name == "deep_phish_analysis":
            result = analyze_email_with_gemini(args["email_text"])
        else:
            raise RuntimeError(f"Unknown function: {name}")

        # feed the output back into the “chat”
        messages.append({
            "role":    "function",
            "name":    name,
            "content": json.dumps(result)
        })

        # if this was the last step, return the result
        if name == "deep_phish_analysis":
            return result

        # otherwise have the agent continue
        messages.append({
            "role":    "assistant",
            "content": f"Function {name} returned data; continue."
        })

# 6) Flask server and endpoint
app = Flask(__name__)

@app.route("/agent_analyze", methods=["POST"])
def agent_analyze():
    data = request.json or {}
    email_text = data.get("email_text", "").strip()
    if not email_text:
        return jsonify({"error": "No email_text provided"}), 400

    try:
        analysis = run_phishai_agent(email_text)
        return jsonify(analysis)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    print("🚀 Starting PhishAI Agent server on http://127.0.0.1:5000")
    app.run(debug=True)
