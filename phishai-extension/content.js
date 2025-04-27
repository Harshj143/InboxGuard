// content.js - This script runs when matching an email platform
console.log("InboxGuard Content Script Loaded");

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

// Create and insert the floating InboxGuard icon
function createFloatingIcon(platform) {
  // Check if our icon already exists
  if (document.getElementById('inboxguard-floating-icon')) {
    return;
  }

  // Create the floating icon wrapper
  const iconWrapper = document.createElement('div');
  iconWrapper.id = 'inboxguard-floating-icon';
  iconWrapper.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 50px; /* Adjusted size */
    height: 50px; /* Adjusted size */
    border-radius: 50%;
    background-color: #0d47a1; /* Dark blue background */
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 9999;
    transition: transform 0.2s, box-shadow 0.2s;
  `;
  
  // Create the icon
  const iconInner = document.createElement('div');
  iconInner.style.cssText = `
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  
  // Explicitly set the full path for the icon image using chrome.runtime.getURL
  const iconPath = chrome.runtime.getURL("Icon2.png");
  const iconImg = document.createElement('img');
  iconImg.src = iconPath;
  iconImg.alt = "InboxGuard";
  iconImg.style.cssText = `
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
  `;
  iconInner.appendChild(iconImg);
  
  // Create the status indicator
  const statusIndicator = document.createElement('div');
  statusIndicator.id = 'inboxguard-status';
  statusIndicator.style.cssText = `
    position: absolute;
    top: -5px;
    right: -5px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background-color: #9e9e9e;
    border: 2px solid white;
    display: none;
  `;
  
  // Create the results display container
  const resultContainer = document.createElement('div');
  resultContainer.id = 'inboxguard-result-container';
  resultContainer.style.cssText = `
    position: fixed;
    right: 75px;
    top: 100px;
    width: 320px;
    background-color: #ffffff;
    border-radius: 8px;
    padding: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 9998;
    display: none;
    font-size: 14px;
    max-width: 90%;
  `;
  
  // Create the scan button inside the container
  const scanButton = document.createElement('button');
  scanButton.id = 'inboxguard-scan-btn';
  scanButton.innerText = 'Scan Now';
  scanButton.style.cssText = `
    background-color: #4285f4;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 6px 12px;
    font-size: 13px;
    margin-top: 8px;
    cursor: pointer;
    display: block;
  `;
  
  // Add event listener for scan button
  scanButton.addEventListener('click', () => scanCurrentEmail(true));
  
  // Add the button to the container
  resultContainer.appendChild(scanButton);
  
  // Add elements to the icon wrapper
  iconWrapper.appendChild(iconInner);
  iconWrapper.appendChild(statusIndicator);
  
  // Add the icon to the page
  document.body.appendChild(iconWrapper);
  document.body.appendChild(resultContainer);
  
  // Make the icon draggable
  makeDraggable(iconWrapper, resultContainer);
  
  // Add event listener to toggle result container when icon is clicked
  iconWrapper.addEventListener('click', toggleResultContainer);
  
  // Initially try to scan the email
  setTimeout(() => {
    scanCurrentEmail(false);
  }, 1500);
}

