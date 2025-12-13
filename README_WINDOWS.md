# Oil Production Prediction App - Windows Guide

## 🚀 Quick Start (Simplest Way)

**Just double-click `START.bat` and follow the instructions!**

That's it! The script will:
1. ✅ Check if Python and Node.js are installed
2. ✅ Install all dependencies automatically
3. ✅ Start both backend and frontend servers
4. ✅ Open the application in your browser

---

## 📋 First-Time Setup

### What You Need:

1. **Python 3.11 or newer**
   - Download from: https://www.python.org/downloads/
   - ⚠️ **IMPORTANT**: During installation, check the box "Add Python to PATH"
   - Click "Install Now"

2. **Node.js (LTS version)**
   - Download from: https://nodejs.org/
   - Just click "Install" - it will add itself to PATH automatically

### After Installing:

1. Close and reopen Command Prompt (if it was open)
2. Double-click `START.bat`
3. Wait for everything to install and start
4. The app will open automatically in your browser!

---

## 🎯 Using the Application

### Starting the App:
- **Just double-click `START.bat`**
- Two windows will open (backend and frontend servers)
- Your browser will open automatically to http://localhost:3000

### Stopping the App:
- Close the two server windows (Backend Server and Frontend Server)
- Or press `Ctrl+C` in each window

---

## 🌐 Access Points

Once running, you can access:

- **Main Application**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

---

## ❓ Troubleshooting

### "Python is not installed or not in PATH"
- Install Python from https://www.python.org/downloads/
- Make sure to check "Add Python to PATH" during installation
- Restart your computer after installation
- Try running `python --version` in Command Prompt to verify

### "Node.js is not installed or not in PATH"
- Install Node.js from https://nodejs.org/
- Restart your computer after installation
- Try running `node --version` in Command Prompt to verify

### "Port 8000 or 3000 is already in use"
- Close other applications that might be using these ports
- Or restart your computer

### "Failed to install dependencies"
- Make sure you have internet connection
- Try running `START.bat` again
- If it still fails, try running as Administrator (right-click → Run as administrator)

### Application doesn't open in browser
- Manually open: http://localhost:3000
- Make sure both server windows are running (check for errors)

### Slow first startup
- This is normal! The first time you run it, it needs to:
  - Create Python virtual environment
  - Install all Python packages (~5-10 minutes)
  - Install all Node.js packages (~2-5 minutes)
- Subsequent starts will be much faster!

---

## 📁 Project Structure

```
oil-production-app/
├── START.bat              ← Double-click this to start!
├── backend/               ← Python FastAPI backend
│   ├── app/
│   └── requirements.txt
├── frontend/              ← React TypeScript frontend
│   ├── src/
│   └── package.json
└── train_model.py         ← Training script (optional)
```

---

## 💡 Tips

- **First run takes time**: Installing dependencies can take 5-15 minutes
- **Keep the windows open**: Don't close the server windows while using the app
- **Check the windows**: If something doesn't work, check the server windows for error messages
- **Internet required**: First-time setup requires internet to download packages

---

## 🆘 Still Having Issues?

1. Make sure Python and Node.js are installed correctly:
   - Open Command Prompt
   - Type `python --version` (should show Python 3.11+)
   - Type `node --version` (should show v18+ or v20+)

2. Try running as Administrator:
   - Right-click `START.bat`
   - Select "Run as administrator"

3. Check Windows Firewall:
   - Make sure Windows Firewall isn't blocking the application

4. Restart your computer after installing Python/Node.js

---

## ✅ System Requirements

- **Windows**: Windows 7, 8, 10, or 11
- **Python**: 3.11 or newer
- **Node.js**: 18.x LTS or newer
- **RAM**: At least 4GB (8GB recommended)
- **Disk Space**: ~2GB free space
- **Internet**: Required for first-time setup

---

**That's it! Just double-click `START.bat` and you're ready to go! 🎉**

