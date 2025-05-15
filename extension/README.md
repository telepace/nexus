# Nexus Browser Extension

<div align="center">
  <img src="assets/icon.png" alt="Nexus Logo" width="128" />
  <h3>Your Intelligent Reading Companion</h3>
</div>

## Overview

Nexus Browser Extension is a lightweight, powerful tool that brings AI-powered reading assistance directly to your browser. It serves as your intelligent reading companion, enabling quick access to Nexus platform features and enhancing your web browsing experience.

### Key Features

- **Instant Content Summarization**: Get concise summaries of articles, research papers, and web pages with a single click
- **Smart Clipping**: Save web content to your Nexus knowledge base with automatic extraction of key information
- **Contextual AI Assistance**: Select text for immediate translation, explanation, or extension based on your needs
- **Seamless Integration**: Access your Nexus content library directly from your browser

## Use Cases

- **Research & Study**: Quickly capture and summarize research materials
- **Efficient Information Processing**: Filter through content noise with AI-powered summaries
- **Knowledge Management**: Build your personal knowledge base while browsing
- **Language Support**: Get instant translations and explanations of complex concepts

## Installation

### From Source

1. Clone this repository
```bash
git clone https://github.com/your-username/nexus-extension.git
cd nexus-extension
```

2. Install dependencies
```bash
npm install
```

3. Build the extension
```bash
npm run build-complete
```

4. Load the extension in Chrome/Edge/Firefox
   - Open `chrome://extensions/` (or equivalent in other browsers)
   - Enable Developer Mode
   - Click "Load unpacked" and select the `build` directory

### From Release
*Coming soon to browser extension stores*

## Development

### Prerequisites

- Node.js
- npm or pnpm
- ImageMagick (optional, for icon generation)

### Development Commands

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build-complete

# Package for distribution
npm run package
```

## Architecture

The extension follows a modular architecture:

```
extension/
├── assets/           # Static assets including icons
├── background/       # Background scripts for event handling
│   ├── index.ts      # Main background script
│   └── messages/     # Message handlers for background-UI communication
├── routes/           # React Router-based navigation
│   ├── pages/        # UI pages (Home, Settings, etc.)
│   └── ui/           # Reusable UI components
├── utils/            # Utility functions and helpers
├── lib/              # Shared libraries and services
├── content.ts        # Content script for webpage interaction
└── popup.tsx         # Main entry point for the popup UI
```

### Key Components

- **Background Service**: Manages extension state, handles browser events, and communicates with the Nexus backend
- **Content Scripts**: Interact with web pages to extract content and provide UI overlays
- **Popup Interface**: Provides quick access to Nexus features and content management
- **API Client**: Communicates with the Nexus platform for data synchronization

## Privacy & Data Handling

The Nexus Browser Extension is designed with privacy in mind:

- All content processing happens through your authenticated Nexus account
- No browsing data is collected beyond what you explicitly save to your Nexus library
- Your data remains in your control at all times

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License - see the LICENSE file for details. 