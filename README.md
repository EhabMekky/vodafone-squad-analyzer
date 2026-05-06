# Automated Allure Test Report Analysis

This solution automates your daily test report analysis workflow, eliminating manual downloads and analysis of Allure reports.

## 🎯 What It Does

- **Automatically parses** Allure HTML reports from GitHub Actions
- **Extracts metrics**: pass rate, pass count, fail count, skip count
- **Analyzes failures** and groups them by package/directory
- **Generates reports**: 
  - Beautiful HTML dashboard
  - Machine-readable JSON summary
  - GitHub PR comments (optional)
  - Slack notifications (optional)

## 📁 File Structure

```
script/
├── parseAllureReport.js          # Main parser script
├── package.json                   # Dependencies
├── .github-workflows-test-report.yml  # GitHub Actions workflow
└── README.md                      # This file
```

## 🚀 Quick Start

### Step 1: Install Dependencies

```bash
cd script
npm install
```

### Step 2: Configure Your Test Pipeline

In your main test workflow (e.g., `.github/workflows/test.yml`), ensure you upload the Allure report as an artifact:

```yaml
- name: Upload Allure Report
  uses: actions/upload-artifact@v3
  with:
    name: allure-report
    path: target/site/allure-report/  # Adjust path to your Allure output
  if: always()
```

### Step 3: Add the Analysis Workflow

1. Create `.github/workflows/` directory if it doesn't exist
2. Copy the workflow file:
   ```bash
   cp .github-workflows-test-report.yml .github/workflows/test-report.yml
   ```
3. Update the workflow to match your test workflow name:
   ```yaml
   workflow_run:
     workflows: ["Your Test Workflow Name"]  # Change this!
   ```

### Step 4: Configure Slack Notifications (Optional)

1. Create a Slack webhook URL: https://api.slack.com/messaging/webhooks
2. Add it as a GitHub secret:
   - Go to Settings → Secrets → New repository secret
   - Name: `SLACK_WEBHOOK_URL`
   - Value: Your webhook URL

## 🔧 Manual Usage

Run the parser directly on any Allure report:

```bash
# Generate both HTML and JSON reports
node parseAllureReport.js /path/to/allure.html

# Generate only JSON
node parseAllureReport.js /path/to/allure.html --format json --output-json analysis.json

# Generate only HTML
node parseAllureReport.js /path/to/allure.html --format html --output-html report.html

# Specify both output files
node parseAllureReport.js /path/to/allure.html \
  --output-json analysis.json \
  --output-html report.html
```

## 📊 Output Files

### test-report.html
Beautiful interactive dashboard showing:
- Summary statistics (total, passed, failed, skipped)
- Pass rate visualization
- Failures grouped by package
- Top failure reasons
- Responsive design

### test-analysis.json
Structured data for programmatic use:
```json
{
  "total": 150,
  "passed": 135,
  "failed": 10,
  "skipped": 5,
  "passRate": 90,
  "failuresByPackage": {
    "com.example.auth": {
      "count": 5,
      "tests": ["test1", "test2", ...]
    }
  },
  "failureReasons": [
    {
      "reason": "Connection timeout",
      "package": "com.example.auth"
    }
  ],
  "duration": 3600000,
  "timestamp": "2024-05-03T10:30:00.000Z"
}
```

## 🔄 Workflow Triggers

The analysis runs automatically on:

1. **After test completion**: When your test workflow finishes
2. **Schedule**: Every weekday at 8:00 AM UTC (edit cron in workflow)
3. **Manual trigger**: You can also trigger workflows manually from GitHub Actions tab

## 🎨 Customization

### Change Schedule
Edit `.github/workflows/test-report.yml`:
```yaml
schedule:
  - cron: '0 8 * * 1-5'  # Monday-Friday 8 AM UTC
  # Other examples:
  # '0 9 * * *'         # Daily at 9 AM UTC
  # '0 8-17 * * 1-5'    # Every hour 8 AM-5 PM on weekdays
```

### Change Test Workflow Name
Update this line in the workflow:
```yaml
workflows: ["Your Actual Test Workflow Name"]
```

### Customize Report Path Detection
Edit the "Find Allure report HTML" step to match your artifact structure:
```bash
# Look for your specific report location
find . -path "*your-custom-path*" -name "index.html"
```

## 📈 GitHub PR Integration

The workflow automatically comments on PRs with a test summary table:

| Metric | Value |
|--------|-------|
| Total Tests | 150 |
| Passed ✅ | 135 |
| Failed ❌ | 10 |
| Skipped ⏭️ | 5 |
| Pass Rate | 90% |

*This requires `GITHUB_TOKEN` which is automatically available*

## 🔔 Slack Integration

Get instant notifications in your Slack channel with:
- Overall pass/fail statistics
- Link to full report
- Quick action buttons

**Setup**: Add `SLACK_WEBHOOK_URL` secret to your repository

## 🐛 Troubleshooting

### "Report file not found"
- Check that Allure report artifact is being uploaded in your test workflow
- Verify the artifact name matches in both workflows
- Check artifact path after upload

### "jsdom error"
```bash
# Ensure dependencies are installed
npm install
```

### Report looks empty
- Allure HTML structure may have changed
- Check browser console for parsing errors
- Verify Allure report is properly generated

### Workflow not triggering
- Ensure test workflow name matches exactly (case-sensitive!)
- Check that test workflow uploads artifacts
- Manually trigger from GitHub Actions tab to test

## 💡 Advanced: Send to Email

Add this step to send email notifications:

```yaml
- name: Send Email Report
  uses: dawidd6/action-send-mail@v3
  with:
    server_address: smtp.gmail.com
    server_port: 465
    username: ${{ secrets.EMAIL_USERNAME }}
    password: ${{ secrets.EMAIL_PASSWORD }}
    subject: 'Daily Test Report - ${{ github.repository }}'
    to: your-email@example.com
    from: bot@example.com
    body: |
      Test Results for ${{ github.repository }}
      Pass Rate: ${{ fromJson(steps.parse-results.outputs.analysis).passRate }}%
      
      View full report in GitHub Actions.
    attachments: test-report.html,test-analysis.json
  if: always()
```

## 📋 Next Steps

1. **Install dependencies**: `npm install`
2. **Update test workflow**: Add artifact upload step
3. **Copy analysis workflow**: Move to `.github/workflows/`
4. **Configure notifications**: Add Slack webhook (optional)
5. **Test**: Push to repo and check GitHub Actions tab

## 📞 Support

Check:
- GitHub Actions tab for workflow logs
- Artifact section to verify report upload
- Workflow syntax at https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions

---

**Now every morning, your test analysis happens automatically! ✨**
