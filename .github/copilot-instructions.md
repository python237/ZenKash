# Zenkash - AI Development Instructions

## Project Overview

**Zenkash** is a **complete and differentiating** personal finance management application. Unlike traditional apps limited to expenses/income/categories, Zenkash also covers:
- **Investments** (stocks, crypto, assets) with real-time value tracking
- **Investment projects** (startup type, crowdfunding)
- **Savings** distinct from investments
- **Advanced analysis** of income distribution

### Tech Stack
- **Framework**: Vue 3 (Composition API)
- **UI Library**: Quasar Framework (Material Design 3)
- **State Management**: Pinia
- **Language**: TypeScript
- **Mobile**: Capacitor (Android priority, iOS later)
- **Storage**: Local SQLite (offline-first, no network requests)
- **i18n**: vue-i18n (French & English)
- **Build**: Vite

---

## 🎯 Functional Vision

### Key Concepts

#### 1. Master Categories (Meta-categories)
High-level groupings to analyze overall distribution:
- **Essential needs**: food, rent, health, transport
- **Pleasures**: leisure, outings, shopping
- **Salaried income**: company salary
- **Freelance income**: client project payments
- **Dividends**: returns on investments/projects
- **Savings**: money set aside without investment

#### 2. Categories
Detailed categories, each **associated with a master category**:
- Rent → Essential needs
- Transport → Essential needs
- Company X Salary → Salaried income
- Project Y Payment → Freelance income
- Comparo Dividend → Dividends

#### 3. Wallets
Where money is stored (created by user):
- Examples: Cash, OM Account, Bank Account, BRVM, Binance Wallet, etc.

> ⚠️ **Note**: Investment wallets (BRVM, crypto, etc.) are **independent** from bank accounts. They are not linked to each other.

> 📝 **Important**: All entities (master categories, categories, wallets, investment items) are **created by the user**. No predefined data - the app starts empty.

#### 4. Transactions
- **Income**: money coming in → associated with a wallet + category
- **Expense**: money going out → associated with a wallet + category

#### 5. Budgets (Monthly)
- Defined by **specific month** (no auto-rollover)
- Associated with a category or master category
- Display of consumption rate + alerts
- Ability to **copy previous month's budget**

#### 6. Investments (Stocks/Crypto/Assets)
Each investment contains:
- **Label**: exact name (e.g., "SONATEL", "Bitcoin", "Dakar Apartment")
- **Type**: stock, crypto, real estate, other
- **Quantity**: number of units held
- **Rate/Unit price**: current value of one unit
- **Rate history**: each update is saved → enables evolution chart
- **Source wallet**: where the invested money comes from

**Automatic calculations**:
- Total amount invested (sum of purchases)
- Current value = quantity × current rate
- Gain/loss = current value - amount invested
- Health status (gain/loss in %)

#### 7. Projects (Non-securities Investments)
For startup-type investments, crowdfunding (e.g., Comparo):
- **Amount invested**: money out
- **Dividends received**: returns received (income categorized as "Dividends")
- **ROI**: calculated return on investment

---

## 📊 Dashboards

### Main Dashboard (Report)
For a **given month**, displays:
- % of income invested in stocks/crypto
- % of income invested in projects
- % of income spent
- % of income left in bank (savings)
- Budget exceeded alerts
- Distribution by master category (pie chart)

### Investments Dashboard
- **Total invested**: sum of all amounts put in
- **Total portfolio value**: sum of (quantity × current rate)
- **Overall gain/loss**
- List of investments with mini health indicator

**Detailed view of an investment**:
- Amount invested
- Current value
- Health status (+ or -)
- Evolution chart (rate history)

### Projects Dashboard
- Total invested in projects
- Total dividends received
- Overall ROI
- List of projects with status

### Transactions Dashboard
- Transaction list (filterable by month/category/wallet)
- Balance per wallet

---

## 🧭 Navigation

**Bottom Navigation (5 items)**:
1. **Report**: main dashboard
2. **Transactions**: list and add income/expenses
3. **Investment**: manage stocks/crypto/assets
4. **Projects**: manage investment projects
5. **More**: access to Budgets, Categories, Wallets, Settings

---

## 🗃️ Data Model (Simplified Schema)

```typescript
// Master categories
interface MasterCategory {
  id: string
  name: string
  type: 'expense' | 'income'
  icon?: string
  color?: string
}

// Categories
interface Category {
  id: string
  name: string
  masterCategoryId: string
  icon?: string
}

// Wallets
interface Wallet {
  id: string
  name: string
  type: 'cash' | 'bank' | 'mobile_money' | 'other'
  balance: number // calculated
  icon?: string
}

// Transactions
interface Transaction {
  id: string
  type: 'income' | 'expense'
  amount: number
  date: Date
  categoryId: string
  walletId: string
  description?: string
}

// Budgets
interface Budget {
  id: string
  month: string // format: "2024-01"
  categoryId?: string
  masterCategoryId?: string
  amount: number
  spent: number // calculated
}

// Investment items
interface InvestmentItem {
  id: string
  label: string
  type: 'stock' | 'crypto' | 'real_estate' | 'other'
  quantity: number
  currentRate: number
  walletId: string // source wallet
  createdAt: Date
}

// Rate history
interface RateHistory {
  id: string
  investmentItemId: string
  rate: number
  date: Date
}

// Investment transactions (buy/sell)
interface InvestmentTransaction {
  id: string
  investmentItemId: string
  type: 'buy' | 'sell'
  quantity: number
  pricePerUnit: number
  date: Date
  walletId: string
}

// Projects
interface Project {
  id: string
  name: string
  description?: string
  totalInvested: number
  walletId: string
  createdAt: Date
}

// Project dividends (linked to income transactions)
interface ProjectDividend {
  id: string
  projectId: string
  transactionId: string // linked to an income transaction
  amount: number
  date: Date
}
```

