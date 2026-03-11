# Copilot Instructions for Marketing Attribution & QR Generator

## Project Overview
This is a Vite + React + TypeScript + Tailwind CSS application that provides a client-side tool for generating marketing attribution URLs (with UTM parameters) and custom QR codes for TrialMe campaigns.

## Project Setup
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 7.3.1
- **Styling**: Chakra UI v2 (Component Framework with Emotion CSS-in-JS)
- **Key Dependencies**:
  - `@chakra-ui/react` - Component library
  - `@emotion/react`, `@emotion/styled` - CSS-in-JS
  - `framer-motion` - Animation library
  - `qrcode.react` - QR code generation
  - `lucide-react` - Icon library
  - `jspdf` - PDF export
  - `html2canvas` - Image conversion for PDF

## Architecture & Components

### Component Structure
- **App.tsx**: Main orchestrator managing form state and URL generation
- **PrivacyBanner.tsx**: Privacy disclaimer banner
- **FormSection.tsx**: Multi-section form for campaign configuration
- **URLPreview.tsx**: Displays and allows copying of generated UTM URL
- **QRGenerator.tsx**: QR code generation with color/logo customization

### State Management
- Uses React `useState` hook for managing form data
- Form state is lifted to App.tsx for shared access across components
- No external state management needed (client-side only)

## Development Guidelines

### Code Style
- Use TypeScript for all components
- Use functional components with hooks
- Keep components focused on single responsibility
- Use descriptive component and prop names

### Naming Conventions
- Components: PascalCase (e.g., FormSection)
- Files: Match component name (FormSection.tsx)
- Props interfaces: ComponentNameProps
- Variables/functions: camelCase

### Styling
- Use Chakra UI components exclusively
- Theme colors: Blue primary (#1E40AF), white backgrounds, gray accents
- Use Chakra's `Box`, `VStack`, `HStack`, `Grid` for layouts
- Use theme color schemes like `colorScheme="blue"` for buttons
- Typography: Use Chakra's `Heading` and `Text` components
- Responsive design: Use Chakra's responsive array syntax (e.g., `{{ base: '1fr', md: '1fr 1fr' }}`)

## Feature Development

### Adding New Form Fields
1. Add property to FormData interface in App.tsx
2. Add initial state in useState
3. Create form control in FormSection.tsx
4. Update URL generation logic if needed in App.tsx

### Modifying UTM Parameters
- Edit the `generateTaggedUrl()` function in App.tsx
- Current mapping:
  - `utm_source`: Podcast name or Channel
  - `utm_medium`: Fixed as "social"
  - `utm_campaign`: Event name or Channel
  - `utm_content`: Motivation angle
  - `utm_term`: Search context (self/others)

### Customizing QR Code
- QRGenerator.tsx handles all QR functionality
- Modify color pickers, logo handling, or export options there
- Uses `qrcode.react` library for generation

## Build & Deployment

### Development
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

### Deployment
- Output directory: `dist/`
- No server-side dependencies needed
- Can be hosted on any static hosting (Vercel, Netlify, GitHub Pages)

## Performance Considerations
- QR code generation is fast and client-side only
- PDF export uses canvas rendering (can be optimized if needed)
- No external API calls or network requests
- All data stays in browser (no localStorage or IndexedDB usage)

## Privacy & Security
- No backend servers or database
- No tracking or analytics implemented
- All URLs and QR codes generated locally
- Refresh page = complete data wipe
- Safe for sensitive campaign information

## Testing Approach
- Manual testing in browser
- Test across devices (mobile, tablet, desktop)
- Verify URL generation with UTM parameters
- Test QR code generation and exports
- Check color picker functionality
- Validate logo upload and overlay

## Known Limitations
- Logo upload limited to browser file size
- PDF export depends on html2canvas accuracy
- QR code size fixed at 256x256 (configurable if needed)

## Future Enhancement Ideas
- Save/load campaign templates
- Batch URL generation
- Analytics integration
- Advanced QR code customization (patterns, shapes)
- OAuth integration for direct sharing
- QR code statistics/scanner integration

## Troubleshooting

### Dev Server Issues
1. Ensure port 5173 is not in use
2. Clear node_modules and reinstall if dependency issues occur
3. Check Node.js version compatibility (16+)

### Build Issues
1. Run `npm run build` to catch compilation errors
2. Check console for TypeScript errors
3. Verify all imports are correct

### QR Code Not Generating
1. Verify target URL is valid
2. Check console for errors
3. Ensure qrcode.react is properly installed

## Maintenance Notes
- Keep dependencies updated quarterly
- Monitor Tailwind CSS utility usage
- Review component composition for optimization opportunities
- Maintain TypeScript strict mode
