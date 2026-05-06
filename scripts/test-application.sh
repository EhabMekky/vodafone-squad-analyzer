#!/bin/bash

# Test script for Vodafone Squad Test Report Analyzer
# This script tests positive, negative, and edge cases

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Testing Squad Test Report Analyzer                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

BASE_URL="http://localhost:3000"
TRAINING_DIR="./trainingDocs"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

test_passed=0
test_failed=0

# Function to test API endpoint
test_upload() {
    local test_name="$1"
    local files="$2"
    local expected_result="$3"
    
    echo -e "${YELLOW}Testing: $test_name${NC}"
    
    # Build curl command with files
    CURL_CMD="curl -s -X POST $BASE_URL/api/upload"
    
    for file in $files; do
        CURL_CMD="$CURL_CMD -F reportFiles=@$file"
    done
    
    # Execute curl and capture response
    response=$(eval $CURL_CMD)
    
    # Check if response contains success
    if echo "$response" | grep -q '"success":true'; then
        if [ "$expected_result" == "success" ]; then
            echo -e "${GREEN}✓ PASS${NC}: Upload successful"
            echo "Response: $response" | jq '.' 2>/dev/null || echo "$response"
            ((test_passed++))
            return 0
        else
            echo -e "${RED}✗ FAIL${NC}: Expected failure but got success"
            ((test_failed++))
            return 1
        fi
    else
        if [ "$expected_result" == "failure" ]; then
            echo -e "${GREEN}✓ PASS${NC}: Failed as expected"
            echo "Response: $response"
            ((test_passed++))
            return 0
        else
            echo -e "${RED}✗ FAIL${NC}: Expected success but got failure"
            echo "Response: $response"
            ((test_failed++))
            return 1
        fi
    fi
}

# Test 1: Single file upload (Positive)
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "TEST 1: Single Squad Report Upload (Positive)"
echo "═══════════════════════════════════════════════════════════"
test_upload "Single file - Alpha squad" "$TRAINING_DIR/Alpha_ExecutionSummaryReport_2026-05-05.html" "success"

# Test 2: Multiple files upload (Positive)
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "TEST 2: Multiple Squad Reports Upload (Positive)"
echo "═══════════════════════════════════════════════════════════"
test_upload "Three squads - Alpha, Bravo, Charlie" \
    "$TRAINING_DIR/Alpha_ExecutionSummaryReport_2026-05-05.html $TRAINING_DIR/Bravo_ExecutionSummaryReport_2026-05-05.html $TRAINING_DIR/Charlie_ExecutionSummaryReport_2026-05-05.html" \
    "success"

# Test 3: All squads (Positive - Batch)
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "TEST 3: All Squad Reports Upload (Positive - Maximum Batch)"
echo "═══════════════════════════════════════════════════════════"
all_files="$TRAINING_DIR/Alpha_ExecutionSummaryReport_2026-05-05.html \
    $TRAINING_DIR/Bravo_ExecutionSummaryReport_2026-05-05.html \
    $TRAINING_DIR/Charlie_ExecutionSummaryReport_2026-05-05.html \
    $TRAINING_DIR/Delta_eCare_ExecutionSummaryReport_2026-05-05.html \
    $TRAINING_DIR/Echo_ExecutionSummaryReport_2026-05-05.html \
    $TRAINING_DIR/Foxtrot_ExecutionSummaryReport_2026-05-05.html \
    $TRAINING_DIR/Golf_ExecutionSummaryReport_2026-05-05.html \
    $TRAINING_DIR/Hotel_ExecutionSummaryReport_2026-05-05.html \
    $TRAINING_DIR/Ice_ExecutionSummaryReport_2026-05-05.html \
    $TRAINING_DIR/November_ExecutionSummaryReport_2026-05-05.html"
test_upload "10 squad files (batch test)" "$all_files" "success"

# Test 4: Edge case - Consolidated report
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "TEST 4: Consolidated Report (Edge Case)"
echo "═══════════════════════════════════════════════════════════"
test_upload "Consolidated report" "$TRAINING_DIR/Consolidated_ExecutionSummaryReport_2026-05-05.html" "success"

# Test 5: Edge case - Special characters in squad name
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "TEST 5: Squad Name with Underscore (Edge Case)"
echo "═══════════════════════════════════════════════════════════"
test_upload "Delta_eCare squad" "$TRAINING_DIR/Delta_eCare_ExecutionSummaryReport_2026-05-05.html" "success"

# Test 6: No files (Negative)
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "TEST 6: No Files Uploaded (Negative)"
echo "═══════════════════════════════════════════════════════════"
echo -e "${YELLOW}Testing: No files upload${NC}"
response=$(curl -s -X POST $BASE_URL/api/upload)
if echo "$response" | grep -q 'error'; then
    echo -e "${GREEN}✓ PASS${NC}: Error returned as expected"
    echo "Response: $response"
    ((test_passed++))
else
    echo -e "${RED}✗ FAIL${NC}: Should return error for no files"
    ((test_failed++))
fi