---

## Project Structure

```
zenkash/
├── app/                    # Quasar application
│   ├── src/
│   │   ├── assets/         # Static assets (images, fonts)
│   │   ├── boot/           # Boot files (plugins initialization)
│   │   ├── components/     # Reusable Vue components
│   │   ├── composables/    # Vue composables (shared logic)
│   │   ├── css/            # Global styles (SCSS)
│   │   ├── i18n/           # Translations (en, fr)
│   │   ├── layouts/        # App layouts
│   │   ├── pages/          # Route pages
│   │   ├── router/         # Vue Router config
│   │   ├── services/       # Business logic & API services
│   │   ├── stores/         # Pinia stores
│   │   └── types/          # TypeScript types/interfaces
│   ├── src-capacitor/      # Capacitor native config
│   └── quasar.config.ts    # Quasar configuration
├── docs/                   # Documentation
└── .github/                # GitHub workflows
```

---

## Coding Guidelines

### General Rules
1. Always use **TypeScript** with strict typing
2. Use **Composition API** with `<script setup lang="ts">`
3. Follow the project's ESLint and Prettier configuration
4. Use **Pinia** for state management (not Vuex)
5. All text must use **i18n keys**, no hardcoded strings
6. **ALWAYS use custom components** - see UI Components section

### UI Components (Custom Wrappers)

⚠️ **STRICT RULE**: NEVER use `<q-btn>`, `<q-input>` directly in pages or components.

Always use custom wrappers in `src/components/`.

#### Buttons (`src/components/buttons/`)
| Component | Usage |
|-----------|-------|
| `BtnPrimary` | Primary action (save, confirm) |
| `BtnSecondary` | Secondary action |
| `BtnLink` | Cancel, text link |
| `BtnIcon` | Icon button (edit, delete, close) |
| `BtnFab` | Floating action button |
| `BtnAction` | Colored action buttons (buy/sell) |
| `BtnColor` | Color selector |
| `BtnError` | Dangerous action |

#### Inputs (`src/components/inputs/`)
| Component | Usage |
|-----------|-------|
| `InputSingle` | Standard text field |
| `InputNumber` | Numeric field (handles string→number) |
| `InputDate` | Date picker with popup |

#### Modals (`src/components/modals/`)
| Component | Usage |
|-----------|-------|
| `ModalBase` | Standard modal |
| `ModalConfirm` | Confirmation dialog |

#### Tabs (`src/components/tabs/`)
| Component | Usage |
|-----------|-------|
| `TabNav` | Tab navigation |

```vue
<!-- ✅ CORRECT -->
<BtnPrimary :label="t('common.save')" @click="save" />
<BtnIcon dense icon="edit" @click="edit" />
<InputNumber v-model="form.amount" :label="t('amount')" />

<!-- ❌ FORBIDDEN -->
<q-btn color="primary" :label="t('common.save')" />
<q-btn flat round dense icon="edit" />
<q-input v-model.number="form.amount" type="number" />
```

### Naming Conventions
- **Files**: kebab-case (`transaction-list.vue`, `use-currency.ts`)
- **Components**: PascalCase (`TransactionList.vue`)
- **Composables**: camelCase with `use` prefix (`useCurrency.ts`)
- **Stores**: camelCase with `Store` suffix (`transactionStore.ts`)
- **Types/Interfaces**: PascalCase (`Transaction`, `Account`)

### Component Structure
```vue
<template>
  <!-- Template first -->
</template>

<script setup lang="ts">
// Imports
// Props/Emits
// Composables
// Reactive state
// Computed
// Methods
// Lifecycle hooks
</script>

<style lang="scss" scoped>
// Scoped styles
</style>
```

### Database & Storage
- Use SQLite via `@capacitor-community/sqlite`
- All data is stored locally (offline-first)
- No network requests for core functionality
- Design schema for future multi-device sync

### Mobile Considerations
- Design mobile-first (Android priority)
- Use Quasar's responsive utilities
- Test on actual devices when possible
- Consider touch interactions and gestures

---

## Commands

```bash
# Navigate to app directory first
cd app

# Development
yarn dev              # Start development server (hot-reload)

# Build
yarn build            # Build for production

# Code Quality
yarn lint             # Run ESLint and TypeScript checks
yarn lintfix          # Fix formatting with Prettier
yarn typecheck        # TypeScript type checking only

# Mobile
yarn android          # Build Android APK (icons, version bump, Gradle patches)
yarn ios              # Build for iOS
yarn assets           # Generate app icons from SVG sources
```

---

## Important Notes

- This is a **personal project** - prioritize simplicity and usability
- Keep the UI **clean, modern, and professional**
- All financial data is **sensitive** - handle with care
- The app must work **100% offline** - no network requests for core functionality
- **Savings ≠ Investment**: money left in the bank is savings, not an investment
