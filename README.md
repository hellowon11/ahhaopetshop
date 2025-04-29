# AH HAO PET SHOP Website

A modern, responsive website for AH HAO PET SHOP, a pet care service provider in Klang, Malaysia.

## Features

- Responsive design that works on all devices
- Modern UI with smooth animations
- WhatsApp integration for customer service
- Google Maps integration
- Contact form with email integration
- Services showcase for both dogs and cats
- About Us section
- Contact information

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:5173](http://localhost:5173) in your browser

### Building for Production

To create a production build:

```bash
npm run build
```

The built files will be in the `dist` directory.

## Configuration

Before deploying, make sure to:

1. Replace `YOUR_GOOGLE_MAPS_API_KEY` in `src/App.tsx` with your actual Google Maps API key
2. Set up EmailJS credentials in `src/App.tsx`:
   - `YOUR_SERVICE_ID`
   - `YOUR_TEMPLATE_ID`
   - `YOUR_PUBLIC_KEY`

## Technologies Used

- React
- TypeScript
- Tailwind CSS
- Vite
- EmailJS
- Lucide Icons

## How to Run the Project

1. **Open the Project**
   - Locate the "Pet Shop" folder on your desktop
   - Or directly open: `C:\Users\admin\Desktop\Pet Shop`

2. **Start the Project**
   - Press `Win + R` to open the Run window
   - Type `powershell` and press Enter to open the terminal
   - In the terminal, enter the following commands:
     ```
     cd "C:\Users\admin\Desktop\Pet Shop"
     npm run dev
     ```

3. **View the Website**
   - Wait for the terminal to show success message
   - The browser will automatically open the website
   - Or manually visit: http://localhost:5173

## Important Notes
- Ensure your computer is connected to the internet
- If you encounter any issues, try running `npm install` to reinstall dependencies
- All code changes are automatically saved 