// Ensure the floating icon and result container stay within the screen bounds
function makeDraggable(element, linkedElement) {
  let offsetX = 0, offsetY = 0;
  let isDragging = false;

  // Mouse down event - start dragging
  element.addEventListener('mousedown', (e) => {
    // Allow dragging from any part of the icon
    isDragging = true;
    offsetX = e.clientX - element.getBoundingClientRect().left;
    offsetY = e.clientY - element.getBoundingClientRect().top;
    element.classList.add('dragging');
    e.preventDefault();
  });

  // Mouse move event - move element
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    let left = e.clientX - offsetX;
    let top = e.clientY - offsetY;

    // Ensure the icon stays within the viewport
    const maxX = window.innerWidth - element.offsetWidth;
    const maxY = window.innerHeight - element.offsetHeight;

    left = Math.max(0, Math.min(left, maxX));
    top = Math.max(0, Math.min(top, maxY));

    element.style.left = `${left}px`;
    element.style.top = `${top}px`;

    // If linked element is visible, update its position too
    if (linkedElement && linkedElement.style.display !== 'none') {
      const containerWidth = linkedElement.offsetWidth;
      const containerHeight = linkedElement.offsetHeight;

      let linkedTop = top;
      let linkedLeft = left + element.offsetWidth + 10; // Position to the right of the icon

      // Adjust if the container goes out of bounds
      if (linkedLeft + containerWidth > window.innerWidth) {
        linkedLeft = left - containerWidth - 10; // Position to the left of the icon
      }
      if (linkedTop + containerHeight > window.innerHeight) {
        linkedTop = window.innerHeight - containerHeight - 10; // Adjust to fit within the screen
      }
      if (linkedTop < 0) {
        linkedTop = 10; // Ensure it doesn't go above the screen
      }

      linkedElement.style.top = `${linkedTop}px`;
      linkedElement.style.left = `${linkedLeft}px`;
    }
  });

  // Mouse up event - stop dragging
  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      element.classList.remove('dragging');
    }
  });
}

