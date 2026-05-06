#!/usr/bin/env node

/**
 * Allure Report Parser & Analysis Tool
 * Parses Allure HTML reports and generates automated analysis
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

class AllureReportAnalyzer {
  constructor(reportPath) {
    this.reportPath = reportPath;
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      passRate: 0,
      failuresByPackage: {},
      failureReasons: [],
      duration: 0,
      timestamp: new Date().toISOString()
    };
  }

  async parse() {
    try {
      const htmlContent = fs.readFileSync(this.reportPath, 'utf-8');
      const dom = new JSDOM(htmlContent);
      const document = dom.window.document;

      // Extract test statistics from Allure report
      this.extractStats(document);
      this.extractFailureDetails(document);
      
      return this.results;
    } catch (error) {
      console.error('Error parsing Allure report:', error);
      throw error;
    }
  }

  extractStats(document) {
    // Try multiple selectors to find test statistics
    let statsText = '';
    
    // Look for common Allure stat containers
    const statElements = document.querySelectorAll('[class*="stat"], [data-testid*="stat"]');
    statElements.forEach(el => {
      statsText += el.textContent + ' ';
    });

    // Alternative: Look in the summary section
    const summarySection = document.querySelector('[class*="summary"]');
    if (summarySection) {
      statsText += summarySection.textContent;
    }

    // Parse numbers from text
    const totals = this.extractNumbers(statsText);
    
    if (totals.length >= 4) {
      this.results.passed = totals[0];
      this.results.failed = totals[1];
      this.results.skipped = totals[2];
      this.results.total = this.results.passed + this.results.failed + this.results.skipped;
      this.results.passRate = this.results.total > 0 
        ? ((this.results.passed / this.results.total) * 100).toFixed(2)
        : 0;
    }

    // Extract duration
    const durationText = document.body.textContent;
    const durationMatch = durationText.match(/(\d+)\s*(?:ms|second|minute)/i);
    if (durationMatch) {
      this.results.duration = durationMatch[1];
    }
  }

  extractFailureDetails(document) {
    // Look for failed test items
    const failedTestElements = document.querySelectorAll(
      '[class*="failed"], [class*="error"], [data-status="failed"]'
    );

    const failuresByPackage = {};
    
    failedTestElements.forEach((element) => {
      const testName = element.textContent || '';
      if (testName.trim()) {
        // Extract package/directory from test name
        const packageMatch = testName.match(/^([a-zA-Z0-9._-]+)\s*[.:]/);
        const packageName = packageMatch ? packageMatch[1] : 'Unknown';

        if (!failuresByPackage[packageName]) {
          failuresByPackage[packageName] = {
            count: 0,
            tests: [],
            reasons: []
          };
        }

        failuresByPackage[packageName].count++;
        failuresByPackage[packageName].tests.push(testName.substring(0, 100)); // Truncate
      }
    });

    // Extract failure reasons from error messages
    const errorElements = document.querySelectorAll('[class*="error-message"], [class*="failure-reason"]');
    errorElements.forEach((el) => {
      const reason = el.textContent.trim();
      if (reason) {
        this.results.failureReasons.push({
          reason: reason.substring(0, 200),
          package: this.guessPackageFromReason(reason)
        });
      }
    });

    // Sort and deduplicate
    for (const pkg in failuresByPackage) {
      failuresByPackage[pkg].tests = [...new Set(failuresByPackage[pkg].tests)];
    }

    this.results.failuresByPackage = failuresByPackage;
  }

  extractNumbers(text) {
    const numbers = text.match(/\d+/g) || [];
    return numbers.map(Number);
  }

  guessPackageFromReason(reason) {
    const match = reason.match(/([a-zA-Z0-9._-]+)/);
    return match ? match[1] : 'Unknown';
  }

  generateJSON() {
    return JSON.stringify(this.results, null, 2);
  }

  generateHTML() {
    const passColor = this.results.passRate >= 90 ? '#28a745' : 
                      this.results.passRate >= 70 ? '#ffc107' : '#dc3545';

    let failuresByPackageHTML = '';
    for (const [pkg, data] of Object.entries(this.results.failuresByPackage)) {
      failuresByPackageHTML += `
        <div class="package-card">
          <h3>${pkg}</h3>
          <p class="failure-count">${data.count} failed tests</p>
          <ul class="test-list">
            ${data.tests.map(test => `<li>${test}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    const failureReasonsHTML = this.results.failureReasons
      .slice(0, 10)
      .map((item, idx) => `
        <div class="reason-item">
          <span class="reason-number">${idx + 1}</span>
          <p>${item.reason}</p>
        </div>
      `).join('');

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Daily Test Report - ${new Date().toLocaleDateString()}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            overflow: hidden;
        }
        header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        header p {
            font-size: 1.1em;
            opacity: 0.9;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 40px;
            background: #f8f9fa;
        }
        .stat-card {
            background: white;
            padding: 25px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            border-left: 4px solid;
        }
        .stat-card.passed {
            border-left-color: #28a745;
        }
        .stat-card.failed {
            border-left-color: #dc3545;
        }
        .stat-card.skipped {
            border-left-color: #6c757d;
        }
        .stat-card.total {
            border-left-color: #007bff;
        }
        .stat-card h3 {
            font-size: 2.5em;
            color: #667eea;
            margin-bottom: 5px;
        }
        .stat-card p {
            color: #6c757d;
            font-size: 0.95em;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .pass-rate-section {
            text-align: center;
            padding: 40px;
            background: white;
        }
        .pass-rate-circle {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 200px;
            height: 200px;
            border-radius: 50%;
            background: conic-gradient(${passColor} 0deg ${this.results.passRate * 3.6}deg, #e9ecef ${this.results.passRate * 3.6}deg);
            box-shadow: inset 0 0 0 4px white, 0 8px 24px rgba(0, 0, 0, 0.15);
            margin-bottom: 20px;
        }
        .pass-rate-value {
            position: absolute;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: white;
            width: 180px;
            height: 180px;
            border-radius: 50%;
        }
        .pass-rate-value span {
            font-size: 3em;
            font-weight: bold;
            color: ${passColor};
        }
        .pass-rate-value p {
            color: #6c757d;
            margin-top: 5px;
        }
        .content-section {
            padding: 40px;
            border-top: 1px solid #e9ecef;
        }
        .content-section h2 {
            color: #667eea;
            margin-bottom: 25px;
            font-size: 1.8em;
        }
        .packages-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .package-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #dc3545;
        }
        .package-card h3 {
            color: #667eea;
            margin-bottom: 8px;
            font-size: 1.2em;
        }
        .failure-count {
            color: #dc3545;
            font-weight: bold;
            margin-bottom: 12px;
        }
        .test-list {
            list-style: none;
            font-size: 0.9em;
            color: #6c757d;
        }
        .test-list li {
            padding: 4px 0;
            padding-left: 16px;
            position: relative;
        }
        .test-list li::before {
            content: "✗";
            position: absolute;
            left: 0;
            color: #dc3545;
        }
        .reasons-section {
            background: #fff3cd;
            padding: 25px;
            border-radius: 8px;
            border-left: 4px solid #ffc107;
        }
        .reason-item {
            display: flex;
            gap: 15px;
            padding: 12px 0;
            border-bottom: 1px solid #ffe69c;
        }
        .reason-item:last-child {
            border-bottom: none;
        }
        .reason-number {
            background: #ffc107;
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            flex-shrink: 0;
        }
        .reason-item p {
            color: #856404;
            margin: 0;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #6c757d;
            font-size: 0.9em;
            border-top: 1px solid #e9ecef;
        }
        @media (max-width: 768px) {
            .stats-grid {
                grid-template-columns: repeat(2, 1fr);
            }
            header h1 {
                font-size: 1.8em;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>📊 Daily Test Report</h1>
            <p>${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </header>

        <div class="stats-grid">
            <div class="stat-card total">
                <h3>${this.results.total}</h3>
                <p>Total Tests</p>
            </div>
            <div class="stat-card passed">
                <h3>${this.results.passed}</h3>
                <p>Passed</p>
            </div>
            <div class="stat-card failed">
                <h3>${this.results.failed}</h3>
                <p>Failed</p>
            </div>
            <div class="stat-card skipped">
                <h3>${this.results.skipped}</h3>
                <p>Skipped</p>
            </div>
        </div>

        <div class="pass-rate-section">
            <div class="pass-rate-circle" style="position: relative; width: 200px; height: 200px; margin-left: auto; margin-right: auto;">
                <div class="pass-rate-value">
                    <span>${this.results.passRate}%</span>
                    <p>Pass Rate</p>
                </div>
            </div>
        </div>

        ${this.results.failed > 0 ? `
            <div class="content-section">
                <h2>❌ Failures by Package</h2>
                <div class="packages-grid">
                    ${failuresByPackageHTML}
                </div>
            </div>

            <div class="content-section">
                <h2>⚠️ Top Failure Reasons</h2>
                <div class="reasons-section">
                    ${failureReasonsHTML}
                </div>
            </div>
        ` : '<div class="content-section" style="text-align: center; color: #28a745;"><h2>✅ All Tests Passed!</h2></div>'}

        <div class="footer">
            <p>Generated: ${new Date().toLocaleString()}</p>
            <p>Report Duration: ${this.results.duration}ms</p>
        </div>
    </div>
</body>
</html>
    `;
    return html;
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
Usage:
  node parseAllureReport.js <path-to-allure.html> [options]

Options:
  --output-json <path>   Save JSON analysis to file
  --output-html <path>   Save HTML report to file
  --format <json|html>   Output format (default: both)

Examples:
  node parseAllureReport.js ./allure-report/index.html
  node parseAllureReport.js ./allure.html --output-json analysis.json --output-html report.html
    `);
    process.exit(1);
  }

  const reportPath = args[0];
  
  if (!fs.existsSync(reportPath)) {
    console.error(`❌ Report file not found: ${reportPath}`);
    process.exit(1);
  }

  try {
    const analyzer = new AllureReportAnalyzer(reportPath);
    await analyzer.parse();

    // Determine output format
    const hasJsonOutput = args.includes('--output-json');
    const hasHtmlOutput = args.includes('--output-html');
    const format = args.includes('--format') ? args[args.indexOf('--format') + 1] : null;

    // Default: output both formats
    const outputBoth = !hasJsonOutput && !hasHtmlOutput && !format;

    // Output JSON
    if (outputBoth || hasJsonOutput || format === 'json') {
      const jsonPath = hasJsonOutput 
        ? args[args.indexOf('--output-json') + 1]
        : 'test-analysis.json';
      fs.writeFileSync(jsonPath, analyzer.generateJSON());
      console.log(`✅ JSON report saved: ${jsonPath}`);
    }

    // Output HTML
    if (outputBoth || hasHtmlOutput || format === 'html') {
      const htmlPath = hasHtmlOutput 
        ? args[args.indexOf('--output-html') + 1]
        : 'test-report.html';
      fs.writeFileSync(htmlPath, analyzer.generateHTML());
      console.log(`✅ HTML report saved: ${htmlPath}`);
    }

    // Print summary to console
    console.log(`
╔════════════════════════════════════════╗
║       TEST EXECUTION SUMMARY           ║
╠════════════════════════════════════════╣
║ Total:   ${String(analyzer.results.total).padStart(31, ' ')} ║
║ Passed:  ${String(analyzer.results.passed).padStart(31, ' ')} ║
║ Failed:  ${String(analyzer.results.failed).padStart(31, ' ')} ║
║ Skipped: ${String(analyzer.results.skipped).padStart(31, ' ')} ║
║ Pass Rate: ${String(analyzer.results.passRate + '%').padStart(28, ' ')} ║
╚════════════════════════════════════════╝
    `);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
