# Marketing Attribution & QR Generator for TrialMe

A modern, client-side React application for generating tracked marketing URLs with custom QR codes. Built with Vite, React, and Tailwind CSS.

## Features

### 🔗 URL Attribution
- **Target URL Input**: Add any TrialMe landing page URL
- **Channel Selection**: Choose from Instagram, Facebook, LinkedIn, TikTok, or YouTube
- **UTM Parameter Generation**: Automatically generates standard UTM parameters:
  - `utm_source`: Channel or Podcast name
  - `utm_medium`: Fixed as "social"
  - `utm_campaign`: Channel or Event name
  - `utm_content`: Motivation angle
  - `utm_term`: Search context (self/others)

### 📊 External Attribution Options
- **Podcast Attribution**: Toggle to add podcast source tracking
- **Event Attribution**: Toggle to add live event/conference tracking

### 🎯 Campaign Settings
- **Motivation Angles**: Educational, Financial Incentive, Altruistic/Community, Personal Health
- **Search Context**: Target people looking for themselves or others

### 🔐 Privacy
- **100% Client-Side**: No server storage, all processing happens in your browser
- **Privacy Banner**: Prominent disclaimer about data handling
- **One-Click Clear**: Refresh the page to clear all inputs

### 📱 QR Code Features
- **Real-Time QR Generation**: Automatically generates QR for your tracked URL
- **Color Customization**: Change QR code background and foreground colors
- **Logo Branding**: Upload your company logo to embed in the center of the QR code
- **Export Options**:
  - Download as PNG
  - Export as PDF with campaign URL information

### 🎨 Design
- Modern, minimalist "Google-style" UI inspired by Material Design 3
- Fully responsive (mobile, tablet, desktop)
- Clean white background with soft rounded corners
- Blue primary color scheme
- Built with Chakra UI v2 for professional, accessible components

## Technology Stack

- **Frontend Framework**: React with TypeScript
- **Build Tool**: Vite
- **Styling**: Chakra UI v2 (Component Framework with Emotion CSS-in-JS)
- **UI Components**: 
  - `@chakra-ui/react` - Component library
  - `@emotion/react`, `@emotion/styled` - CSS-in-JS
  - `framer-motion` - Animation library
  - `lucide-react` for icons
  - `qrcode.react` for QR code generation
  - `jspdf` + `html2canvas` for PDF export

## Project Structure

```
src/
├── components/
│   ├── PrivacyBanner.tsx      # Privacy disclaimer banner
│   ├── FormSection.tsx         # Main input form
│   ├── URLPreview.tsx          # Tagged URL display & copy button
│   └── QRGenerator.tsx         # QR code generation & customization
├── App.tsx                     # Main application component
├── App.css                     # (Empty, Tailwind handled)
├── index.css                   # Tailwind directives
└── main.tsx                    # React entry point
```

## Getting Started

### Prerequisites
- Node.js 16+ and npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open [http://localhost:5173](http://localhost:5173) in your browser

### Build for Production

```bash
npm run build
```

The optimized build will be in the `dist/` folder, ready to deploy.

## Usage

1. **Enter Target URL**: Paste your TrialMe landing page URL
2. **Select Channel**: Choose the marketing channel (Instagram, Facebook, etc.)
3. **Configure Campaign**: 
   - Add podcast/event information if applicable
   - Select motivation angle
   - Choose search context
4. **Copy Tagged URL**: Use the generated URL in your marketing materials
5. **Generate QR Code**: Customize colors and add your logo
6. **Export**: Download as PNG or PDF

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## Data Privacy

This tool operates entirely in your browser:
- ✅ No data sent to servers
- ✅ No tracking or analytics
- ✅ No cookies stored
- ✅ Refresh = Complete data wipe

## License

© 2026 TrialMe. All rights reserved.

## Support

For issues or feature requests, contact the development team.

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
