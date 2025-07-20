#!/bin/bash

echo "🚀 Blue Pixel AI Chatbot - Netlify Deployment Script"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the client
echo "🔨 Building React client..."
cd client
npm install
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Client build failed!"
    exit 1
fi

cd ..

echo "✅ Build completed successfully!"
echo ""
echo "📋 Next steps for Netlify deployment:"
echo ""
echo "Option 1 - Via Netlify Dashboard:"
echo "1. Go to https://netlify.com and login"
echo "2. Click 'New site from Git'"
echo "3. Connect your GitHub repository"
echo "4. Set build settings:"
echo "   - Build command: npm run build"
echo "   - Publish directory: client/build"
echo "   - Functions directory: netlify/functions"
echo ""
echo "Option 2 - Via Netlify CLI:"
echo "1. Install CLI: npm install -g netlify-cli"
echo "2. Login: netlify login"
echo "3. Deploy: netlify deploy --prod --dir=client/build"
echo ""
echo "Option 3 - Drag & Drop:"
echo "1. Go to https://netlify.com/drop"
echo "2. Drag the 'client/build' folder to the page"
echo ""
echo "🔧 Don't forget to:"
echo "- Set environment variables in Netlify dashboard"
echo "- Configure custom domain (optional)"
echo "- Test the deployed functions"
echo ""
echo "📚 For detailed instructions, see NETLIFY_DEPLOYMENT.md"