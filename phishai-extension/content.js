// content.js - This script runs when matching an email platform
console.log("PhishAI Content Script Loaded");

// Configuration for supported email platforms
const EMAIL_PLATFORMS = {
  'mail.google.com': {
    name: 'Gmail',
    emailSelector: '.a3s.aiL', // Gmail email content
    containerSelector: '.AO', // Gmail main container
    actionBarSelector: '.ade' // Gmail action bar for inserting our button
  },
  'outlook.live.com': {
    name: 'Outlook',
    emailSelector: '.x_ReadMsgBody, .ReadMsgBody', // Outlook email content
    containerSelector: '.ms-Panel-main', // Outlook main panel
    actionBarSelector: '.ms-CommandBar' // Outlook command bar
  },
  'outlook.office.com': {
    name: 'Outlook',
    emailSelector: '.x_ReadMsgBody, .ReadMsgBody', // Outlook email content
    containerSelector: '.ms-Panel-main', // Outlook main panel 
    actionBarSelector: '.ms-CommandBar' // Outlook command bar
  },
  'mail.yahoo.com': {
    name: 'Yahoo Mail',
    emailSelector: '.msg-body', // Yahoo email content
    containerSelector: '.message-body-container', // Yahoo container
    actionBarSelector: '.message-actions' // Yahoo actions bar
  }
};

// Determine if we're on a supported email platform
function getCurrentPlatform() {
  const hostname = window.location.hostname;
  return EMAIL_PLATFORMS[hostname];
}

// Create and insert the PhishAI scan button
function createScanButton(platform) {
  // Check if our button already exists
  if (document.getElementById('phishai-scan-btn')) {
    return;
  }

  // Create button
  const scanButton = document.createElement('button');
  scanButton.id = 'phishai-scan-btn';
  scanButton.innerText = 'Scan for Phishing';
  scanButton.style.cssText = `
    background-color: #4285f4;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 8px 16px;
    font-size: 14px;
    margin: 5px;
    cursor: pointer;
  `;
  
  // Create the results display container
  const resultContainer = document.createElement('div');
  resultContainer.id = 'phishai-result-container';
  resultContainer.style.cssText = `
    display: none;
    margin: 10px 0;
    padding: 10px;
    border-radius: 4px;
    background-color: #f8f9fa;
    border-left: 4px solid #4285f4;
    font-size: 14px;
    max-width: 90%;
  `;

  // Try to find action bar for the specific email platform
  const actionBar = document.querySelector(platform.actionBarSelector);
  if (actionBar) {
    actionBar.appendChild(scanButton);
    // Insert result container after the action bar
    actionBar.parentNode.insertBefore(resultContainer, actionBar.nextSibling);
  } else {
    // Fallback: try to insert near the email content
    const emailContent = document.querySelector(platform.emailSelector);
    if (emailContent && emailContent.parentNode) {
      emailContent.parentNode.insertBefore(scanButton, emailContent);
      emailContent.parentNode.insertBefore(resultContainer, emailContent);
    }
  }

  // Add event listener
  scanButton.addEventListener('click', scanCurrentEmail);
}

// Extract email content based on the platform
function extractEmailContent(platform) {
  const emailElement = document.querySelector(platform.emailSelector);
  if (!emailElement) {
    return null;
  }
  
  // Extract all relevant email metadata if possible
  let subject = "";
  const subjectElement = document.querySelector('h1, .hP, .subject-line');
  if (subjectElement) {
    subject = `Subject: ${subjectElement.textContent.trim()}\n`;
  }
  
  let sender = "";
  const senderElement = document.querySelector('.gD, .sender, .from-name');
  if (senderElement) {
    sender = `From: ${senderElement.textContent.trim()}\n`;
  }
  
  // Get the actual message content
  const messageContent = emailElement.innerText || emailElement.textContent;
  
  return subject + sender + messageContent;
}

