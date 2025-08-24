#!/bin/bash

# GitHub Copilot Setup Verification Script for FramoCRM
# Run this script to verify your development environment is optimized for Copilot

echo "🚀 FramoCRM Copilot Setup Verification"
echo "======================================="

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "backend" ]; then
    echo "❌ Please run this script from the FramoCRM root directory"
    exit 1
fi

echo "✅ Running from FramoCRM root directory"

# Check for .vscode directory and files
if [ -d ".vscode" ]; then
    echo "✅ .vscode directory exists"
    
    if [ -f ".vscode/settings.json" ]; then
        echo "✅ VSCode settings.json configured"
    else
        echo "❌ Missing .vscode/settings.json"
    fi
    
    if [ -f ".vscode/extensions.json" ]; then
        echo "✅ VSCode extensions.json configured"
    else
        echo "❌ Missing .vscode/extensions.json"
    fi
    
    if [ -f ".vscode/FramoCRM.code-workspace" ]; then
        echo "✅ VSCode workspace configuration exists"
    else
        echo "❌ Missing .vscode/FramoCRM.code-workspace"
    fi
else
    echo "❌ .vscode directory missing"
fi

# Check TypeScript configuration
if [ -f "tsconfig.json" ]; then
    echo "✅ Frontend tsconfig.json exists"
else
    echo "❌ Missing tsconfig.json"
fi

if [ -f "backend/jsconfig.json" ]; then
    echo "✅ Backend jsconfig.json exists"
else
    echo "❌ Missing backend/jsconfig.json"
fi

# Check if dependencies are installed
if [ -d "node_modules" ]; then
    echo "✅ Frontend dependencies installed"
else
    echo "⚠️  Frontend dependencies not installed - run: npm install"
fi

if [ -d "backend/node_modules" ]; then
    echo "✅ Backend dependencies installed"
else
    echo "⚠️  Backend dependencies not installed - run: cd backend && npm install"
fi

# Test build
echo ""
echo "🔧 Testing build process..."
if npm run build > /dev/null 2>&1; then
    echo "✅ Build successful"
else
    echo "❌ Build failed - check for errors"
    exit 1
fi

echo ""
echo "📝 Next Steps for Copilot Setup:"
echo "1. Install VSCode extensions:"
echo "   - GitHub Copilot"
echo "   - GitHub Copilot Chat"
echo "   - TypeScript and JavaScript Language Features"
echo ""
echo "2. Open the workspace file for best experience:"
echo "   code .vscode/FramoCRM.code-workspace"
echo ""
echo "3. Sign in to GitHub Copilot:"
echo "   - Open Command Palette (Ctrl/Cmd + Shift + P)"
echo "   - Run: 'GitHub Copilot: Sign In'"
echo ""
echo "4. If Copilot isn't working, see:"
echo "   .vscode/COPILOT_TROUBLESHOOTING.md"
echo ""
echo "✨ Setup verification complete!"