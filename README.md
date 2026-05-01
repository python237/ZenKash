# Zenkash

**Complete personal finance management application** for tracking expenses, income, investments, and projects.

## Features

- 📊 **Dashboard** - Monthly overview of income distribution
- 💸 **Transactions** - Track income and expenses with categories
- 📈 **Investments** - Manage stocks, crypto, and assets with real-time tracking
- 🚀 **Projects** - Track startup/crowdfunding investments and ROI
- 💰 **Budgets** - Monthly budgets with alerts
- 💳 **Wallets** - Multiple wallets (cash, bank, mobile money, etc.)

## Tech Stack

- **Framework**: Vue 3 (Composition API)
- **UI**: Quasar Framework (Material Design 3)
- **State**: Pinia
- **Language**: TypeScript
- **Mobile**: Capacitor (Android, iOS)
- **Storage**: SQLite (offline-first)
- **i18n**: vue-i18n (French & English)

## Getting Started

### Prerequisites

- Node.js 18+
- Yarn or pnpm
- Android Studio (for Android development)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/zenkash.git
cd zenkash

# Install dependencies
cd app && yarn install

# Start development server
yarn dev
```

### Mobile Development

```bash
# Build Android APK (includes icons, version bump prompt)
yarn android

# Build for iOS
yarn ios

# Generate app icons from SVG
yarn assets
```

### Code Quality

```bash
# Run ESLint and TypeScript checks
yarn lint

# Fix formatting with Prettier
yarn lintfix

# TypeScript type checking only
yarn typecheck
```

## Project Structure

```
zenkash/
├── app/                    # Quasar application
│   ├── src/
│   │   ├── components/     # Reusable Vue components
│   │   ├── composables/    # Vue composables
│   │   ├── pages/          # Route pages
│   │   ├── stores/         # Pinia stores
│   │   ├── services/       # Business logic
│   │   └── types/          # TypeScript types
│   └── src-capacitor/      # Capacitor config
├── docs/                   # Documentation
└── .github/                # GitHub workflows
```

## Documentation

- [Code Style Guide](CODE_STYLEGUIDE.md) - Coding conventions and patterns
- [AI Instructions](CLAUDE.md) - Development instructions for AI assistants

**French versions:**
- [Guide de Style](CODE_STYLEGUIDE.fr.md)
- [Instructions IA](CLAUDE.fr.md)

## Key Concepts

### Master Categories
High-level groupings for income/expense analysis:
- Essential needs (food, rent, health)
- Pleasures (leisure, shopping)
- Salaried income
- Freelance income
- Dividends
- Savings

### Investments
Track stocks, crypto, and assets with:
- Quantity and current rate
- Rate history and evolution charts
- Automatic gain/loss calculations

### Projects
For non-securities investments (startups, crowdfunding):
- Track invested amounts
- Record dividends received
- Calculate ROI

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is for personal use.

## Author

Didier Tagne
