# Vodafone Test Report Analyzer

A secure, local web application that automates Allure test report analysis, saving you 15-30 minutes every morning.

## 🎯 What It Does

- **Accepts drag & drop** Allure HTML reports via web interface
- **Extracts metrics**: pass rate, pass count, fail count, skip count
- **Analyzes failures** and groups them by package/directory
- **Generates visual dashboards** with instant analysis
- **Keeps data private** - everything runs locally, no cloud storage

## 🚀 Quick Start

### Option 1: Automatic Start (Recommended)

```bash
./scripts/start.sh
```

This will install dependencies (if needed), start the server, and open your browser automatically.

### Option 2: Manual Start

```bash
npm install
npm start
```

Then open: http://localhost:3000

## 📁 Project Structure

```
script/
├── README.md                    # This file
├── START-HERE.txt              # Quick visual guide
├── server.js                   # Web server application
├── parseAllureReport.js        # Core parser script
├── package.json                # Dependencies
├── public/                     # Web interface files
│   └── index.html
├── docs/                       # Documentation
│   ├── QUICKSTART.md          # 2-minute setup guide
│   ├── README-WEBAPP.md       # Detailed webapp guide
│   ├── SETUP.md               # Step-by-step setup
│   ├── FAQ.md                 # Frequently asked questions
│   ├── OVERVIEW.md            # Complete solution overview
│   ├── NEW-SOLUTION.md        # New features documentation
│   └── TEST-REPORT.md         # Test report details
├── scripts/                    # Utility scripts
│   ├── start.sh               # Quick start launcher
│   ├── setup.sh               # Initial setup script
│   ├── verify-setup.sh        # Setup verification
│   └── test-application.sh    # Application testing
├── examples/                   # Sample data and templates
│   ├── reports/               # Sample Allure HTML reports
│   └── workflows/             # GitHub Actions workflow examples
├── uploads/                    # Uploaded reports (runtime)
└── .github/
    └── workflows/             # GitHub Actions workflows
        └── test-report.yml.example
```

## 📖 Documentation

- **[QUICKSTART](docs/QUICKSTART.md)** - Get started in 2 minutes
- **[README-WEBAPP](docs/README-WEBAPP.md)** - Detailed web application guide
- **[SETUP](docs/SETUP.md)** - Step-by-step setup instructions
- **[FAQ](docs/FAQ.md)** - Frequently asked questions
- **[OVERVIEW](docs/OVERVIEW.md)** - Complete solution overview

## 🛠️ Key Features

### Web Application Mode
- Drag and drop HTML reports
- Instant visual analysis
- No configuration required
- Runs completely offline

### Command Line Mode
```bash
node parseAllureReport.js examples/reports/<report-name>.html
```

### GitHub Actions Integration
See [examples/workflows/](examples/workflows/) for workflow templates that automate report analysis in your CI/CD pipeline.

## 🧪 Try It Out

Test the application with sample reports in [examples/reports/](examples/reports/):

```bash
npm start
# Then drag and drop any .html file from examples/reports/ into the web interface
```

Or use the command line:
```bash
node parseAllureReport.js examples/reports/Alpha_ExecutionSummaryReport_2026-05-05.html
```

## 📋 Requirements

- Node.js 14.0.0 or higher
- Modern web browser (for web application mode)

## 🤝 Support

For questions or issues:
1. Check the [FAQ](docs/FAQ.md)
2. Review the [detailed setup guide](docs/SETUP.md)
3. Check [START-HERE.txt](START-HERE.txt) for a quick visual overview

## 📄 License

MIT License - Vodafone

---

**Ready to start?** Run `./scripts/start.sh` or see [docs/QUICKSTART.md](docs/QUICKSTART.md)
