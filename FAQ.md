# FAQ & Common Issues

## ❓ FAQs

### Q: How often does the analysis run?
**A:** It runs automatically after every test execution AND on a daily schedule (default: 8 AM UTC weekdays). You can customize the schedule by editing the cron expression in `.github/workflows/test-report.yml`.

### Q: Can I run it manually?
**A:** Yes! From the GitHub Actions tab, select "Daily Test Report Analysis" and click "Run workflow".

### Q: Where are the reports stored?
**A:** GitHub stores them as artifacts for 30 days. Download from the workflow run under "Artifacts". You can also view the HTML report directly in GitHub or download the JSON for integration with other tools.

### Q: Do I need to commit the analysis files to the repo?
**A:** Yes, all files in `script/` folder and `.github/workflows/test-report.yml` need to be committed so GitHub Actions can access them.

### Q: Can I use this with multiple test suites?
**A:** Yes! You can create multiple analysis workflows, each watching different test workflows, or modify the script to analyze multiple report formats.

### Q: How do I integrate this with my dashboard/tool?
**A:** Use the JSON output (`test-analysis.json`). It contains all metrics in structured format perfect for API calls or data visualization.

### Q: What if my Allure report format is different?
**A:** Edit the parsing logic in `parseAllureReport.js`. The main functions are:
- `extractStats()` - extracts test counts
- `extractFailureDetails()` - extracts failure information

### Q: Can I send reports to my email?
**A:** Yes! Add an email action to the workflow (see README.md "Advanced" section). You can also extract the JSON and send via email service.

---

## 🐛 Troubleshooting

### Issue: "Workflow not found" error

**Symptoms:**
```
Error: Could not find workflow named "Run Tests"
```

**Solutions:**
1. Check the exact name of your test workflow:
   ```bash
   # Look in your .github/workflows/ directory
   ls -la .github/workflows/
   ```

2. Update `.github/workflows/test-report.yml`:
   ```yaml
   workflow_run:
     workflows: ["YOUR EXACT WORKFLOW NAME"]  # Case-sensitive!
   ```

3. Common names: "Run Tests", "Tests", "Test", "test.yml", "CI"

---

### Issue: "Allure report not found" in analysis

**Symptoms:**
```
❌ Allure report not found
```

**Causes & Fixes:**

1. **Artifact not uploaded**
   - Check your test workflow has upload step
   - Verify artifact name is `allure-report`
   ```yaml
   - uses: actions/upload-artifact@v3
     with:
       name: allure-report  # Must be this name
       path: allure-report/
   ```

2. **Wrong path to report**
   - Edit the search path in analysis workflow:
   ```bash
   # Current (generic):
   REPORT_PATH=$(find . -name "allure.html" -o -name "index.html" | grep allure | head -1)
   
   # Specific (faster):
   REPORT_PATH="allure-report/index.html"
   ```

3. **Report not generated**
   - Ensure Allure is installed in test workflow
   ```yaml
   - name: Generate Allure Report
     run: |
       npm install -g allure-commandline
       allure generate allure-results --clean -o allure-report
   ```

---

### Issue: Analysis runs but report is empty/incomplete

**Symptoms:**
- All metrics show 0
- HTML looks broken
- JSON is empty

**Solutions:**

1. **Verify Allure report is valid:**
   ```bash
   # Download artifact and check
   unzip test-analysis.zip
   # Open allure-report/index.html in browser
   # If it's empty, your tests aren't generating Allure data
   ```

2. **Check test framework is configured for Allure:**
   ```xml
   <!-- pom.xml for Maven -->
   <dependency>
     <groupId>io.qameta.allure</groupId>
     <artifactId>allure-testng</artifactId>
     <version>2.20.1</version>
   </dependency>
   ```

3. **Ensure tests are actually running:**
   ```bash
   # In your test workflow, check the test step log
   # Should show test execution and pass/fail counts
   ```

---

