#!/bin/bash

# Quick Setup Script for Automated Test Report Analysis
# This script helps you integrate the analysis tool into your GitHub repository

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     Automated Test Report Analysis - Quick Setup               ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check if we're in a git repository
if [ ! -d .git ]; then
    echo "❌ Error: Not a git repository. Please run this from your repo root."
    exit 1
fi

echo "📍 Detected repository: $(pwd)"
echo ""

# Step 1: Copy script files
echo "📋 Step 1: Copying analysis script files..."
mkdir -p script
cp parseAllureReport.js script/ 2>/dev/null || echo "  ⚠️  parseAllureReport.js not found"
cp package.json script/ 2>/dev/null || echo "  ⚠️  package.json not found"
echo "✅ Script files copied to ./script/"
echo ""

# Step 2: Create GitHub Actions workflow directory
echo "📋 Step 2: Creating GitHub Actions workflow..."
mkdir -p .github/workflows

# Copy the main workflow
if [ -f ".github-workflows-test-report.yml" ]; then
    cp .github-workflows-test-report.yml .github/workflows/test-report.yml
    echo "✅ Workflow created: .github/workflows/test-report.yml"
else
    echo "⚠️  Workflow template not found. You'll need to manually create it."
    echo "   Copy .github-workflows-test-report.yml to .github/workflows/test-report.yml"
fi
echo ""

# Step 3: Check for existing test workflow
echo "📋 Step 3: Checking for existing test workflow..."
if [ -f ".github/workflows/test.yml" ]; then
    echo "✅ Found: .github/workflows/test.yml"
elif [ -f ".github/workflows/tests.yml" ]; then
    echo "✅ Found: .github/workflows/tests.yml"
elif [ -f ".github/workflows/ci.yml" ]; then
    echo "✅ Found: .github/workflows/ci.yml"
else
    echo "⚠️  No test workflow found in .github/workflows/"
    echo "   Please create one or update an existing workflow to upload Allure report"
    echo "   See EXAMPLE-test-workflow.yml for reference"
fi
echo ""

# Step 4: Install dependencies
echo "📋 Step 4: Installing dependencies..."
cd script
npm install --silent 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed"
else
    echo "⚠️  Failed to install dependencies. Run 'npm install' manually in ./script/"
fi
cd ..
echo ""

# Step 5: Summary and next steps
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    Setup Complete! ✨                          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "📝 Next Steps:"
echo ""
echo "1. 📋 Update your test workflow:"
echo "   • Add 'Upload Allure Report' step (see EXAMPLE-test-workflow.yml)"
echo "   • Ensure artifact is named 'allure-report'"
echo ""
echo "2. ⚙️  Configure the analysis workflow:"
echo "   • Edit .github/workflows/test-report.yml"
echo "   • Change 'workflows: [\"Run Tests\"]' to match your test workflow name"
echo ""
echo "3. 🔔 (Optional) Setup Slack notifications:"
echo "   • Create webhook: https://api.slack.com/messaging/webhooks"
echo "   • Add secret: SLACK_WEBHOOK_URL to your repository"
echo ""
echo "4. 🧪 Test it:"
echo "   • Push to GitHub"
echo "   • Manually trigger test workflow from Actions tab"
echo "   • Check if 'Daily Test Report Analysis' runs after tests complete"
echo ""
echo "📚 Documentation:"
echo "   • README.md      - Full feature documentation"
echo "   • SETUP.md       - Detailed setup guide"
echo "   • EXAMPLE-*      - Example workflow configurations"
echo ""
echo "💡 Manual testing (before GitHub):"
echo "   cd script"
echo "   node parseAllureReport.js /path/to/allure-report/index.html"
echo ""
echo "Happy testing! 🚀"