// Toggle the result container
function toggleResultContainer(e) {
  // Only toggle if it's a click (not a drag end)
  if (e.target.classList.contains('dragging')) return;

  const resultContainer = document.getElementById('inboxguard-result-container');
  const icon = document.getElementById('inboxguard-floating-icon');

  if (resultContainer.style.display === 'none') {
    resultContainer.style.display = 'block';

    // Ensure the result container is displayed inside the screen
    const containerWidth = resultContainer.offsetWidth;
    const containerHeight = resultContainer.offsetHeight;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    let top = icon.offsetTop;
    let left = icon.offsetLeft - containerWidth - 10; // Position to the left of the icon

    // Adjust if the container goes out of bounds
    if (left < 0) {
      left = icon.offsetLeft + icon.offsetWidth + 10; // Position to the right of the icon
    }
    if (top + containerHeight > screenHeight) {
      top = screenHeight - containerHeight - 10; // Adjust to fit within the screen
    }
    if (top < 0) {
      top = 10; // Ensure it doesn't go above the screen
    }

    resultContainer.style.top = `${top}px`;
    resultContainer.style.left = `${left}px`;
  } else {
    resultContainer.style.display = 'none';
  }
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
async function scanCurrentEmail(isManualScan = false) {
  const platform = getCurrentPlatform();
  if (!platform) {
    if (isManualScan) {
      alert('InboxGuard: Not able to detect email platform.');
    }
    return;
  }
  
  // Get the button, result container, and status indicator
  const scanButton = document.getElementById('inboxguard-scan-btn');
  const resultContainer = document.getElementById('inboxguard-result-container');
  const statusIndicator = document.getElementById('inboxguard-status');
  
  if (!scanButton || !resultContainer || !statusIndicator) {
    return;
  }
  
  // Update UI state
  scanButton.disabled = true;
  scanButton.innerText = 'Analyzing...';
  statusIndicator.style.display = 'block';
  statusIndicator.style.backgroundColor = '#FFC107'; // Yellow during analysis
  
  if (isManualScan) {
    resultContainer.style.display = 'block';
    resultContainer.innerHTML = '<div style="text-align: center;">Analyzing email for phishing indicators...</div>';
    
    // Add back the scan button
    const newScanButton = document.createElement('button');
    newScanButton.id = 'phishai-scan-btn';
    newScanButton.innerText = 'Analyzing...';
    newScanButton.disabled = true;
    newScanButton.style.cssText = `
      background-color: #9fc1fa;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 6px 12px;
      font-size: 13px;
      margin-top: 8px;
      cursor: not-allowed;
      display: block;
    `;
    resultContainer.appendChild(newScanButton);
  }
  
  // Extract email content
  const emailContent = extractEmailContent(platform);
  if (!emailContent) {
    showScanError("Unable to extract email content.");
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
    if (data.error) {
      showScanError(data.error);
      return;
    }
    
    // Update the icon status based on risk
    updateStatusIndicator(data.risk_assessment);
    
    // Display results if manually scanned or if risk is medium or higher
    if (isManualScan || 
        data.risk_assessment === 'Medium' || 
        data.risk_assessment === 'High' || 
        data.risk_assessment === 'Critical') {
      resultContainer.style.display = 'block';
      displayResults(data, resultContainer);
    }
  } catch (error) {
    showScanError(error.message);
  }
}

// Update the status indicator based on risk assessment
function updateStatusIndicator(riskLevel) {
  const statusIndicator = document.getElementById('inboxguard-status');
  if (!statusIndicator) return;
  
  statusIndicator.style.display = 'block';
  
  // Set color based on risk
  switch (riskLevel) {
    case 'Low':
      statusIndicator.style.backgroundColor = '#4caf50'; // Green
      break;
    case 'Medium':
      statusIndicator.style.backgroundColor = '#ff9800'; // Orange
      break;
    case 'High':
      statusIndicator.style.backgroundColor = '#f44336'; // Red
      break;
    case 'Critical':
      statusIndicator.style.backgroundColor = '#b71c1c'; // Dark red
      break;
    default:
      statusIndicator.style.backgroundColor = '#9e9e9e'; // Grey
  }
}

// Display error message
function showScanError(errorMessage) {
  const scanButton = document.getElementById('inboxguard-scan-btn');
  const resultContainer = document.getElementById('inboxguard-result-container');
  const statusIndicator = document.getElementById('inboxguard-status');
  
  if (resultContainer) {
    resultContainer.innerHTML = `
      <div style="color: red;">
        <strong>Error:</strong> ${errorMessage}<br>
        <small>Make sure the InboxGuard server is running at http://127.0.0.1:5000</small>
      </div>
    `;
    
    // Add back the scan button
    const newScanButton = document.createElement('button');
    newScanButton.id = 'inboxguard-scan-btn';
    newScanButton.innerText = 'Scan Again';
    newScanButton.style.cssText = `
      background-color: #4285f4;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 6px 12px;
      font-size: 13px;
      margin-top: 8px;
      cursor: pointer;
      display: block;
    `;
    newScanButton.addEventListener('click', () => scanCurrentEmail(true));
    resultContainer.appendChild(newScanButton);
  }
  
  if (statusIndicator) {
    statusIndicator.style.backgroundColor = '#9e9e9e'; // Grey to indicate error
  }
}

// Ensure the link for redirection to the website is visible and functional
// Display results function with updated View Full Report button functionality
function displayResults(data, container) {
  // Determine color based on risk
  let riskColor = '#4caf50'; // Default green (low risk)
  if (data.risk_assessment === 'Medium') {
    riskColor = '#ff9800'; // Orange
  } else if (data.risk_assessment === 'High') {
    riskColor = '#f44336'; // Red
  } else if (data.risk_assessment === 'Critical') {
    riskColor = '#b71c1c'; // Dark red
  }

  // Build HTML for the results
  let html = `
    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
      <h3 style="margin: 0; color: ${riskColor};">InboxGuard Analysis</h3>
      <span style="font-weight: bold; color: ${riskColor};">${data.risk_assessment} Risk (${data.confidence_score}%)</span>
    </div>
  `;

  // Short explanation
  html += `<p>${data.explanation}</p>`;

  // Add a link to redirect to the main website
  html += `<p>For more details, click the link below:</p>`;
  html += `<button id="inboxguard-details-btn" style="
    background-color: #4285f4;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 6px 12px;
    font-size: 13px;
    margin-top: 8px;
    cursor: pointer;
    display: block;
  ">View Full Report</button>`;

  // Add scan again button
  html += `<button id="inboxguard-scan-btn" style="
    background-color: #4285f4;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 6px 12px;
    font-size: 13px;
    margin-top: 8px;
    cursor: pointer;
    display: block;
  ">Scan Again</button>`;

  container.innerHTML = html;

  // Add event listener to new buttons
  const newScanButton = document.getElementById('inboxguard-scan-btn');
  if (newScanButton) {
    newScanButton.addEventListener('click', () => scanCurrentEmail(true));
  }

  // Modify the "View Full Report" button to display the popup report
  const detailsButton = document.getElementById('inboxguard-details-btn');
  if (detailsButton) {
    detailsButton.addEventListener('click', () => {
      // Display popup report with the data
      displayPopupReport(data);
    });
  }
}

// Add this function to your content.js file
function displayPopupReport(data) {
  // Check if popup already exists and remove it if it does
  const existingPopup = document.getElementById('inboxguard-report-popup');
  if (existingPopup) {
    document.body.removeChild(existingPopup);
  }
  
  // Create popup container
  const popup = document.createElement('div');
  popup.id = 'inboxguard-report-popup';
  popup.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.7);
    z-index: 10000;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: auto;
  `;
  
  // Create iframe to load the report HTML
  const iframe = document.createElement('iframe');
  iframe.style.cssText = `
    width: 90%;
    height: 90%;
    border: none;
    border-radius: 12px;
    background-color: white;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  `;
  
  // Create close button
  const closeButton = document.createElement('div');
  closeButton.style.cssText = `
    position: absolute;
    top: 20px;
    right: 20px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: #f44336;
    color: white;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    font-size: 20px;
    font-weight: bold;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
    z-index: 10001;
  `;
  closeButton.textContent = 'X';
  closeButton.onclick = () => {
    document.body.removeChild(popup);
  };
  
  // Add iframe and close button to popup
  popup.appendChild(iframe);
  popup.appendChild(closeButton);
  
  // Add popup to body
  document.body.appendChild(popup);
  
  // Create blob URL for the HTML content
  const htmlContent = generateReportHTML(data);
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const blobUrl = URL.createObjectURL(blob);
  
  // Set iframe source to blob URL
  iframe.src = blobUrl;
  
  // Close popup when clicking outside the report (on the dark overlay)
  popup.addEventListener('click', (event) => {
    if (event.target === popup) {
      document.body.removeChild(popup);
    }
  });
}

// Function to generate HTML content based on your template
function generateReportHTML(data) {
  // Format the current date
  const today = new Date();
  const formattedDate = today.toLocaleString('en-US', {
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });
  
  const emailId = data.email_id || 'Unknown';
  
  // Risk class for styling
  const riskClass = data.risk_assessment.toLowerCase();
  const riskIcon = data.risk_assessment === 'Low' ? 'fa-check-circle' : 
                  data.risk_assessment === 'Medium' ? 'fa-exclamation-circle' : 
                  data.risk_assessment === 'High' ? 'fa-exclamation-triangle' : 'fa-skull-crossbones';
  
  // Generate suspicious links HTML if present
  let suspiciousLinksHTML = '';
  if (data.suspicious_links && data.suspicious_links.length > 0) {
    suspiciousLinksHTML = `
      <div class="indicator-card color-red">
        <div class="header">
          <i class="fas fa-link"></i>
          <h4>Suspicious Links</h4>
        </div>
        ${data.suspicious_links.map(link => `
          <div style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid rgba(244, 67, 54, 0.2);">
            <div style="font-weight: 500;">${link.text || link.url}</div>
            <div style="font-size: 14px; margin-top: 5px; margin-bottom: 5px; color: #d32f2f;">Issues detected:</div>
            <ul>
              ${link.issues.map(issue => `<li>${issue}</li>`).join('')}
            </ul>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  // Generate other indicators HTML
  let urgencyHTML = '';
  if (data.urgency_indicators && data.urgency_indicators.length > 0) {
    urgencyHTML = `
      <div class="indicator-card color-orange">
        <div class="header">
          <i class="fas fa-clock"></i>
          <h4>Urgency Tactics</h4>
        </div>
        <ul>
          ${data.urgency_indicators.map(indicator => `<li>${indicator}</li>`).join('')}
        </ul>
      </div>
    `;
  }
  
  let threatHTML = '';
  if (data.threat_indicators && data.threat_indicators.length > 0) {
    threatHTML = `
      <div class="indicator-card color-orange">
        <div class="header">
          <i class="fas fa-exclamation-triangle"></i>
          <h4>Threat Manipulation</h4>
        </div>
        <ul>
          ${data.threat_indicators.map(indicator => `<li>${indicator}</li>`).join('')}
        </ul>
      </div>
    `;
  }
  
  let dataRequestsHTML = '';
  if (data.data_requests && data.data_requests.length > 0) {
    dataRequestsHTML = `
      <div class="indicator-card color-red">
        <div class="header">
          <i class="fas fa-id-card"></i>
          <h4>Sensitive Information Requests</h4>
        </div>
        <ul>
          ${data.data_requests.map(request => `<li>${request}</li>`).join('')}
        </ul>
      </div>
    `;
  }
  
  let linguisticHTML = '';
  if (data.linguistic_manipulation && data.linguistic_manipulation.length > 0) {
    linguisticHTML = `
      <div class="indicator-card color-yellow">
        <div class="header">
          <i class="fas fa-comment-dots"></i>
          <h4>Manipulation Tactics</h4>
        </div>
        <ul>
          ${data.linguistic_manipulation.map(tactic => `<li>${tactic}</li>`).join('')}
        </ul>
      </div>
    `;
  }
  
  let grammarHTML = '';
  if (data.grammar_spelling_issues) {
    grammarHTML = `
      <div class="indicator-card color-yellow">
        <div class="header">
          <i class="fas fa-spell-check"></i>
          <h4>Grammar & Spelling Issues</h4>
        </div>
        <p>Significant grammar or spelling issues detected in the email, which is common in phishing attempts.</p>
      </div>
    `;
  }
  
  let impersonationHTML = '';
  if (data.impersonation_attempt) {
    impersonationHTML = `
      <div class="indicator-card color-red">
        <div class="header">
          <i class="fas fa-mask"></i>
          <h4>Impersonation Attempt</h4>
        </div>
        <p>Attempting to impersonate: ${data.impersonation_attempt}</p>
      </div>
    `;
  }
  
  let spoofedSenderHTML = '';
  if (data.spoofed_sender) {
    spoofedSenderHTML = `
      <div class="indicator-card color-red">
        <div class="header">
          <i class="fas fa-user-secret"></i>
          <h4>Suspicious Sender</h4>
        </div>
        <p>${data.sender_analysis || 'Sender appears to be spoofed'}</p>
      </div>
    `;
  }
  
  // Check if no indicators were found
  const noIndicators = !data.spoofed_sender && 
                      (!data.suspicious_links || data.suspicious_links.length === 0) &&
                      (!data.urgency_indicators || data.urgency_indicators.length === 0) &&
                      (!data.threat_indicators || data.threat_indicators.length === 0) &&
                      (!data.data_requests || data.data_requests.length === 0) &&
                      (!data.linguistic_manipulation || data.linguistic_manipulation.length === 0) &&
                      !data.grammar_spelling_issues &&
                      !data.impersonation_attempt;
  
  let noIndicatorsHTML = '';
  if (noIndicators) {
    noIndicatorsHTML = `
      <div class="indicator-card color-green">
        <div class="header">
          <i class="fas fa-check-circle"></i>
          <h4>No Phishing Indicators Detected</h4>
        </div>
        <p>This email appears to be legitimate based on our analysis.</p>
      </div>
    `;
  }
  
  // Combine all HTML sections
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>InboxGuard Analysis Report</title>
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" rel="stylesheet">
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0;
          padding: 0;
          background-color: #f4f4f9;
          color: #333;
        }

        p {
          font-size: 14px;
        }

        .container {
          max-width: 800px;
          margin: 30px auto;
          background: #fff;
          padding: 25px;
          border-radius: 12px;
          box-shadow: 0 3px 15px rgba(0, 0, 0, 0.1);
          position: relative;
        }

        header {
          margin-bottom: 25px;
          border-bottom: 1px solid #eaeaea;
          padding-bottom: 15px;
          position: relative;
        }

        .print-button {
          position: absolute;
          top: 3;
          right: 0;
          margin-right: 25px;
          z-index: 10;
        }

        .print-button button {
          padding: 8px 16px;
          background-color: #1a73e8;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9em;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .print-button button:hover {
          background-color: #0d47a1;
        }

        .logo {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
        }

        .logo i {
          font-size: 1.5rem;
          color: #1a73e8;
          margin-right: 10px;
        }

        .logo h1 {
          margin: 0;
          color: #1a73e8;
          font-size: 1.5rem;
        }

        .timestamp {
          color: #666;
          font-size: 0.9em;
          margin-top: 5px;
        }

        .risk-indicator {
          display: flex;
          align-items: center;
          padding: 10px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .risk-icon i {
          font-size: 1.5em;
        }

        .risk-details h2 {
          margin: 0 0 5px 0;
          font-size: 20px;
        }

        .risk-confidence {
          font-size: 14px;
          margin-bottom: 5px;
        }

        .risk-summary {
          font-size: 14px;
        }

        /* Risk Level Styles */
        .risk-low {
          background-color: rgba(76, 175, 80, 0.1);
          border: 1px solid rgba(76, 175, 80, 0.3);
        }

        .risk-low .risk-icon {
          background-color: rgba(76, 175, 80, 0.2);
        }

        .risk-low h2,
        .risk-low i,
        .risk-low .risk-confidence {
          color: #388e3c;
        }

        .risk-medium {
          background-color: rgba(255, 152, 0, 0.1);
          border: 1px solid rgba(255, 152, 0, 0.3);
        }

        .risk-medium .risk-icon {
          background-color: rgba(255, 152, 0, 0.2);
        }

        .risk-medium h2,
        .risk-medium i,
        .risk-medium .risk-confidence {
          color: #f57c00;
        }

        .risk-high {
          background-color: rgba(244, 67, 54, 0.1);
          border: 1px solid rgba(244, 67, 54, 0.3);
        }

        .risk-high .risk-icon {
          background-color: rgba(244, 67, 54, 0.2);
        }

        .risk-high h2,
        .risk-high i,
        .risk-high .risk-confidence {
          color: #d32f2f;
        }

        .risk-critical {
          background-color: rgba(183, 28, 28, 0.1);
          border: 1px solid rgba(183, 28, 28, 0.3);
        }

        .risk-critical .risk-icon {
          background-color: rgba(183, 28, 28, 0.2);
        }

        .risk-critical h2,
        .risk-critical i,
        .risk-critical .risk-confidence {
          color: #b71c1c;
        }

        .explanation {
          background-color: #e8f0fe;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 25px;
          font-size: 14px;
          line-height: 1.5;
        }

        .explanation h3 {
          margin-top: 0;
          display: flex;
          align-items: center;
          color: #1a73e8;
        }

        .explanation h3 i {
          margin-right: 8px;
        }

        .indicators-section {
          margin-bottom: 30px;
        }

        .indicators-section h3 {
          margin-top: 0;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          color: #1a73e8;
        }

        .indicators-section h3 i {
          margin-right: 8px;
        }

        .indicator-card {
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 15px;
        }

        .indicator-card:last-child {
          margin-bottom: 0;
        }

        .indicator-card .header {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
        }

        .indicator-card .header i {
          margin-right: 8px;
        }

        .indicator-card .header h4 {
          margin: 0;
        }

        .indicator-card ul {
          margin: 10px 0 0 0;
          padding-left: 25px;
        }

        .indicator-card ul li {
          margin-bottom: 5px;
        }

        /* Indicator colors */
        .color-red {
          background-color: rgba(244, 67, 54, 0.1);
          border: 1px solid rgba(244, 67, 54, 0.3);
        }

        .color-red .header i,
        .color-red .header h4 {
          color: #d32f2f;
        }

        .color-orange {
          background-color: rgba(255, 152, 0, 0.1);
          border: 1px solid rgba(255, 152, 0, 0.3);
        }

        .color-orange .header i,
        .color-orange .header h4 {
          color: #f57c00;
        }

        .color-yellow {
          background-color: rgba(255, 193, 7, 0.1);
          border: 1px solid rgba(255, 193, 7, 0.3);
        }

        .color-yellow .header i,
        .color-yellow .header h4 {
          color: #fbc02d;
        }

        .color-green {
          background-color: rgba(76, 175, 80, 0.1);
          border: 1px solid rgba(76, 175, 80, 0.3);
        }

        .color-green .header i,
        .color-green .header h4 {
          color: #388e3c;
        }

        .email-metadata {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 25px;
        }

        .email-metadata h3 {
          margin-top: 0;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          color: #5f6368;
        }

        .email-metadata h3 i {
          margin-right: 8px;
        }

        .metadata-grid {
          display: grid;
          grid-template-columns: 120px 1fr;
          row-gap: 10px;
        }

        .metadata-label {
          font-weight: 600;
          color: #5f6368;
        }

        .footer {
          margin-top: 30px;
          text-align: center;
          color: #5f6368;
          font-size: 12px;
          border-top: 1px solid #eaeaea;
          padding-top: 20px;
        }

        .footer img {
          height: 24px;
          vertical-align: middle;
          margin-left: 5px;
        }

        @media print {
          body {
            background-color: white;
          }

          .container {
            box-shadow: none;
            margin: 0;
            max-width: 100%;
          }

          .no-print {
            display: none;
          }

          .print-button {
            display: none;
          }
        }

        @media (max-width: 600px) {
          .container {
            margin: 0;
            border-radius: 0;
          }

          .risk-indicator {
            flex-direction: column;
            text-align: center;
          }

          .risk-icon {
            margin-right: 0;
            margin-bottom: 10px;
          }

          .print-button {
            position: static;
            margin-bottom: 15px;
            text-align: right;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Print button moved to top right -->
        <div class="print-button">
          <button onclick="window.print()">
            <i class="fas fa-print"></i> Print Report
          </button>
        </div>

        <header>
          <div class="logo">
            <i class="fas fa-shield-alt"></i>
            <h1>InboxGuard</h1>
          </div>
          <p>AI-powered phishing email analysis</p>
          <p class="timestamp">Report generated: ${formattedDate}</p>
        </header>

        <!-- Email Metadata -->
        

        <!-- Risk Assessment -->
        <div class="explanation" style="background-color: rgba(244, 67, 54, 0.1);">
          <h3>
            <i class="fas ${riskIcon}" style="color: #d32f2f;"></i>
            <span style="color: #d32f2f;">Risk Level: ${data.risk_assessment}</span>
          </h3>
          <p style="color: #d32f2f; font-weight: 500; margin-bottom: 10px;">Phishing Confidence: ${data.confidence_score}%</p>
          <p>
            ${data.risk_assessment === 'Low' ? 'This email appears mostly legitimate' : 
              data.risk_assessment === 'Medium' ? 'Exercise caution with this email' : 
              data.risk_assessment === 'High' ? 'This email is likely a phishing attempt' : 
              'This is almost certainly a phishing attack'}
          </p>
        </div>

        <!-- Explanation -->
        <div class="explanation">
          <h3><i class="fas fa-info-circle"></i> Analysis Summary</h3>
          <p>${data.explanation}</p>
        </div>

        <!-- Detected Indicators -->
        <div class="indicators-section">
          <h3><i class="fas fa-list-ul"></i> Detected Indicators</h3>
          ${spoofedSenderHTML}
          ${suspiciousLinksHTML}
          ${urgencyHTML}
          ${threatHTML}
          ${dataRequestsHTML}
          ${linguisticHTML}
          ${grammarHTML}
          ${impersonationHTML}
          ${noIndicatorsHTML}
        </div>

        <!-- Footer -->
        <div class="footer">
          <p>InboxGuard - Advanced Email Phishing Protection</p>
          <p>© 2025 InboxGuard</p>
        </div>
      </div>
    </body>
    </html>
  `;
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
    // Check if our floating icon exists, if not, create it
    if (!document.getElementById('inboxguard-floating-icon')) {
      createFloatingIcon(platform);
    } else {
      // If it exists, check if we need to re-scan (new email opened)
      setTimeout(() => {
        scanCurrentEmail(false);
      }, 1000);
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
    
    // Initial floating icon creation
    createFloatingIcon(platform);
    
    // Setup observer for dynamic content changes
    setupObserver();
  }
}

// Start the extension
init();

// Re-check periodically (email clients are SPAs that load content dynamically)
setInterval(() => {
  if (!document.getElementById('inboxguard-floating-icon')) {
    init();
  }
}, 3000);