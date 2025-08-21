# AI Video Presenter

A modern AI-powered video presentation application built with React, Vite, and TypeScript.

## Features

- **Upload & Process**: Upload PowerPoint presentations and let AI analyze the content
- **AI Avatar Selection**: Choose from professional AI presenters with different expertise
- **Customization**: Adjust speaking speed, presentation style, and background settings
- **Professional Controls**: Full-featured presentation interface with annotation tools
- **Live Analytics**: Real-time viewer stats and audience engagement metrics

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI primitives
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 16+ 
- npm or yarn

### Installation

1. Clone the repository
\`\`\`bash
git clone <repository-url>
cd ai-presenter-vite
\`\`\`

2. Install dependencies
\`\`\`bash
npm install
\`\`\`

3. Start the development server
\`\`\`bash
npm run dev
\`\`\`

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

\`\`\`
src/
├── components/
│   └── ui/           # Reusable UI components
├── lib/              # Utility functions
├── App.tsx           # Main application component
├── main.tsx          # Application entry point
└── index.css         # Global styles
\`\`\`

## Features Overview

### Upload Tab
- Drag & drop PowerPoint file upload
- Real-time processing with step-by-step feedback
- Slide extraction and preview

### Customize Tab
- Professional AI avatar selection
- Detailed presenter profiles with ratings
- Presentation settings customization

### Present Tab
- Full-featured video player with controls
- Professional annotation tools
- Live audience engagement features
- Slide navigation and bookmarking

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.
