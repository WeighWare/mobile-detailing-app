# Mobile Detailing Scheduling App

A comprehensive web application for managing a mobile car detailing business, featuring appointment scheduling, customer management, service packages, analytics, and payment processing.

**Original Figma Design:** [View on Figma](https://www.figma.com/design/z5IJPebXMAgM4JBnud268N/Mobile-Detailing-Scheduling-App)

## Features

- **Appointment Management**: Schedule, track, and manage detailing appointments with calendar integration
- **Customer Portal**: Customer profiles, service history, and loyalty program tracking
- **Service Packages**: Customizable detailing packages (Basic Wash, Premium Detail, etc.)
- **Analytics Dashboard**: Revenue tracking, appointment metrics, and business insights
- **Payment Processing**: Stripe integration for secure payments
- **Notifications**: SMS and email notifications for appointments (Twilio integration ready)
- **Responsive Design**: Modern UI built with React, TypeScript, and Tailwind CSS
- **Dark Mode**: Theme switching with next-themes

## Tech Stack

- **Frontend**: React 18.3.1 + TypeScript
- **Build Tool**: Vite 6.3.5
- **Styling**: Tailwind CSS v4.0
- **UI Components**: shadcn/ui with Radix UI primitives
- **Forms**: react-hook-form
- **Charts**: Recharts
- **Icons**: Lucide React
- **Notifications**: Sonner (toast notifications)

## Getting Started

### Prerequisites

- Node.js 20.x or higher (see `.nvmrc`)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/WeighWare/mobile-detailing-app.git
cd mobile-detailing-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Edit `.env.local` and add your API keys:
   - Stripe keys (for payment processing)
   - Twilio credentials (for SMS notifications)
   - Email service configuration

### Development

Run the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # shadcn/ui components (48 components)
│   ├── figma/          # Figma-specific utilities
│   ├── hooks/          # Custom React hooks
│   └── utils/          # Component utilities
├── types/              # TypeScript type definitions
├── services/           # Business logic (Appointments, Payments, Notifications)
├── config/             # Configuration files
├── lib/                # Utility libraries
└── App.tsx             # Main application component
```

## Current Limitations

This is a frontend-only demo application. The following features use mock implementations:

- **Data Persistence**: Uses localStorage (needs backend database)
- **Payment Processing**: Stripe integration requires API keys and backend
- **Notifications**: SMS/Email services need backend integration
- **Authentication**: No user authentication system yet

## Environment Variables

See `.env.example` for all available configuration options.

Required for full functionality:
- `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `STRIPE_SECRET_KEY` - Stripe secret key (backend only)
- `TWILIO_ACCOUNT_SID` - Twilio account SID
- `TWILIO_AUTH_TOKEN` - Twilio auth token
- `TWILIO_PHONE_NUMBER` - Twilio phone number

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## Code of Conduct

Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for details on our code of conduct.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Attributions

- UI Components: [shadcn/ui](https://ui.shadcn.com/) (MIT License)
- Icons: [Lucide React](https://lucide.dev/)
- Design: Original Figma design by the project creator

## Documentation

For detailed documentation, see [src/README.md](src/README.md).

## Support

For issues and feature requests, please use the [GitHub Issues](https://github.com/WeighWare/mobile-detailing-app/issues) page.
