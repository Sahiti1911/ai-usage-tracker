# Privacy Policy for AI Prompt Monitor Extension

**Last Updated: May 20, 2026**

## Overview

The AI Prompt Monitor Extension ("**Extension**") is designed to help users review and analyze their AI prompts. This Privacy Policy explains what data we collect, how we use it, and your rights regarding your information.

## 1. Data We Collect

### 1.1 Prompt Data

The Extension captures:

- **User prompts and queries** sent to supported AI platforms (ChatGPT, Claude, Gemini, and other supported AI services)
- **Metadata** including:
  - Timestamps of interactions
  - Which AI platform you're using
  - Browser tab information (title, URL)
  - A unique session identifier

### 1.2 Usage Data

We collect:

- Frequency and timing of Extension use
- Which AI platforms you interact with
- General usage patterns to improve the Extension

## 2. How We Use Your Data

We collect and use your data for the following purposes:

- **Monitoring and logging**: To maintain a record of your AI interactions for your personal review
- **Analysis and insights**: To categorize prompts by intent, identify risk levels, and flag potentially sensitive data (optional, requires Azure OpenAI configuration)
- **Service improvement**: To enhance the Extension's features and reliability
- **Performance monitoring**: To ensure the backend service is functioning properly
- **Debugging**: To identify and fix technical issues

## 3. Data Storage and Backend

### 3.1 Data Transmission

Your captured prompts are transmitted to our backend server ("**Backend**") hosted on Render.com for:

- Storage in a structured log file (JSONL format)
- Optional AI-powered analysis using Azure OpenAI services

### 3.2 Data Retention

- Prompts are stored in memory during your session
- Logs are persisted to `data/prompt-logs.jsonl` on the Backend
- You can view your logged prompts through the Extension's dashboard
- Data is retained as long as the Backend service is operational

### 3.3 Data Security

- All communication between the Extension and Backend occurs over HTTPS (secure connection)
- Data is stored on Render.com infrastructure
- Reasonable security measures are implemented to protect backend access

## 4. Data Sharing and Selling

**We do NOT:**

- Sell your data to third parties
- Share your prompts with external organizations
- Use your data for marketing or advertising purposes
- Disclose your prompts to unauthorized parties
- Transfer your data to jurisdictions outside the US/EU without security measures

**We MAY:**

- Share aggregated, anonymized analytics with service providers (e.g., hosting platform administrators for technical support)
- Disclose data if required by law, legal process, or government request

## 5. Azure OpenAI Analysis (Optional)

If you configure Azure OpenAI credentials in the Backend:

- Your prompts will be sent to Azure OpenAI's API for analysis
- Analysis results (intent, category, risk level, sensitive data flags) are stored alongside your prompt
- Azure follows its own privacy practices: [Azure Privacy Statement](https://privacy.microsoft.com/en-us/privacystatement)
- This feature is **optional** and only enabled if you provide Azure credentials

## 6. Third-Party Services

### Render.com

- Hosts our Backend server
- [Render Privacy Policy](https://render.com/privacy)

### Azure OpenAI (if configured)

- Processes prompts for optional analysis
- [Microsoft Privacy Statement](https://privacy.microsoft.com/en-us/privacystatement)

### Supported AI Platforms

- The Extension interacts with platforms like ChatGPT, Claude, and Gemini
- The Extension only runs on supported AI websites defined in the extension manifest
- Each platform has its own privacy policy that governs their handling of your interactions

## 7. Your Rights and Controls

### 7.1 Access and Review

- You can view all captured prompts through the Extension's popup dashboard
- Access your recent prompts via the `/logs` endpoint on the Backend

### 7.2 Deletion

- You can remove the Extension from your browser at any time
- Uninstalling the Extension will stop future data collection
- Historical data stored on the Backend is managed separately

### 7.3 User Control

- The Extension only operates after you manually install and enable it
- You can disable or uninstall the Extension at any time to stop all data collection
- Configure the Extension to only capture specific AI platforms

## 8. Data Subject Rights

If you are a resident of the EU (GDPR) or California (CCPA), you may have the following rights:

- **Right to access**: Request a copy of your data
- **Right to deletion**: Request deletion of your data (subject to legal retention requirements)
- **Right to portability**: Request your data in a structured format
- **Right to opt-out**: Opt out of data collection by uninstalling the Extension

To exercise these rights, contact us at [lakkojusahiti@gmail.com].

## 9. Children's Privacy

The Extension is not intended for use by children under 13 years old. We do not knowingly collect data from children. If you believe we have collected data from a child, please contact us immediately.

## 10. Changes to This Policy

We may update this Privacy Policy from time to time. Changes will be effective immediately upon posting to this page. Your continued use of the Extension constitutes acceptance of the updated Privacy Policy.

## 11. Contact Us

If you have any questions about this Privacy Policy or our privacy practices, please contact us:

- **Email**: [lakkojusahiti@gmail.com]
- **GitHub Repository**: [[link to your repo](https://github.com/Sahiti1911/ai-usage-tracker)]

## 12. Compliance

This Extension aims to follow:

- Industry privacy best practices
- Chrome Web Store Developer Program Policies
- General Data Protection Regulation (GDPR) guidelines
- California Consumer Privacy Act (CCPA) principles

_Note: While we strive to respect user privacy, please review this policy carefully to understand our data practices._

---

**Your privacy matters.** Thank you for trusting AI Prompt Monitor Extension with your data.
