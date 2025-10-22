# ClipFlow

A modern, cross-platform clipboard manager built with Electron, React, and TypeScript.

## Features

- **Smart Clipboard Monitoring**: Automatically detects and categorizes clipboard content
- **Full-Screen Overlay**: Slides up from bottom with glassmorphism design
- **Auto-Categorization**: Text, Code, Color, URL, Email, Password, Number, API
- **Momentum Scrolling**: Smooth iPhone-like carousel scrolling
- **Global Shortcut**: Quick access with Ctrl+Shift+V (Cmd+Shift+V on Mac)
- **Persistent Storage**: IndexedDB for offline storage
- **Cross-Platform**: Windows, macOS, and Linux support

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run electron:dev

# Build for production
npm run build

# Create distributable packages
npm run dist
```

## Usage

1. **Launch ClipFlow**: The app runs in the system tray
2. **Copy anything**: Text, code, colors, URLs, etc.
3. **Open overlay**: Press `Ctrl+Shift+V` (or `Cmd+Shift+V` on Mac)
4. **Browse items**: Scroll through your clipboard history
5. **Click to copy**: Select any item to copy it and close the overlay

## Keyboard Shortcuts

- `Ctrl+Shift+V` / `Cmd+Shift+V`: Toggle clipboard overlay
- `Esc`: Close overlay
- `Click outside`: Close overlay

## Architecture

- **Frontend**: React + TypeScript + Tailwind CSS
- **Animation**: Framer Motion
- **Storage**: IndexedDB (via idb library)
- **Build**: Vite + Electron Builder
- **Cross-platform**: Electron

## Development

```bash
# Run in development mode
npm run electron:dev

# Build React app only
npm run build:web

# Build Electron app only
npm run build:electron

# Package for distribution
npm run electron:build
```

## Project Structure

```
clipflow/
├── electron/           # Electron main process
│   ├── main.ts        # Main process entry
│   └── preload.ts     # Preload script
├── src/               # React application
│   ├── components/    # UI components
│   ├── hooks/         # Custom hooks
│   ├── services/      # Database and services
│   ├── types/         # TypeScript types
│   └── utils/         # Utility functions
├── dist/              # Built React app
├── dist-electron/     # Built Electron files
└── release/           # Distribution packages
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.