const express = require('express');
const multer = require('multer');
const { JSDOM } = require('jsdom');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Configure file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/html' || file.originalname.endsWith('.html')) {
      cb(null, true);
    } else {
      cb(new Error('Only HTML files are allowed'));
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Store analysis results temporarily
const analysisCache = new Map();

// Allure Report Analyzer Class
class AllureReportAnalyzer {
  constructor(htmlContent) {
    this.htmlContent = htmlContent;
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      broken: 0,
      unknown: 0,
      passRate: 0,
      failuresByPackage: {},
      failureReasons: [],
      testCases: [],
      duration: 0,
      avgDuration: 0,
      longestTest: null,
      shortestTest: null,
      categories: {},
      failureTypes: {},
      timestamp: new Date().toISOString(),
      squadName: 'Unknown'
    };
  }

  parse() {
    try {
      const dom = new JSDOM(this.htmlContent);
      const document = dom.window.document;

      // Detect report type
      const title = document.querySelector('title');
      const isExecutionSummary = title && title.textContent.includes('Execution Summary Report');
      
      if (isExecutionSummary) {
        // Parse custom execution summary report
        this.parseExecutionSummaryReport(document);
      } else {
        // Parse standard Allure report
        this.extractDataFromScript(document);
      }
      
      return this.results;
    } catch (error) {
      console.error('Error parsing report:', error);
      throw error;
    }
  }

  parseExecutionSummaryReport(document) {
    // Extract squad name from title
    const title = document.querySelector('title');
    if (title) {
      const titleText = title.textContent;
      // Try to match standard format: "SquadName Execution Summary Report"
      let squadMatch = titleText.match(/^(\w+(?:_\w+)?)\s+(?:Test Automation\s+)?Execution Summary Report/);
      if (!squadMatch) {
        // Try alternative format: "Consolidated Test Automation Execution Summary Report"
        squadMatch = titleText.match(/(Consolidated|Alpha|Bravo|Charlie|Delta|Delta_eCare|Echo|Foxtrot|Golf|Hotel|Ice|November|Oscar)(?:\s+Test Automation)?\s+Execution Summary Report/i);
      }
      if (squadMatch) {
        this.results.squadName = squadMatch[1];
      }
    }

    // Extract pass rate and test counts from the report
    const bodyText = document.body.textContent;
    
    // Extract pass rate (e.g., "92.16% Passed")
    const passRateMatch = bodyText.match(/([\d.]+)%\s+Passed/);
    if (passRateMatch) {
      this.results.passRate = parseFloat(passRateMatch[1]);
    }

    // Extract test counts (e.g., "Total Test Cases: 51 [Passed: 47 | Failed: 4")
    const totalMatch = bodyText.match(/Total Test Cases[:\s]+(\d+)/);
    const passedMatch = bodyText.match(/Passed[:\s]+(\d+)/);
    const failedMatch = bodyText.match(/Failed[:\s]+(\d+)/);
    
    if (totalMatch) this.results.total = parseInt(totalMatch[1]);
    if (passedMatch) this.results.passed = parseInt(passedMatch[1]);
    if (failedMatch) this.results.failed = parseInt(failedMatch[1]);

    // Parse table rows for test details
    const tableRows = document.querySelectorAll('tbody#table tr');
    tableRows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 6) {
        const packageName = cells[2]?.textContent?.trim() || '';
        const testName = cells[3]?.textContent?.trim() || '';
        const status = cells[5]?.textContent?.trim() || '';
        
        let testStatus = 'unknown';
        if (status.includes('PASSED')) {
          testStatus = 'passed';
        } else if (status.includes('FAILED')) {
          testStatus = 'failed';
        } else if (status.includes('SKIPPED')) {
          testStatus = 'skipped';
          this.results.skipped++;
        }

        // Store test case
        this.results.testCases.push({
          name: testName,
          status: testStatus,
          duration: 0,
          package: packageName
        });

        // Track failures by package
        if (testStatus === 'failed') {
          if (!this.results.failuresByPackage[packageName]) {
            this.results.failuresByPackage[packageName] = {
              count: 0,
              tests: [],
              reasons: []
            };
          }
          this.results.failuresByPackage[packageName].count++;
          this.results.failuresByPackage[packageName].tests.push({
            name: testName,
            reason: 'See execution summary for details'
          });
        }

        // Track categories
        if (!this.results.categories[packageName]) {
          this.results.categories[packageName] = {
            passed: 0,
            failed: 0,
            skipped: 0,
            total: 0
          };
        }
        this.results.categories[packageName].total++;
        if (testStatus === 'passed') this.results.categories[packageName].passed++;
        if (testStatus === 'failed') this.results.categories[packageName].failed++;
        if (testStatus === 'skipped') this.results.categories[packageName].skipped++;
      }
    });

    // Calculate metrics if not already set
    if (this.results.total === 0) {
      this.results.total = this.results.testCases.length;
    }
    if (this.results.passRate === 0 && this.results.total > 0) {
      this.results.passRate = (this.results.passed / this.results.total) * 100;
    }

    this.calculateMetrics();
  }

  extractDataFromScript(document) {
    // Allure embeds data in script tags with d('data/...', 'base64data')
    const scripts = document.querySelectorAll('script');
    
    // Extract squad name from report
    this.extractSquadName(document);
    
    for (const script of scripts) {
      const content = script.textContent;
      if (content.includes("d('data/test-cases/")) {
        this.parseTestCaseData(content);
      }
      if (content.includes("d('data/suites/")) {
        this.parseSuiteData(content);
      }
      if (content.includes("d('widgets/summary")) {
        this.parseSummaryData(content);
      }
    }

    // Calculate metrics
    this.calculateMetrics();
  }

  extractSquadName(document) {
    // Try to extract squad name from various locations in the report
    
    // 1. Try from title
    const title = document.querySelector('title');
    if (title && title.textContent) {
      const titleText = title.textContent;
      // Look for squad names: Alpha, Bravo, Charlie, Delta, etc.
      const squadMatch = titleText.match(/\b(Alpha|Bravo|Charlie|Delta|Delta_eCare|Echo|Foxtrot|Golf|Hotel|Ice|Juliet|Kilo|Lima|Mike|November|Oscar|Papa|Quebec|Romeo|Sierra|Tango|Uniform|Victor|Whiskey|Xray|Yankee|Zulu|Consolidated)(?:_\w+)?\b/i);
      if (squadMatch) {
        this.results.squadName = squadMatch[1];
        return;
      }
    }

    // 2. Try from test package names
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      const content = script.textContent;
      if (content.includes('data/test-cases')) {
        const squadMatch = content.match(/\b(Alpha|Bravo|Charlie|Delta|Delta_eCare|Echo|Foxtrot|Golf|Hotel|Ice|November|Oscar|Consolidated)(?:_\w+)?\b/i);
        if (squadMatch) {
          this.results.squadName = squadMatch[1];
          return;
        }
      }
    }

    // 3. Try from environment info or other metadata
    const allText = document.body ? document.body.textContent : '';
    const squadMatch = allText.match(/squad[:\s]+(Alpha|Bravo|Charlie|Delta|Delta_eCare|Echo|Foxtrot|Golf|Hotel|Ice|November|Oscar|Consolidated)(?:_\w+)?/i);
    if (squadMatch) {
      this.results.squadName = squadMatch[1];
      return;
    }

    // Default to Unknown if no squad name found
    this.results.squadName = 'Unknown';
  }

  parseTestCaseData(scriptContent) {
    // Extract test case JSON data
    const regex = /d\('data\/test-cases\/[^']+',\s*'([^']+)'\)/g;
    let match;

    while ((match = regex.exec(scriptContent)) !== null) {
      try {
        const base64Data = match[1];
        const jsonStr = Buffer.from(base64Data, 'base64').toString('utf-8');
        const testCase = JSON.parse(jsonStr);
        
        this.processTestCase(testCase);
      } catch (e) {
        // Skip invalid data
      }
    }
  }

  processTestCase(testCase) {
    const status = testCase.status || 'unknown';
    const fullName = testCase.fullName || testCase.name || '';
    const packageName = this.extractPackageName(fullName);
    
    // Count by status
    switch (status.toLowerCase()) {
      case 'passed':
        this.results.passed++;
        break;
      case 'failed':
        this.results.failed++;
        break;
      case 'skipped':
        this.results.skipped++;
        break;
      case 'broken':
        this.results.broken++;
        break;
      default:
        this.results.unknown++;
    }

    // Group failures by package
    if (status === 'failed' || status === 'broken') {
      if (!this.results.failuresByPackage[packageName]) {
        this.results.failuresByPackage[packageName] = {
          count: 0,
          tests: [],
          reasons: []
        };
      }
      
      const failureReason = this.extractFailureReason(testCase);
      
      this.results.failuresByPackage[packageName].count++;
      this.results.failuresByPackage[packageName].tests.push({
        name: testCase.name || 'Unknown',
        reason: failureReason
      });

      // Add to package reasons if not duplicate
      if (failureReason && !this.results.failuresByPackage[packageName].reasons.includes(failureReason)) {
        this.results.failuresByPackage[packageName].reasons.push(failureReason);
      }

      // Extract failure reason for global list
      if (failureReason) {
        this.results.failureReasons.push({
          package: packageName,
          test: testCase.name,
          reason: failureReason,
          fullReason: testCase.statusMessage || testCase.statusTrace || 'No details'
        });
      }
    }

    // Store test case summary
    this.results.testCases.push({
      name: testCase.name,
      status: status,
      duration: testCase.time?.duration || 0,
      package: packageName
    });

    // Accumulate duration
    if (testCase.time?.duration) {
      this.results.duration += testCase.time.duration;
    }
  }

  parseSuiteData(scriptContent) {
    // Extract suite information if needed
  }

  parseSummaryData(scriptContent) {
    // Extract summary widget data if available
    try {
      const regex = /d\('widgets\/summary[^']*',\s*'([^']+)'\)/;
      const match = scriptContent.match(regex);
      if (match) {
        const base64Data = match[1];
        const jsonStr = Buffer.from(base64Data, 'base64').toString('utf-8');
        const summary = JSON.parse(jsonStr);
        
        // Use summary data if available
        if (summary.statistic) {
          this.results.passed = summary.statistic.passed || this.results.passed;
          this.results.failed = summary.statistic.failed || this.results.failed;
          this.results.skipped = summary.statistic.skipped || this.results.skipped;
          this.results.broken = summary.statistic.broken || this.results.broken;
        }
      }
    } catch (e) {
      // Summary not critical
    }
  }

  extractPackageName(fullName) {
    // Extract package from full test name
    // Example: "de.vodafone.tests.ASP.React.ST.WFIT_2071.TestName" -> "de.vodafone.tests.ASP.React"
    const parts = fullName.split('.');
    if (parts.length > 5) {
      return parts.slice(0, 5).join('.');
    } else if (parts.length > 2) {
      return parts.slice(0, -1).join('.');
    }
    return 'Unknown';
  }

  extractFailureReason(testCase) {
    // Extract concise failure reason from various sources
    let reason = '';
    
    if (testCase.statusMessage) {
      reason = testCase.statusMessage;
    } else if (testCase.statusTrace) {
      reason = testCase.statusTrace;
    } else if (testCase.statusDetails && testCase.statusDetails.message) {
      reason = testCase.statusDetails.message;
    }

    if (!reason) return 'No error message available';

    // Extract first meaningful line (often contains the actual error)
    const lines = reason.split('\n').filter(line => line.trim());
    if (lines.length > 0) {
      reason = lines[0];
    }

    // Clean up common patterns
    reason = reason
      .replace(/^(java\.|org\.|com\.)\S+:\s*/, '') // Remove Java exception class names
      .replace(/^Error:\s*/i, '') // Remove "Error:" prefix
      .replace(/^Exception:\s*/i, '') // Remove "Exception:" prefix
      .replace(/\s+at\s+.*$/, '') // Remove stack trace hints
      .trim();

    // Limit length
    if (reason.length > 150) {
      reason = reason.substring(0, 147) + '...';
    }

    return reason || 'Unknown error';
  }

  calculateMetrics() {
    this.results.total = this.results.passed + this.results.failed + 
                         this.results.skipped + this.results.broken + 
                         this.results.unknown;
    
    if (this.results.total > 0) {
      this.results.passRate = ((this.results.passed / this.results.total) * 100).toFixed(2);
      this.results.avgDuration = Math.round(this.results.duration / this.results.total);
    }

    // Find longest and shortest tests
    const testsWithDuration = this.results.testCases.filter(t => t.duration > 0);
    if (testsWithDuration.length > 0) {
      this.results.longestTest = testsWithDuration.reduce((a, b) => a.duration > b.duration ? a : b);
      this.results.shortestTest = testsWithDuration.reduce((a, b) => a.duration < b.duration ? a : b);
    }

    // Categorize tests by package
    this.results.testCases.forEach(test => {
      if (!this.results.categories[test.package]) {
        this.results.categories[test.package] = {
          total: 0,
          passed: 0,
          failed: 0,
          skipped: 0,
          duration: 0
        };
      }
      const cat = this.results.categories[test.package];
      cat.total++;
      cat.duration += test.duration;
      if (test.status === 'passed') cat.passed++;
      else if (test.status === 'failed' || test.status === 'broken') cat.failed++;
      else if (test.status === 'skipped') cat.skipped++;
    });

    // Categorize failure types
    this.results.failureReasons.forEach(failure => {
      const type = this.categorizeFailure(failure.reason);
      if (!this.results.failureTypes[type]) {
        this.results.failureTypes[type] = 0;
      }
      this.results.failureTypes[type]++;
    });

    // Sort failures by count
    this.results.failuresByPackage = Object.fromEntries(
      Object.entries(this.results.failuresByPackage)
        .sort(([, a], [, b]) => b.count - a.count)
    );

    // Sort categories by failure count
    this.results.categories = Object.fromEntries(
      Object.entries(this.results.categories)
        .sort(([, a], [, b]) => b.failed - a.failed)
    );
  }

  categorizeFailure(reason) {
    const lower = reason.toLowerCase();
    if (lower.includes('assert') || lower.includes('expected')) return 'Assertion Failures';
    if (lower.includes('timeout') || lower.includes('timed out')) return 'Timeouts';
    if (lower.includes('element') || lower.includes('selector')) return 'Element Not Found';
    if (lower.includes('null') || lower.includes('undefined')) return 'Null/Undefined Errors';
    if (lower.includes('connection') || lower.includes('network')) return 'Network Issues';
    if (lower.includes('permission') || lower.includes('access')) return 'Permission Errors';
    return 'Other Errors';
  }
}

// API Routes

// Upload and analyze Allure reports (multiple files)
app.post('/api/upload', upload.array('reportFiles', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const squadResults = [];

    // Process each uploaded file
    for (const file of req.files) {
      try {
        const htmlContent = fs.readFileSync(file.path, 'utf-8');
        
        // Parse the report
        const analyzer = new AllureReportAnalyzer(htmlContent);
        const analysis = analyzer.parse();

        // Create squad result entry
        const squadResult = {
          squad: analysis.squadName,
          date: new Date().toLocaleDateString('en-US'),
          result: Math.round(analysis.passRate),
          reason: generateDefaultReason(analysis),
          pipelineIssue: false,
          suggestion: '',
          // Keep full analysis for potential download
          fullAnalysis: analysis
        };

        squadResults.push(squadResult);

        // Clean up uploaded file
        fs.unlinkSync(file.path);
      } catch (err) {
        console.error(`Error processing file ${file.originalname}:`, err);
        // Continue with other files
      }
    }

    // Clean up old cache entries (older than 1 hour)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    for (const [id, data] of analysisCache.entries()) {
      if (parseInt(id) < oneHourAgo) {
        analysisCache.delete(id);
      }
    }

    // Store results in cache
    const analysisId = Date.now().toString();
    analysisCache.set(analysisId, squadResults);

    res.json({
      success: true,
      analysisId: analysisId,
      results: squadResults
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate default reason based on analysis
function generateDefaultReason(analysis) {
  const reasons = [];
  const details = [];
  
  // Handle perfect pass rate
  if (analysis.failed === 0 && analysis.broken === 0) {
    return 'All tests passed successfully';
  }

  const passRate = analysis.passRate || 0;
  const failedCount = analysis.failed || 0;
  const totalCount = analysis.total || 0;
  const failurePercentage = totalCount > 0 ? ((failedCount / totalCount) * 100).toFixed(1) : 0;

  // Analyze pass rate severity
  if (passRate >= 90) {
    details.push(`${failedCount} test${failedCount > 1 ? 's' : ''} failed (${failurePercentage}%)`);
  } else if (passRate >= 70) {
    details.push(`${failedCount} tests failed out of ${totalCount} (${failurePercentage}% failure rate)`);
  } else if (passRate >= 50) {
    details.push(`High failure rate: ${failedCount}/${totalCount} tests failed (${failurePercentage}%)`);
  } else {
    details.push(`Critical: ${failedCount}/${totalCount} tests failed (${failurePercentage}% failure rate)`);
  }

  // Analyze failures by package
  const failuresByPackage = analysis.failuresByPackage || {};
  const failedPackages = Object.keys(failuresByPackage);
  
  if (failedPackages.length > 0) {
    // Find top failing packages
    const sortedPackages = failedPackages
      .map(pkg => ({
        name: pkg.split('.').pop(), // Get last part of package name
        count: failuresByPackage[pkg].count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3); // Top 3 packages

    if (failedPackages.length === 1) {
      details.push(`All failures in ${sortedPackages[0].name} package`);
    } else if (failedPackages.length <= 3) {
      const packageNames = sortedPackages.map(p => p.name).join(', ');
      details.push(`Failures in ${packageNames} packages`);
    } else {
      const topPackages = sortedPackages.slice(0, 2).map(p => `${p.name} (${p.count})`).join(', ');
      details.push(`Failures across ${failedPackages.length} packages, mainly ${topPackages}`);
    }
  }

  // Check for common failure patterns from failure reasons
  const failureReasons = analysis.failureReasons || [];
  const hasLocatorIssues = failureReasons.some(f => 
    f.reason && (f.reason.toLowerCase().includes('element') || 
                 f.reason.toLowerCase().includes('selector') ||
                 f.reason.toLowerCase().includes('locator'))
  );
  
  const hasTimeouts = failureReasons.some(f => 
    f.reason && f.reason.toLowerCase().includes('timeout')
  );

  const hasConnectionIssues = failureReasons.some(f => 
    f.reason && (f.reason.toLowerCase().includes('connection') ||
                 f.reason.toLowerCase().includes('network') ||
                 f.reason.toLowerCase().includes('st was down') ||
                 f.reason.toLowerCase().includes('environment'))
  );

  const hasAssertionErrors = failureReasons.some(f => 
    f.reason && (f.reason.toLowerCase().includes('assert') ||
                 f.reason.toLowerCase().includes('expected'))
  );

  // Build reason categories
  if (hasConnectionIssues) {
    reasons.push('ST/Environment issues');
  }
  if (hasLocatorIssues) {
    reasons.push('Locator issues');
  }
  if (hasTimeouts) {
    reasons.push('Timeout issues');
  }
  if (hasAssertionErrors) {
    reasons.push('Assertion failures');
  }

  // Build final reason string
  let finalReason = details.join('. ');
  
  if (reasons.length > 0) {
    finalReason += `. Issues related to ${reasons.join(', ')} and squad business`;
  } else if (failedPackages.length > 0) {
    // Generic categorization when no specific patterns found
    finalReason += '. Issues related to Locators, ST, and squad business';
  } else {
    finalReason += '. Review required for root cause analysis';
  }

  // Always append pipeline status
  finalReason += '. No pipeline issue';

  return finalReason;
}

// Export to Excel/CSV
app.post('/api/export', async (req, res) => {
  try {
    const { analysisId } = req.body;
    
    const results = analysisCache.get(analysisId);
    if (!results) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    // Generate CSV content
    let csv = 'Squad,Date,Result,Reason,Pipeline issue?,Suggestion\n';
    
    for (const row of results) {
      csv += `"${row.squad}",`;
      csv += `"${row.date}",`;
      csv += `${row.result},`;
      csv += `"${row.reason}",`;
      csv += `${row.pipelineIssue},`;
      csv += `"${row.suggestion}"\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="squad-test-analysis-${Date.now()}.csv"`);
    res.send(csv);

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║     Vodafone Squad Test Report Analyzer                   ║
╚════════════════════════════════════════════════════════════╝

🚀 Server running at: http://localhost:${PORT}

📋 Features:
   • Upload multiple squad Allure reports (batch)
   • Squad-based comparative analysis
   • Auto-detect squad names from reports
   • Export results to Excel (CSV)
   • Default failure reason suggestions

Press Ctrl+C to stop the server
  `);
});

module.exports = app;
