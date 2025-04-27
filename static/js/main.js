// InboxGuard main.js - Consolidated JavaScript functionality
console.log("main.js loaded");

// Example emails for demonstration
const examples = {
    'Password Reset': `From: security@netflix.com
Subject: Netflix Password Reset Confirmation

Hello John Smith,

We received a request to reset the password for your Netflix account.

To set a new password, click the link below:
https://netflix.com/passwordreset?token=eyJhbGc1234abcd

This link will expire in 24 hours.

If you didn't request this password reset, you can ignore this email and your password will remain unchanged.

The Netflix Team
1-866-579-7172
`,

    'Bank Alert': `From: account-security@paypal-verification.net
Subject: PayPal: Confirm Your Recent Account Activity

Dear Valued Customer,

We've noticed unusual sign-in activity on your PayPal account.

To verify this activity was authorized, please confirm your account information by clicking the link below:
https://paypal-verification.net/secure-confirm?id=38247659

If we don't receive your confirmation within 48 hours, we may temporarily limit your account functions.

PayPal Security Department
Customer Protection Team`,

    'Package Delivery': `From: refunds@irs-tax-gov.refundportal.com
Subject: IRS: URGENT - Final Notice for Tax Refund Claim #IRS78932

Dear Taxpayer,

Our records indicate you have an unclaimed tax refund of $937.42 from your 2024 tax return.

Your refund must be claimed within 24 hours or it will be forfeited per section 32.1(b) of IRS code.

To claim your refund immediately:
1. Download and complete the attached form: [Refund_Claim_Form.zip]
2. Visit: http://irs-gov-refundportal.com/claim-refund?id=IRS78932

You will need to provide:
- Full Social Security Number
- Date of birth
- Banking information
- Scanned copy of driver's license

Internal Revenue Service
Refund Processing Department`
};
// Initialize application when DOM content is loaded
document.addEventListener('DOMContentLoaded', function() {
    // ================== DOM ELEMENTS ==================
    // Email and analysis elements
    const emailInput = document.getElementById('emailInput');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const clearBtn = document.getElementById('clearBtn');
    const extractLinksBtn = document.getElementById('extractLinksBtn');
    
    const exampleBtns = document.querySelectorAll('.example-btn');
    const resultsPlaceholder = document.getElementById('resultsPlaceholder');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const resultsContainer = document.getElementById('resultsContainer');
    const riskIndicator = document.getElementById('riskIndicator');
    const explanation = document.getElementById('explanation');
    const indicatorsContainer = document.getElementById('indicatorsContainer');
    
    // Panel layout elements
    const panelsContainer = document.getElementById('panels-container');
    const emailPanel = document.getElementById('email-panel');
    const analysisPanel = document.getElementById('analysis-panel');

    // URL preview elements
    const previewForm = document.getElementById('previewForm');
    const urlInput = document.getElementById('urlInput');
    const sandboxFrame = document.getElementById('sandboxFrame');
    const previewContainer = document.getElementById('previewContainer');
    const previewLoadingIndicator = document.getElementById('previewLoadingIndicator');
    const previewUrlText = document.getElementById('previewUrlText');
    const openFullPreviewBtn = document.getElementById('openFullPreviewBtn');
    const previewModal = document.getElementById('previewModal');
    const modalSandboxFrame = document.getElementById('modalSandboxFrame');
    const closeModal = document.getElementById('closeModal');
    const urlValidationFeedback = document.getElementById('urlValidationFeedback');
    const clearUrlBtn = document.getElementById('clearUrlBtn');

    // Tab navigation elements
    const emailTabs = {
        emailContent: {
            tab: document.getElementById('email-content-tab'),
            content: document.getElementById('email-content-panel')
        },
        linkPreview: {
            tab: document.getElementById('link-preview-tab'),
            content: document.getElementById('link-preview-panel')
        }
    };

    // ================== THEME SWITCHING ==================
    const toggleSwitch = document.querySelector('#checkbox');
    const htmlEl = document.documentElement;

    function showThemeNotification(message) {
        if (!document.getElementById('theme-notification')) {
            const notification = document.createElement('div');
            notification.id = 'theme-notification';
            notification.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 10px 20px;
                background-color: ${htmlEl.getAttribute('data-theme') === 'dark' ? '#333' : 'white'};
                color: ${htmlEl.getAttribute('data-theme') === 'dark' ? 'white' : 'black'};
                border: 1px solid ${htmlEl.getAttribute('data-theme') === 'dark' ? '#444' : '#ccc'};
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                font-size: 14px;
                opacity: 0;
                transform: translateY(20px);
                transition: opacity 0.3s ease, transform 0.3s ease;
                z-index: 1000;
            `;
            document.body.appendChild(notification);
        }
        const notification = document.getElementById('theme-notification');
        notification.textContent = message;
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(20px)';
        }, 2000);
    }

    // Initialize theme from localStorage or set default to dark
    if (!localStorage.getItem('theme')) {
        localStorage.setItem('theme', 'dark');
        htmlEl.setAttribute('data-theme', 'dark');
        if (toggleSwitch) toggleSwitch.checked = true;
    } else {
        const savedTheme = localStorage.getItem('theme');
        htmlEl.setAttribute('data-theme', savedTheme);
        if (toggleSwitch) toggleSwitch.checked = savedTheme === 'dark';
    }

    // Theme toggle event listener
    if (toggleSwitch) {
        toggleSwitch.addEventListener('change', function(e) {
            if (e.target.checked) {
                htmlEl.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                showThemeNotification('Dark mode enabled');
            } else {
                htmlEl.setAttribute('data-theme', 'light');
                localStorage.setItem('theme', 'light');
                showThemeNotification('Light mode enabled');
            }
        });
    }

    // ================== TAB NAVIGATION ==================
    function switchEmailTab(tabId) {
        if (!emailTabs[tabId]) return;
        
        Object.values(emailTabs).forEach(tab => {
            if (!tab.content || !tab.tab) return;
            
            tab.content.classList.add('hidden');
            tab.tab.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
            tab.tab.classList.add('text-gray-500');
            tab.tab.setAttribute('aria-selected', 'false');
        });

        emailTabs[tabId].content.classList.remove('hidden');
        emailTabs[tabId].tab.classList.remove('text-gray-500');
        emailTabs[tabId].tab.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
        emailTabs[tabId].tab.setAttribute('aria-selected', 'true');
    }

    // Add tab click listeners
    if (emailTabs.emailContent.tab) {
        emailTabs.emailContent.tab.addEventListener('click', () => switchEmailTab('emailContent'));
    }
    if (emailTabs.linkPreview.tab) {
        emailTabs.linkPreview.tab.addEventListener('click', () => switchEmailTab('linkPreview'));
    }

    // Initialize with email content tab active
    switchEmailTab('emailContent');

    // ================== EXAMPLE EMAILS ==================
    // Load example emails when clicking example buttons
    if (exampleBtns && exampleBtns.length > 0) {
        exampleBtns.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                const exampleName = btn.textContent.trim();
                
                // Extract just the name without the icon
                const nameOnly = exampleName.replace(/^\s*\S+\s*/, '').trim();
                
                if (examples[nameOnly]) {
                    emailInput.value = examples[nameOnly];
                } else {
                    // Fallback for matching by index
                    const keys = Object.keys(examples);
                    if (keys[index]) {
                        emailInput.value = examples[keys[index]];
                    }
                }
            });
        });
    }

    // ================== CLEAR BUTTON ==================
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (emailInput) emailInput.value = '';
            
            // Reset to single view when clearing
            if (panelsContainer) {
                panelsContainer.classList.add('single-view');
                panelsContainer.classList.remove('dual-view');
            }
            
            // Remove active class from analysis panel
            if (analysisPanel) {
                analysisPanel.classList.remove('active');
            }
            
            // Hide results
            if (resultsContainer) {
                resultsContainer.classList.add('hidden');
            }
            
            // Show placeholder
            if (resultsPlaceholder) {
                resultsPlaceholder.classList.remove('hidden');
            }
        });
    }

    // ================== URL PREVIEW FUNCTIONALITY ==================
    // Clear URL input
    if (clearUrlBtn) {
        clearUrlBtn.addEventListener('click', function() {
            if (urlInput) urlInput.value = '';
            if (urlValidationFeedback) urlValidationFeedback.classList.add('hidden');
        });
    }

    // Validate URL input
    function validateUrlInput() {
        if (!urlInput || !urlValidationFeedback) return false;
        
        const url = urlInput.value.trim();
        urlValidationFeedback.classList.remove('hidden', 'url-valid', 'url-invalid');

        if (url === '') {
            urlValidationFeedback.classList.add('hidden');
            return false;
        }

        try {
            new URL(url);
            urlValidationFeedback.textContent = '✓ Valid URL format';
            urlValidationFeedback.classList.add('url-valid');
            urlValidationFeedback.classList.remove('url-invalid');
            return true;
        } catch (e) {
            urlValidationFeedback.textContent = '⚠ Please enter a valid URL (include https://)';
            urlValidationFeedback.classList.add('url-invalid');
            urlValidationFeedback.classList.remove('url-valid');
            return false;
        }
    }

    // Preview form submission
    if (previewForm) {
        previewForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            if (!validateUrlInput()) return;
            
            const url = urlInput.value.trim();
            if (!url) {
                alert('Please enter a URL.');
                return;
            }

            try {
                if (previewContainer) previewContainer.classList.remove('hidden');
                if (sandboxFrame) sandboxFrame.classList.add('hidden');
                if (previewLoadingIndicator) previewLoadingIndicator.classList.remove('hidden');
                if (previewUrlText) previewUrlText.textContent = url;

                const response = await fetch('/preview', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url })
                });
                const data = await response.json();

                if (data.error) {
                    alert(`Error: ${data.error}`);
                    if (previewLoadingIndicator) previewLoadingIndicator.classList.add('hidden');
                } else {
                    if (sandboxFrame) {
                        sandboxFrame.src = data.url;
                        sandboxFrame.onload = () => {
                            if (previewLoadingIndicator) previewLoadingIndicator.classList.add('hidden');
                            sandboxFrame.classList.remove('hidden');
                        };
                    }
                }
            } catch (err) {
                alert('Failed to fetch preview.');
                if (previewLoadingIndicator) previewLoadingIndicator.classList.add('hidden');
            }
        });

        if (urlInput) {
            urlInput.addEventListener('input', validateUrlInput);
        }
    }

    // Open full preview modal
    if (openFullPreviewBtn) {
        openFullPreviewBtn.addEventListener('click', function() {
            if (modalSandboxFrame && sandboxFrame) modalSandboxFrame.src = sandboxFrame.src;
            if (previewModal) previewModal.classList.remove('hidden');
        });
    }

    // Close preview modal
    if (closeModal) {
        closeModal.addEventListener('click', function() {
            if (modalSandboxFrame) modalSandboxFrame.src = '';
            if (previewModal) previewModal.classList.add('hidden');
        });
    }

    // ================== LINK EXTRACTION FROM EMAIL ==================
    if (extractLinksBtn) {
        extractLinksBtn.addEventListener('click', function() {
            if (!emailInput) return;

            const emailContent = emailInput.value.trim();
            if (!emailContent) {
                alert('Please paste an email first.');
                return;
            }

            const urlRegex = /(https?:\/\/[^\s]+)/g;
            const extractedUrls = emailContent.match(urlRegex) || [];

            if (extractedUrls.length === 0) {
                alert('No links found in the email!');
                return;
            }

            // Set the first found link into preview
            if (urlInput) urlInput.value = extractedUrls[0];
            if (previewForm) previewForm.dispatchEvent(new Event('submit')); // Trigger preview

            // Switch to Link Preview Tab
            switchEmailTab('linkPreview');
        });
    }

    // ================== EMAIL ANALYSIS FUNCTIONALITY ==================
    // Function to display analysis results
    function displayResults(result) {
        // Hide loading indicator
        if (loadingIndicator) loadingIndicator.classList.add('hidden');
        
        // Show results container
        if (resultsContainer) resultsContainer.classList.remove('hidden');
        
        // Set risk indicator
        if (riskIndicator) {
            const riskLevel = result.risk_assessment;
            let riskColor, riskBg, riskIcon;
            
            if (riskLevel === 'Low') {
                riskColor = 'text-green-800';
                riskBg = 'bg-green-50 border-green-200';
                riskIcon = 'fa-check-circle';
            } else if (riskLevel === 'Medium') {
                riskColor = 'text-yellow-800';
                riskBg = 'bg-yellow-50 border-yellow-200';
                riskIcon = 'fa-exclamation-circle';
            } else if (riskLevel === 'High') {
                riskColor = 'text-orange-800';
                riskBg = 'bg-orange-50 border-orange-200';
                riskIcon = 'fa-exclamation-triangle';
            } else {
                riskColor = 'text-red-800';
                riskBg = 'bg-red-50 border-red-200';
                riskIcon = 'fa-skull-crossbones';
            }
            
            riskIndicator.className = `mb-6 p-5 rounded-lg flex items-center border ${riskBg}`;
            riskIndicator.innerHTML = `
                <div class="w-16 h-16 rounded-full flex items-center justify-center ${riskBg.replace('bg-', 'bg-opacity-70 bg-')} mr-4">
                    <i class="fas ${riskIcon} text-3xl ${riskColor}"></i>
                </div>
                <div>
                    <h3 class="font-bold text-xl ${riskColor}">Risk Level: ${riskLevel}</h3>
                    <p class="text-lg ${riskColor.replace('800', '700')}">
                        Phishing Confidence: <span class="font-semibold">${result.confidence_score}%</span>
                    </p>
                    <p class="text-sm mt-1 ${riskColor.replace('800', '600')}">
                        ${riskLevel === 'Low' ? 'This email appears mostly legitimate' : 
                        riskLevel === 'Medium' ? 'Exercise caution with this email' :
                        riskLevel === 'High' ? 'This email is likely a phishing attempt' :
                        'This is almost certainly a phishing attack'}
                    </p>
                </div>
            `;
        }
        
        // Set explanation
        if (explanation) {
            explanation.textContent = result.explanation;
        }
        
        // Build indicators sections
        if (indicatorsContainer) {
            indicatorsContainer.innerHTML = '';
            
            const sections = [];
            
            if (result.spoofed_sender) {
                sections.push({
                    title: 'Suspicious Sender',
                    content: result.sender_analysis || 'Sender appears to be spoofed',
                    icon: 'fa-user-secret',
                    color: 'red'
                });
            }
            
            if (result.suspicious_links && result.suspicious_links.length > 0) {
                const linksContent = result.suspicious_links.map(link => `
                    <div class="mb-3 pb-2 border-b border-red-100 last:border-0">
                        <div class="font-medium">${link.text || link.url}</div>
                        <div class="text-sm mt-1 text-red-700">Issues detected:</div>
                        <ul class="list-disc list-inside text-sm pl-2 mt-1 text-red-600">
                            ${link.issues.map(issue => `<li>${issue}</li>`).join('')}
                        </ul>
                    </div>
                `).join('');
                
                sections.push({
                    title: 'Suspicious Links',
                    content: linksContent,
                    icon: 'fa-link',
                    color: 'red'
                });
            }
            
            if (result.urgency_indicators && result.urgency_indicators.length > 0) {
                sections.push({
                    title: 'Urgency Tactics',
                    content: result.urgency_indicators.join('<br>'),
                    icon: 'fa-clock',
                    color: 'orange'
                });
            }
            
            if (result.threat_indicators && result.threat_indicators.length > 0) {
                sections.push({
                    title: 'Threat Manipulation',
                    content: result.threat_indicators.join('<br>'),
                    icon: 'fa-exclamation-triangle',
                    color: 'orange'
                });
            }
            
            if (result.data_requests && result.data_requests.length > 0) {
                sections.push({
                    title: 'Sensitive Information Requests',
                    content: result.data_requests.join('<br>'),
                    icon: 'fa-id-card',
                    color: 'red'
                });
            }
            
            if (result.linguistic_manipulation && result.linguistic_manipulation.length > 0) {
                sections.push({
                    title: 'Manipulation Tactics',
                    content: result.linguistic_manipulation.join('<br>'),
                    icon: 'fa-comment-dots',
                    color: 'yellow'
                });
            }
            
            if (result.grammar_spelling_issues) {
                sections.push({
                    title: 'Grammar & Spelling Issues',
                    content: 'Significant grammar or spelling issues detected',
                    icon: 'fa-spell-check',
                    color: 'yellow'
                });
            }
            
            if (result.impersonation_attempt) {
                sections.push({
                    title: 'Impersonation Attempt',
                    content: `Attempting to impersonate: ${result.impersonation_attempt}`,
                    icon: 'fa-mask',
                    color: 'red'
                });
            }
            
            // Render sections
            sections.forEach(section => {
                let bgColor, borderColor, textColor, iconColor;
                
                if (section.color === 'red') {
                    bgColor = 'bg-red-50';
                    borderColor = 'border-red-200';
                    textColor = 'text-red-800';
                    iconColor = 'text-red-500';
                } else if (section.color === 'orange') {
                    bgColor = 'bg-orange-50';
                    borderColor = 'border-orange-200';
                    textColor = 'text-orange-800';
                    iconColor = 'text-orange-500';
                } else if (section.color === 'yellow') {
                    bgColor = 'bg-yellow-50';
                    borderColor = 'border-yellow-200';
                    textColor = 'text-yellow-800';
                    iconColor = 'text-yellow-500';
                }
                
                const sectionElement = document.createElement('div');
                sectionElement.className = `p-4 rounded-lg ${bgColor} border ${borderColor}`;
                sectionElement.innerHTML = `
                    <div class="flex items-center mb-2">
                        <i class="fas ${section.icon} ${iconColor} mr-2"></i>
                        <h4 class="font-medium ${textColor}">${section.title}</h4>
                    </div>
                    <div class="${textColor}">${section.content}</div>
                `;
                
                indicatorsContainer.appendChild(sectionElement);
            });
            
            // If no indicators (legitimate email)
            if (sections.length === 0) {
                const legitimateElement = document.createElement('div');
                legitimateElement.className = 'p-4 rounded-lg bg-green-50 border border-green-200';
                legitimateElement.innerHTML = `
                    <div class="flex items-center mb-2">
                        <i class="fas fa-check-circle text-green-500 mr-2"></i>
                        <h4 class="font-medium text-green-800">No Phishing Indicators Detected</h4>
                    </div>
                    <div class="text-green-700">This email appears to be legitimate based on our analysis.</div>
                `;
                
                indicatorsContainer.appendChild(legitimateElement);
            }
        }
    }

    // Function to create report popup
    function showReportPopup(result) {
        // Create the popup container
        const popupContainer = document.createElement('div');
        popupContainer.id = 'reportPopup';
        popupContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;

        // Create the popup content
        const popupContent = document.createElement('div');
        popupContent.style.cssText = `
            background-color: white;
            border-radius: 8px;
            padding: 20px;
            width: 80%;
            max-width: 800px;
            max-height: 90%;
            overflow-y: auto;
        `;

        // Add the report content
        popupContent.innerHTML = `
            <h2>Email Analysis Report</h2>
            <p><strong>Email ID:</strong> ${result.email_id}</p>
            <p><strong>Risk Assessment:</strong> ${result.risk_assessment} (${result.confidence_score}%)</p>
            <p>${result.explanation}</p>
            <h3>Details:</h3>
            <ul>
                <li><strong>Spoofed Sender:</strong> ${result.spoofed_sender ? 'Yes' : 'No'}</li>
                <li><strong>Suspicious Links:</strong>
                    <ul>
                        ${result.suspicious_links.map(link => `<li>${link.url} - Issues: ${link.issues.join(', ')}</li>`).join('')}
                    </ul>
                </li>
                <li><strong>Urgency Indicators:</strong> ${result.urgency_indicators.join(', ')}</li>
                <li><strong>Threat Indicators:</strong> ${result.threat_indicators.join(', ')}</li>
            </ul>
            <button id="closePopup" style="margin-top: 20px; padding: 10px 20px; background-color: #4285f4; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
        `;

        // Add the popup content to the container
        popupContainer.appendChild(popupContent);

        // Add the popup to the body
        document.body.appendChild(popupContainer);

        // Add event listener to close the popup
        document.getElementById('closePopup').addEventListener('click', () => {
            document.body.removeChild(popupContainer);
        });
    }

    // Analyze button click handler
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', async () => {
            if (!emailInput) return;
            
            const emailText = emailInput.value.trim();
            if (!emailText) {
                alert('Please enter or paste an email to analyze');
                return;
            }

            // Show loading indicator
            if (resultsPlaceholder) resultsPlaceholder.classList.add('hidden');
            if (resultsContainer) resultsContainer.classList.add('hidden');
            if (loadingIndicator) loadingIndicator.classList.remove('hidden');
            
            // Switch to dual view layout before analysis starts
            if (panelsContainer) {
                panelsContainer.classList.remove('single-view');
                panelsContainer.classList.add('dual-view');
            }
            
            // Show analysis panel with animation after a tiny delay
            if (analysisPanel) {
                setTimeout(function() {
                    analysisPanel.classList.add('active');
                }, 10);
            }

            try {
                const response = await fetch('/analyze', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email_text: emailText }),
                });

                if (!response.ok) {
                    throw new Error(`Server responded with status: ${response.status}`);
                }

                const result = await response.json();
                
                if (result.error) {
                    alert(`Error: ${result.error}`);
                    if (loadingIndicator) loadingIndicator.classList.add('hidden');
                    if (resultsPlaceholder) resultsPlaceholder.classList.remove('hidden');
                    return;
                }
                
                displayResults(result);
                // Uncomment to show popup report
                // showReportPopup(result);
            } catch (error) {
                console.error('Error during analysis:', error);
                alert(`Error: ${error.message}`);
                if (loadingIndicator) loadingIndicator.classList.add('hidden');
                if (resultsPlaceholder) resultsPlaceholder.classList.remove('hidden');
            }
        });
    }

    // ================== CHECK FOR EMAIL REPORT FROM URL PARAMETER ==================
    // Check for email_id parameter in URL and load report if present
    const urlParams = new URLSearchParams(window.location.search);
    const emailId = urlParams.get('email_id');

    if (emailId) {
        (async function loadReportFromUrl() {
            try {
                const response = await fetch(`/report?email_id=${emailId}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch the report');
                }

                const reportHtml = await response.text();

                // Create a popup container
                const popupContainer = document.createElement('div');
                popupContainer.id = 'reportPopup';
                popupContainer.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                `;

                // Create the popup content
                const popupContent = document.createElement('div');
                popupContent.style.cssText = `
                    background-color: white;
                    border-radius: 8px;
                    padding: 20px;
                    width: 80%;
                    max-width: 800px;
                    max-height: 90%;
                    overflow-y: auto;
                `;

                popupContent.innerHTML = reportHtml;

                // Add a close button
                const closeButton = document.createElement('button');
                closeButton.textContent = 'Close';
                closeButton.style.cssText = `
                    margin-top: 20px;
                    padding: 10px 20px;
                    background-color: #4285f4;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                `;
                closeButton.addEventListener('click', () => {
                    document.body.removeChild(popupContainer);
                });

                popupContent.appendChild(closeButton);
                popupContainer.appendChild(popupContent);
                document.body.appendChild(popupContainer);
            } catch (error) {
                console.error('Error fetching the report:', error);
                alert('Failed to load the report. Please try again.');
            }
        })();
    }
});