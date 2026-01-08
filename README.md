# FieldForce Pro

A comprehensive Field Force Management, CRM, and GPS Tracking solution for managing on-field and off-field staff.

## Features

- **Dashboard** - Real-time analytics and overview
- **User Management** - Role-based access control
- **Attendance Tracking** - Employee check-in/check-out
- **Visit Management** - Track field visits and activities
- **Task Management** - Assign and monitor tasks
- **Lead Management** - CRM functionality for leads
- **Order Management** - Track and manage orders
- **Expense Tracking** - Monitor field expenses
- **GPS Tracking** - Real-time location tracking
- **Photo Proof** - Visual verification of field activities
- **Photo Gallery** - Centralized media management
- **Onboarding** - New employee setup

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd "field force"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.local` file and add your Gemini API key:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

## Running the Application

### Development Mode
```bash
npm run dev
```
The application will be available at `http://localhost:5173`

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## Project Structure

```
field force/
├── components/          # React components
│   ├── Dashboard.tsx    # Main dashboard
│   ├── Login.tsx        # Authentication
│   ├── Sidebar.tsx      # Navigation
│   └── ...             # Other feature components
├── services/           # API and external services
│   ├── api.ts          # API utilities
│   └── geminiService.ts # Gemini AI integration
├── backend/            # Backend logic
├── App.tsx             # Main application component
├── types.ts            # TypeScript type definitions
├── constants.ts        # Application constants
└── package.json        # Dependencies and scripts
```

## Technologies Used

- **React 19** - Frontend framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Lucide React** - Icons
- **Recharts** - Data visualization
- **Google Gemini AI** - AI integration
- **Tailwind CSS** - Styling (implied from classes)

## User Roles

The application supports role-based access control with different permission levels for various modules.

## Browser Permissions

The application requires the following browser permissions:
- **Geolocation** - For GPS tracking
- **Camera** - For photo proof and gallery features
- **Microphone** - For voice notes and recordings

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is private and proprietary.