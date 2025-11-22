#!/bin/bash
# Auto-detects environment and runs tests with appropriate configuration
# Works on: Windows 11 ARM WSL2, GitHub Actions, local development

set -e

# Check if we're in a Linux environment (WSL2, GitHub Actions, etc.)
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Check if xvfb-run is available
    if command -v xvfb-run &> /dev/null; then
        echo "Running tests with xvfb (headless display)..."
        xvfb-run -a -s "-screen 0 1280x720x24" node ./out/test/runTest.js
    else
        echo "Warning: xvfb-run not found. Tests may open a window."
        echo "Install with: sudo apt-get install -y xvfb"
        node ./out/test/runTest.js
    fi
else
    # macOS or Windows (non-WSL)
    node ./out/test/runTest.js
fi

