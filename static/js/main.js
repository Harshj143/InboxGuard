// Example emails for demonstration
console.log(" main.js loaded");

const examples = {
    'Bank Alert': `From: security@secure-banking-alerts.com
Subject: URGENT: Your Bank Account Access Has Been Limited

Dear Valued Customer,

We have detected unusual activity on your account. Your account access has been limited for your security.

You must verify your identity immediately to restore full access to your account. Please click the secure link below:

https://secure-banking-verification.com-secure.xyz/verify

You will need to provide:
- Full name
- Account number
- Social security number
- Current password

This is time sensitive. If you do not verify within 24 hours, your account will be suspended.

Security Department
Customer Protection Team`,

    'Password Reset': `From: noreply@microsoft-password-service.com
Subject: Your Microsoft Password Will Expire Today

Your Microsoft password will expire in 12 hours. To prevent loss of access, please reset your password immediately.

Click here to update your password now:
http://ms-password-update.info/secure

This message was sent from an unmonitored email address. Please do not reply.

IT Support Team
Microsoft Services`,

    'Package Delivery': `From: delivery-notification@fedex-delivery.com
Subject: FedEx: Delivery Attempt Notification #38247659

FedEx attempted to deliver your package today but was unable to complete the delivery. 

Your package is being held at our facility for 24 hours before it will be returned to sender.

To schedule a new delivery or pick up your package, please download the attached shipping document: [Shipping_Document.pdf.exe]

Or visit: http://fedex-rescheduling.delivery/claim?id=38247659

FedEx Customer Service`
};

// DOM Elements
document.addEventListener('DOMContentLoaded', function() {
    const emailInput = document.getElementById('emailInput');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const clearBtn = document.getElementById('clearBtn');
    
    const exampleBtns = document.querySelectorAll('.example-btn');
    const resultsPlaceholder = document.getElementById('resultsPlaceholder');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const resultsContainer = document.getElementById('resultsContainer');
    const riskIndicator = document.getElementById('riskIndicator');
    const explanation = document.getElementById('explanation');
    const indicatorsContainer = document.getElementById('indicatorsContainer');
    
    // Get panel container elements for layout management
    const panelsContainer = document.getElementById('panels-container');
    const emailPanel = document.getElementById('email-panel');
    const analysisPanel = document.getElementById('analysis-panel');

    // Load example emails
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

    // Clear button
    clearBtn.addEventListener('click', () => {
        emailInput.value = '';
        
        // Reset to single view when clearing
        panelsContainer.classList.add('single-view');
        panelsContainer.classList.remove('dual-view');
        
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

    // Modify the analyze button click handler
    analyzeBtn.addEventListener('click', async () => {
        const emailText = emailInput.value.trim();
        if (!emailText) {
            alert('Please enter or paste an email to analyze');
            return;
        }

        // Show loading indicator
        resultsPlaceholder.classList.add('hidden');
        resultsContainer.classList.add('hidden');
        loadingIndicator.classList.remove('hidden');
        
        // Switch to dual view layout before analysis starts
        panelsContainer.classList.remove('single-view');
        panelsContainer.classList.add('dual-view');
        
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
            loadingIndicator.classList.add('hidden');
            resultsPlaceholder.classList.remove('hidden');
            return;
        }

        // Show the report in a popup
        showReportPopup(result);
    } catch (error) {
        console.error('Error during analysis:', error);
        alert(`Error: ${error.message}`);
        loadingIndicator.classList.add('hidden');
        resultsPlaceholder.classList.remove('hidden');
    }
});

    function displayResults(result) {
        // Hide loading indicator
        loadingIndicator.classList.add('hidden');
        
        // Show results container
        resultsContainer.classList.remove('hidden');
        
        // Risk indicator
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
        
        // Explanation
        explanation.textContent = result.explanation;
        
        // Indicators
        indicatorsContainer.innerHTML = '';
        
        // Build indicators sections
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
});

// Add logic to display a popup with the report when an email ID is passed in the query string
window.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const emailId = urlParams.get('email_id');

    if (emailId) {
        try {
            const response = await fetch(`/report?email_id=${emailId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch the report');
            }

            const reportData = await response.json();
            
            // Switch to dual view and show analysis panel
            panelsContainer.classList.remove('single-view');
            panelsContainer.classList.add('dual-view');
            
            if (analysisPanel) {
                analysisPanel.classList.add('active');
            }

            // Display results in the analysis panel
            displayResults(reportData);
        } catch (error) {
            console.error('Error fetching the report:', error);
            alert('Failed to load the report. Please try again.');
        }
    }
});