// Scan the current email
async function scanCurrentEmail() {
  const platform = getCurrentPlatform();
  if (!platform) {
    alert('PhishAI: Not able to detect email platform.');
    return;
  }
  
  // Get the button and result container
  const scanButton = document.getElementById('phishai-scan-btn');
  const resultContainer = document.getElementById('phishai-result-container');
  
  if (!scanButton || !resultContainer) {
    return;
  }
  
  // Update button state
  scanButton.disabled = true;
  scanButton.innerText = 'Analyzing...';
  resultContainer.style.display = 'block';
  resultContainer.innerHTML = '<div style="text-align: center;">Analyzing email for phishing indicators...</div>';
  
  // Extract email content
  const emailContent = extractEmailContent(platform);
  if (!emailContent) {
    resultContainer.innerHTML = '<div style="color: red;">Unable to extract email content.</div>';
    scanButton.disabled = false;
    scanButton.innerText = 'Scan for Phishing';
    return;
  }
  
  try {
    // Send to backend
    const response = await fetch("http://127.0.0.1:5000/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email_text: emailContent })
    });
    
    const data = await response.json();
    displayResults(data, resultContainer);
  } catch (error) {
    resultContainer.innerHTML = `
      <div style="color: red;">
        <strong>Error:</strong> ${error.message}<br>
        <small>Make sure the PhishAI server is running at http://127.0.0.1:5000</small>
      </div>
    `;
  } finally {
    scanButton.disabled = false;
    scanButton.innerText = 'Scan for Phishing';
  }
}

// Display the phishing analysis results
function displayResults(data, container) {
  if (data.error) {
    container.innerHTML = `<div style="color: red;"><strong>Error:</strong> ${data.error}</div>`;
    return;
  }
  
  // Determine color based on risk
  let riskColor = '#4caf50'; // Default green (low risk)
  if (data.risk_assessment === 'Medium') {
    riskColor = '#ff9800'; // Orange
  } else if (data.risk_assessment === 'High') {
    riskColor = '#f44336'; // Red
  } else if (data.risk_assessment === 'Critical') {
    riskColor = '#b71c1c'; // Dark red
  }
  
  // Update container border color based on risk
  container.style.borderLeftColor = riskColor;
  
  // Build HTML for the results
  let html = `
    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
      <h3 style="margin: 0; color: ${riskColor};">PhishAI Analysis</h3>
      <span style="font-weight: bold; color: ${riskColor};">${data.risk_assessment} Risk (${data.confidence_score}%)</span>
    </div>
  `;
  
  // Short explanation
  html += `<p>${data.explanation}</p>`;
  
  // Show detailed information in a collapsible section
  html += `<details>
    <summary style="cursor: pointer; margin: 10px 0;">Show details</summary>
    <div style="margin-left: 10px;">`;
  
  if (data.spoofed_sender) {
    html += `<p>⚠️ <strong>Spoofed sender detected</strong></p>`;
  }
  
  if (data.sender_analysis) {
    html += `<p><strong>Sender analysis:</strong> ${data.sender_analysis}</p>`;
  }
  
  if (data.urgency_indicators?.length) {
    html += `<p><strong>Urgency indicators:</strong> ${data.urgency_indicators.join(", ")}</p>`;
  }
  
  if (data.threat_indicators?.length) {
    html += `<p><strong>Threat indicators:</strong> ${data.threat_indicators.join(", ")}</p>`;
  }
  
  if (data.data_requests?.length) {
    html += `<p><strong>Sensitive data requests:</strong> ${data.data_requests.join(", ")}</p>`;
  }
  
  if (data.suspicious_links?.length) {
    html += `<p><strong>Suspicious links:</strong><ul>` +
      data.suspicious_links.map(l => 
        `<li>${l.url} — ${l.issues.join(", ")}</li>`
      ).join("") +
      `</ul></p>`;
  }
  
  if (data.linguistic_manipulation?.length) {
    html += `<p><strong>Manipulation tactics:</strong> ${data.linguistic_manipulation.join(", ")}</p>`;
  }
  
  html += `</div></details>`;
  
  container.innerHTML = html;
}

// Observer to detect when email view changes (for SPA email clients)
function setupObserver() {
  const platform = getCurrentPlatform();
  if (!platform) return;
  
  // Find the main container to observe
  const container = document.querySelector(platform.containerSelector);
  if (!container) return;
  
  // Create a mutation observer to detect when a new email is opened
  const observer = new MutationObserver(function(mutations) {
    // Check if our button exists, if not, create it
    if (!document.getElementById('phishai-scan-btn')) {
      createScanButton(platform);
    }
  });
  
  // Start observing
  observer.observe(container, { 
    childList: true,
    subtree: true 
  });
}

// Main initialization
function init() {
  const platform = getCurrentPlatform();
  if (platform) {
    console.log(`PhishAI detected: ${platform.name}`);
    
    // Initial button creation
    createScanButton(platform);
    
    // Setup observer for dynamic content changes
    setupObserver();
  }
}

// Start the extension
init();

// Re-check periodically (email clients are SPAs that load content dynamically)
setInterval(() => {
  init();
}, 3000);