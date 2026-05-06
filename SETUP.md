# 🚀 Setup Guide: Automated Test Report Analysis

This guide walks you through setting up automated test report analysis in your GitHub repository.

## Prerequisites

- GitHub repository with TestNG tests
- GitHub Actions already enabled
- Maven or similar build tool configured
- (Optional) Slack workspace for notifications

## Step 1: Add Analysis Files to Your Repository

### Option A: Using Git

```bash
# Clone/sync the script files to your repo
cp -r /Users/ehab.mohamed1/Desktop/script/* /path/to/your/repo/script/

# Commit the files
cd /path/to/your/repo
git add script/
git commit -m "Add automated test report analysis"
git push
```

### Option B: Manual Setup

1. In your repository root, create `script/` directory
2. Copy these files:
   - `parseAllureReport.js`
   - `package.json`
   - `README.md`
   - `.gitignore`

3. Create `.github/workflows/test-report.yml` (copy from `.github-workflows-test-report.yml`)

## Step 2: Update Your Test Workflow

Find your existing test workflow (typically `.github/workflows/test.yml` or similar):

### For Maven + TestNG:

```yaml
name: Run Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
          cache: maven

      - name: Run Tests
        run: mvn test -Dallure.results.directory=allure-results
        continue-on-error: true

      - name: Generate Allure Report
        if: always()
        run: |
          # Install Allure or use Docker
          npm install -g allure-commandline
          allure generate allure-results --clean -o allure-report

      # 👇 IMPORTANT: Add this step to upload the report
      - name: Upload Allure Report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: allure-report
          path: allure-report/
          retention-days: 30

# Once you upload the artifact, the analysis workflow will automatically run!
```

### For Other Build Tools:

**Gradle:**
```yaml
- name: Run Tests
  run: ./gradlew test --info
  
- name: Generate Allure Report
  if: always()
  run: |
    npm install -g allure-commandline
    allure generate build/allure-results --clean -o allure-report

- name: Upload Report
  uses: actions/upload-artifact@v3
  with:
    name: allure-report
    path: allure-report/
```

**Docker (TestNG + Allure):**
```yaml
- name: Run Tests in Container
  run: |
    docker run --rm \
      -v ${{ github.workspace }}:/app \
      -w /app \
      maven:3.8-openjdk-17 \
      mvn test -Dallure.results.directory=allure-results

- name: Upload Allure Report
  uses: actions/upload-artifact@v3
  with:
    name: allure-report
    path: allure-report/
```

## Step 3: Configure the Analysis Workflow

Copy the file `.github-workflows-test-report.yml` to `.github/workflows/test-report.yml`:

```bash
mkdir -p .github/workflows
cp script/.github-workflows-test-report.yml .github/workflows/test-report.yml
```

### Update the workflow name trigger

Edit `.github/workflows/test-report.yml` and change this line to match your test workflow name:

```yaml
workflow_run:
  workflows: ["Run Tests"]  # ⚠️ Must match your actual workflow name exactly!
```

**How to find your workflow name:**
- Go to Actions tab in GitHub
- Look at the workflow names listed
- Use the exact name in the YAML

## Step 4: (Optional) Setup Slack Notifications

### Create a Slack Webhook

1. Go to: https://api.slack.com/messaging/webhooks
2. Click "Create New App" or use existing workspace
3. Select your workspace
4. Enable "Incoming Webhooks"
5. Click "Add New Webhook to Workspace"
6. Select channel where you want notifications
7. Copy the webhook URL

### Add to GitHub Secrets

1. Go to your repository Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `SLACK_WEBHOOK_URL`
4. Value: Paste your webhook URL
5. Click "Add secret"

That's it! Slack notifications will now be sent after each test run.

## Step 5: Test Your Setup

### Trigger a test run manually:

1. Go to Actions tab
2. Select "Run Tests" workflow
3. Click "Run workflow"
4. Wait for tests to complete

### Check if analysis ran:

1. Go to Actions tab again
2. Look for "Daily Test Report Analysis" workflow
3. It should appear after "Run Tests" completes
4. Click on it to see logs

### View the reports:

1. In the workflow run, scroll to "Artifacts"
2. Download `test-analysis` folder
3. Open `test-report.html` in browser
4. View `test-analysis.json` in any text editor

## Step 6: Customize for Your Needs

### Change the scheduled time

Edit `.github/workflows/test-report.yml`:

```yaml
schedule:
  - cron: '0 9 * * 1-5'  # 9 AM UTC, Monday-Friday
```

**Cron examples:**
- `0 8 * * 1-5` = 8 AM, Mon-Fri
- `30 7 * * *` = 7:30 AM every day
- `0 10 * * 0` = 10 AM every Sunday
- `0 */4 * * *` = Every 4 hours

### Change HTML report styling

Edit `script/parseAllureReport.js` and modify the `generateHTML()` method's CSS section.

### Add more analysis metrics

Edit the `extractFailureDetails()` method in `parseAllureReport.js` to track additional info.

## 🔍 Troubleshooting

### ❌ Workflow doesn't trigger automatically

**Problem:** "Daily Test Report Analysis" doesn't run after tests

**Solution:**
1. Check workflow name is exactly correct (case-sensitive!)
2. Verify artifact is being uploaded in test workflow
3. Manually trigger from Actions tab to test
4. Check workflow logs for errors

### ❌ "Allure report not found"

**Problem:** Analysis workflow can't find the report

**Solution:**
1. Check test workflow actually uploads artifact
2. Verify artifact name is "allure-report"
3. Ensure artifact path contains the HTML report
4. Try different report path detection in workflow

### ❌ No Slack notification

**Problem:** Messages not appearing in Slack

**Solution:**
1. Verify webhook URL is correct
2. Check secret is added to repository
3. Ensure channel selected when creating webhook
4. Check workflow logs for API errors

### ❌ Report shows incorrect data

**Problem:** Metrics don't match actual test results

**Solution:**
1. Check Allure report HTML format matches parser expectations
2. Verify Allure version and HTML structure
3. Add debug logging to parser script
4. Compare with manual Allure report inspection

## 📊 What Happens Now

Every time your tests run:

1. ✅ Tests execute in your workflow
2. 📊 Allure report is generated and uploaded
3. 📈 Analysis workflow automatically triggers
4. 📝 HTML report and JSON data are created
5. 📢 Slack notification sent (if configured)
6. 💬 GitHub PR comment added (if PR)
7. 🎯 You see all metrics without manual work!

## 🎯 Next Morning Check

Instead of:
- Downloading Allure report
- Manually counting pass/fail
- Analyzing failure reasons
- Creating a summary

You just:
- Check Slack notification
- Or open the HTML report
- Done! ✨

---

## Useful Links

- [Allure Report Documentation](https://docs.qameta.io/allure/)
- [GitHub Actions Workflows](https://docs.github.com/en/actions)
- [Cron Syntax](https://crontab.guru/)
- [Slack Webhooks](https://api.slack.com/messaging/webhooks)

---

**Need help?** Check the main README.md for troubleshooting and advanced customization!
