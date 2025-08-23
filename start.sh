#!/bin/bash

echo "🚀 Building the project..."
bun run build

echo "🌐 Starting local server on http://localhost:8000"
echo "📖 Open your browser and go to: http://localhost:8000"
echo "🔧 Open browser console (F12) to use training functions"
echo ""
echo "Available functions:"
echo "  quickDemo()     - Quick training demonstration"
echo "  trainAll(5)     - Train on all digits for 5 epochs"
echo "  testAll()       - Test accuracy on all digits"
echo "  saveWeights()   - Save trained weights to JSON"
echo "  loadWeights()   - Load weights from JSON"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

python3 -m http.server 8000