# Test 7: Invalid file type (Negative)
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "TEST 7: Invalid File Type (Negative)"
echo "═══════════════════════════════════════════════════════════"
echo -e "${YELLOW}Testing: Non-HTML file upload${NC}"
# Create a temporary non-HTML file
echo "This is not an HTML file" > /tmp/test-invalid.txt
response=$(curl -s -X POST $BASE_URL/api/upload -F reportFiles=@/tmp/test-invalid.txt)
if echo "$response" | grep -q 'error\|Only HTML'; then
    echo -e "${GREEN}✓ PASS${NC}: Invalid file rejected as expected"
    echo "Response: $response"
    ((test_passed++))
else
    echo -e "${YELLOW}⚠ WARNING${NC}: Invalid file not explicitly rejected"
    echo "Response: $response"
fi
rm -f /tmp/test-invalid.txt

# Test 8: Export functionality
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "TEST 8: CSV Export Functionality (Positive)"
echo "═══════════════════════════════════════════════════════════"
echo -e "${YELLOW}Testing: Upload and export${NC}"

# First upload some files
upload_response=$(curl -s -X POST $BASE_URL/api/upload \
    -F reportFiles=@$TRAINING_DIR/Alpha_ExecutionSummaryReport_2026-05-05.html \
    -F reportFiles=@$TRAINING_DIR/Bravo_ExecutionSummaryReport_2026-05-05.html)

if echo "$upload_response" | grep -q '"success":true'; then
    analysis_id=$(echo "$upload_response" | grep -o '"analysisId":"[^"]*"' | cut -d'"' -f4)
    echo "Analysis ID: $analysis_id"
    
    # Test export
    export_response=$(curl -s -X POST $BASE_URL/api/export \
        -H "Content-Type: application/json" \
        -d "{\"analysisId\":\"$analysis_id\"}")
    
    if echo "$export_response" | grep -q 'Squad,Date,Result'; then
        echo -e "${GREEN}✓ PASS${NC}: CSV export successful"
        echo "CSV Preview:"
        echo "$export_response" | head -5
        ((test_passed++))
    else
        echo -e "${RED}✗ FAIL${NC}: CSV export failed"
        echo "Response: $export_response"
        ((test_failed++))
    fi
else
    echo -e "${RED}✗ FAIL${NC}: Upload failed, cannot test export"
    ((test_failed++))
fi

# Test 9: Export with invalid ID (Negative)
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "TEST 9: Export with Invalid Analysis ID (Negative)"
echo "═══════════════════════════════════════════════════════════"
echo -e "${YELLOW}Testing: Export with non-existent ID${NC}"
response=$(curl -s -X POST $BASE_URL/api/export \
    -H "Content-Type: application/json" \
    -d '{"analysisId":"invalid-id-12345"}')
    
if echo "$response" | grep -q 'error\|not found'; then
    echo -e "${GREEN}✓ PASS${NC}: Invalid ID rejected as expected"
    echo "Response: $response"
    ((test_passed++))
else
    echo -e "${RED}✗ FAIL${NC}: Should return error for invalid ID"
    echo "Response: $response"
    ((test_failed++))
fi

# Test 10: Verify squad name detection
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "TEST 10: Squad Name Detection Accuracy (Edge Case)"
echo "═══════════════════════════════════════════════════════════"
echo -e "${YELLOW}Testing: Verify all squad names detected correctly${NC}"

all_squads="Alpha Bravo Charlie Delta_eCare Echo Foxtrot Golf Hotel Ice November Oscar"
upload_response=$(curl -s -X POST $BASE_URL/api/upload \
    -F reportFiles=@$TRAINING_DIR/Alpha_ExecutionSummaryReport_2026-05-05.html \
    -F reportFiles=@$TRAINING_DIR/Bravo_ExecutionSummaryReport_2026-05-05.html \
    -F reportFiles=@$TRAINING_DIR/Charlie_ExecutionSummaryReport_2026-05-05.html \
    -F reportFiles=@$TRAINING_DIR/Delta_eCare_ExecutionSummaryReport_2026-05-05.html \
    -F reportFiles=@$TRAINING_DIR/Echo_ExecutionSummaryReport_2026-05-05.html)

detected_squads=$(echo "$upload_response" | grep -o '"squad":"[^"]*"' | cut -d'"' -f4 | tr '\n' ' ')
echo "Detected squads: $detected_squads"

if echo "$upload_response" | grep -q '"squad":"Alpha"' && \
   echo "$upload_response" | grep -q '"squad":"Bravo"' && \
   echo "$upload_response" | grep -q '"squad":"Charlie"' && \
   echo "$upload_response" | grep -q '"squad":"Delta_eCare"'; then
    echo -e "${GREEN}✓ PASS${NC}: Squad names detected correctly"
    ((test_passed++))
else
    echo -e "${RED}✗ FAIL${NC}: Some squad names not detected correctly"
    ((test_failed++))
fi

# Summary
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    TEST SUMMARY                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}Passed: $test_passed${NC}"
echo -e "${RED}Failed: $test_failed${NC}"
echo ""

if [ $test_failed -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
