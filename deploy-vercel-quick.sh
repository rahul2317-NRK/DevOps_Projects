#!/bin/bash

echo "🚀 Quick Vercel Deployment - Blue Pixel AI Chatbot"
echo "================================================="

# Create clean deployment directory
echo "📁 Creating clean deployment directory..."
rm -rf deploy-temp
mkdir deploy-temp

# Copy essential files only
echo "📋 Copying essential files..."
cp -r api deploy-temp/
cp -r client/build deploy-temp/client/
cp vercel.json deploy-temp/
cp package.json deploy-temp/
cp .vercelignore deploy-temp/

# Change to deployment directory
cd deploy-temp

echo "🌟 Files ready for deployment:"
ls -la

echo ""
echo "🚀 Deploying to Vercel..."
echo "⚠️  This may take a few minutes..."

# Deploy with timeout handling
timeout 300 npx vercel --prod || {
    echo ""
    echo "⚠️  Deployment timed out or failed."
    echo "📋 Alternative deployment methods:"
    echo ""
    echo "1. Manual deployment:"
    echo "   - Go to https://vercel.com/new"
    echo "   - Upload the 'deploy-temp' folder"
    echo ""
    echo "2. GitHub deployment:"
    echo "   - Push code to GitHub"
    echo "   - Connect repository to Vercel"
    echo ""
    echo "3. Vercel CLI with login:"
    echo "   - Run: vercel login"
    echo "   - Then: vercel --prod"
    echo ""
    exit 1
}

echo ""
echo "🎉 Deployment completed successfully!"
echo "🌐 Your Blue Pixel AI Chatbot is now live!"
echo ""
echo "✅ Features available:"
echo "  • Chat interface with REST API"
echo "  • Property search functionality"
echo "  • Mortgage calculations"
echo "  • Health check endpoint"
echo ""
echo "🧪 Test your deployment:"
echo "  • Visit your Vercel URL"
echo "  • Try the 'Test API' button"
echo "  • Test property search and mortgage calculator"
echo ""

# Clean up
cd ..
rm -rf deploy-temp

echo "🧹 Cleanup completed!"
echo "🎊 Your Blue Pixel AI Chatbot is ready!"