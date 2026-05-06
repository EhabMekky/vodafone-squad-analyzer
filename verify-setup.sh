#!/bin/bash

# Verification Checklist - Run this after setup to verify everything is configured correctly

echo "🔍 Verifying Automated Test Report Analysis Setup"
echo "=================================================="
echo ""

PASSED=0
FAILED=0

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
pass() {
    echo -e "${GREEN}✅ PASS:${NC} $1"
    ((PASSED++))
}

fail() {
    echo -e "${RED}❌ FAIL:${NC} $1"
    ((FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠️  WARN:${NC} $1"
}

echo "1. Checking file structure..."
echo ""

# Check script directory
if [ -d "script" ]; then
    pass "script/ directory exists"
else
    fail "script/ directory not found"
fi

# Check key files
if [ -f "script/parseAllureReport.js" ]; then
    pass "parseAllureReport.js exists"
else
    fail "parseAllureReport.js not found"
fi

if [ -f "script/package.json" ]; then
    pass "package.json exists"
else
    fail "package.json not found"
fi

if [ -d ".github/workflows" ]; then
    pass ".github/workflows/ directory exists"
else
    fail ".github/workflows/ directory not found"
fi

if [ -f ".github/workflows/test-report.yml" ]; then
    pass "test-report.yml exists"
else
    fail "test-report.yml not found"
    warn "  Run: cp script/.github-workflows-test-report.yml .github/workflows/test-report.yml"
fi

echo ""
echo "2. Checking workflow configuration..."
echo ""

if [ -f ".github/workflows/test-report.yml" ]; then
    # Check if workflow has the required jobs
    if grep -q "analyze-tests" .github/workflows/test-report.yml; then
        pass "Workflow has analyze-tests job"
    else
        fail "Workflow missing analyze-tests job"
    fi
    
    # Check for parse script call
    if grep -q "parseAllureReport.js" .github/workflows/test-report.yml; then
        pass "Workflow calls parseAllureReport.js"
    else
        fail "Workflow doesn't call parseAllureReport.js"
    fi
    
    # Check for artifact upload
    if grep -q "upload-artifact" .github/workflows/test-report.yml; then
        pass "Workflow uploads artifacts"
    else
        fail "Workflow doesn't upload artifacts"
    fi
else
    warn "Skipping workflow checks (test-report.yml not found)"
fi

echo ""
echo "3. Checking Node.js dependencies..."
echo ""

if [ -f "script/package.json" ]; then
    pass "package.json exists"
    
    if [ -d "script/node_modules" ]; then
        pass "node_modules/ exists (dependencies installed)"
        
        if [ -d "script/node_modules/jsdom" ]; then
            pass "jsdom package installed"
        else
            fail "jsdom package not installed"
            warn "  Run: cd script && npm install && cd .."
        fi
    else
        fail "node_modules/ not found (dependencies not installed)"
        warn "  Run: cd script && npm install && cd .."
    fi
else
    fail "package.json not found"
fi

echo ""
echo "4. Checking git configuration..."
echo ""

if [ -d ".git" ]; then
    pass "Git repository detected"
    
    # Check if script files are tracked
    if git ls-files script/ | grep -q "parseAllureReport.js"; then
        pass "Script files are version controlled"
    else
        warn "Script files might not be committed"
        warn "  Run: git add script/ && git commit -m 'Add test report analysis'"
    fi
    
    # Check if workflow is tracked
    if git ls-files .github/workflows/ | grep -q "test-report.yml"; then
        pass "Workflow file is version controlled"
    else
        warn "Workflow might not be committed"
        warn "  Run: git add .github/workflows/test-report.yml && git commit"
    fi
else
    fail "Not a git repository"
fi

echo ""
echo "5. Checking test workflow configuration..."
echo ""

# Find test workflow
TEST_WORKFLOW=$(find .github/workflows -name "*.yml" -o -name "*.yaml" | grep -v test-report | head -1)

if [ -n "$TEST_WORKFLOW" ]; then
    pass "Found test workflow: $TEST_WORKFLOW"
    
    if grep -q "upload-artifact" "$TEST_WORKFLOW"; then
        if grep -q "allure-report\|allure" "$TEST_WORKFLOW"; then
            pass "Test workflow uploads Allure report"
        else
            warn "Test workflow uploads artifacts but may not be Allure report"
            warn "  Check that artifact name is 'allure-report'"
        fi
    else
        fail "Test workflow doesn't upload artifacts"
        warn "  Add upload-artifact step to upload Allure report"
    fi
else
    warn "No test workflow found"
    warn "  Check .github/workflows/ for your test configuration"
fi

echo ""
echo "6. Testing parser script locally..."
echo ""

if [ -f "script/parseAllureReport.js" ] && command -v node &> /dev/null; then
    if node -c script/parseAllureReport.js 2>/dev/null; then
        pass "parseAllureReport.js syntax is valid"
    else
        fail "parseAllureReport.js has syntax errors"
    fi
    
    # Test with help output
    if node script/parseAllureReport.js 2>&1 | grep -q "Usage:"; then
        pass "Script help text works"
    else
        fail "Script help text failed"
    fi
else
    warn "Cannot run syntax check (Node.js not available or file missing)"
fi

echo ""
echo "7. Optional: Checking GitHub Actions prerequisites..."
echo ""

if [ -n "$GITHUB_ACTIONS" ]; then
    pass "Running in GitHub Actions environment"
else
    warn "Not running in GitHub Actions (this is expected for local verification)"
fi

echo ""
echo "════════════════════════════════════════════════════"
echo "VERIFICATION SUMMARY"
echo "════════════════════════════════════════════════════"
echo ""
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All checks passed! Your setup is ready.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Push to GitHub: git push"
    echo "2. Trigger test workflow from GitHub Actions tab"
    echo "3. Check that 'Daily Test Report Analysis' runs after tests"
    echo ""
    exit 0
else
    echo -e "${RED}⚠️  There are $FAILED issue(s) to fix before deployment.${NC}"
    echo ""
    echo "Common fixes:"
    echo "  • Run: npm install (from script/ directory)"
    echo "  • Copy workflow: cp script/.github-workflows-test-report.yml .github/workflows/test-report.yml"
    echo "  • Update test workflow: Add upload-artifact step"
    echo "  • Commit changes: git add . && git commit -m 'Setup test report analysis'"
    echo ""
    exit 1
fi