### Issue: Slack notification not sent

**Symptoms:**
- No message in Slack channel
- Workflow shows "skipped" for Slack step

**Solutions:**

1. **Verify webhook URL:**
   ```bash
   # Test webhook manually
   curl -X POST -H 'Content-type: application/json' \
     --data '{"text":"Test message"}' \
     YOUR_WEBHOOK_URL
   ```

2. **Check secret is added:**
   - Go to Settings → Secrets → Actions
   - Verify `SLACK_WEBHOOK_URL` exists
   - Check it has the correct value (starts with https://hooks.slack.com/)

3. **Verify webhook channel:**
   - Log into Slack workspace
   - Check that the channel you selected still exists
   - Create new webhook if channel was deleted

---

### Issue: Incorrect test metrics in report

**Symptoms:**
- Pass count doesn't match actual Allure report
- Failed count is wrong
- Pass rate is inaccurate

**Solutions:**

1. **Check HTML parser is working:**
   ```bash
   # Test manually with debug output
   node parseAllureReport.js ./allure-report/index.html
   # Compare output with manual inspection of Allure report
   ```

2. **Your Allure version may have different HTML structure:**
   - Open Allure report in browser
   - Inspect elements to find stat containers
   - Update selectors in `extractStats()` function

3. **Check test status isn't cached:**
   - Clear browser cache
   - Regenerate Allure report fresh
   - Re-run analysis

---

### Issue: Permission denied when running setup.sh

**Solution:**
```bash
chmod +x setup.sh
./setup.sh
```

---

### Issue: Node.js/npm errors

**Solutions:**

1. **Check Node version:**
   ```bash
   node --version  # Should be 14+
   ```

2. **Clear npm cache:**
   ```bash
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Install specific version:**
   ```bash
   npm install jsdom@22.1.0
   ```

---

## 💡 Performance Tips

1. **Speed up artifact upload:**
   ```yaml
   # In test workflow, compress before upload
   - run: tar -czf allure-report.tar.gz allure-report/
   - uses: actions/upload-artifact@v3
     with:
       path: allure-report.tar.gz
   ```

2. **Reduce workflow run time:**
   ```yaml
   # Skip unnecessary checkout
   - uses: actions/checkout@v4
     with:
       fetch-depth: 1
   ```

3. **Cache dependencies:**
   ```yaml
   - uses: actions/setup-node@v4
     with:
       node-version: '18'
       cache: 'npm'
   ```

---

## 🔗 Useful Resources

- **Allure Reports**: https://docs.qameta.io/allure/
- **GitHub Actions**: https://docs.github.com/en/actions
- **Cron Generator**: https://crontab.guru/
- **Slack Webhooks**: https://api.slack.com/messaging/webhooks
- **TestNG with Allure**: https://docs.qameta.io/allure/#_testng

---

## 📞 Getting Help

1. **Check GitHub Actions logs:**
   - Click on workflow run
   - Expand each step to see detailed output
   - Look for error messages

2. **Test locally first:**
   ```bash
   cd script
   npm install
   node parseAllureReport.js /path/to/allure-report
   ```

3. **Review examples:**
   - EXAMPLE-test-workflow.yml - test workflow configuration
   - README.md - full feature documentation
   - SETUP.md - step-by-step setup guide

---

## ✅ Verification Checklist

- [ ] All files in `script/` directory
- [ ] `.github/workflows/test-report.yml` exists
- [ ] Workflow name matches your test workflow (case-sensitive)
- [ ] Test workflow uploads `allure-report` artifact
- [ ] `npm install` runs without errors in script directory
- [ ] Local testing works: `node parseAllureReport.js path/to/report`
- [ ] GitHub Actions tab shows "Daily Test Report Analysis" workflow
- [ ] Test workflow completes successfully
- [ ] Analysis workflow automatically triggers after tests
- [ ] Reports appear in artifacts section

Once all boxes are checked, you're good to go! ✨
