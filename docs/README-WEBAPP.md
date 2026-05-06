# 🔐 Vodafone Test Report Analyzer - Web Application

A **secure, local web application** for analyzing Allure test reports.

## 🎯 Features

- ✅ **No GitHub/Cloud** - Runs entirely on your local machine
- ✅ **File Upload Interface** - Drag & drop Allure HTML reports
- ✅ **No Storage** - Reports analyzed in memory, auto-cleaned
- ✅ **Instant Analysis** - Real-time parsing and visualization
- ✅ **Interactive Filtering** - Filter tests by status

## 🚀 Quick Setup

### 1. Install Dependencies

```bash
cd /Users/ehab.mohamed1/Desktop/script
npm install
```

### 2. Start the Server

```bash
npm start
```

### 3. Open in Browser

Visit: **http://localhost:3000**

## 📖 How to Use

### Upload Report

- Drag your Allure HTML report onto the upload area, OR
- Click the upload area and select your file

### View Analysis

The dashboard shows:

- **📊 Overview Stats** - Total, passed, failed, skipped counts
- **📈 Pass Rate** - Color-coded (green ≥90%, yellow 70-89%, red <70%)
- **⏱️ Execution Details** - Duration, average time, longest/shortest tests
- **📦 Test Categories** - Package-level breakdown with pass rates
- **❌ Failed Packages** - Top failures with specific reasons
- **🔍 Common Failures** - Grouped failure messages with counts
- **📊 Failure Types** - Visual distribution chart (7 categories)
- **📋 Test List** - Top 100 tests with expandable details
- **🎚️ Filters** - Toggle buttons to show/hide by status

### Upload Another Report

Click "Upload New Report" to analyze a different file.

## 🛠️ Troubleshooting

### Port already in use

```bash
lsof -ti:3000 | xargs kill -9
npm start
```

### Upload fails

- Check file is valid Allure HTML report
- Check file size < 50MB
- Look at terminal for error messages

## 📁 Project Structure

```
script/
├── server.js              # Express server + analyzer
├── public/
│   └── index.html        # Frontend UI
├── package.json          # Dependencies
└── uploads/              # Temp uploads (auto-cleaned)
```

## 🔧 Configuration

### Change Port

Edit `server.js`:
```javascript
const PORT = 3000;  // Change to your preferred port
```

### Adjust Upload Limits

Edit `server.js`:
```javascript
limits: { fileSize: 50 * 1024 * 1024 }  // 50MB
```

## 🔐 Security

- Runs locally on your machine
- No data sent to external servers
- Files deleted immediately after processing
- Analysis cached in memory only (1 hour expiration)

---

For more details, see START-HERE.txt
