# Zenkash Code Style Guide

## TypeScript

### Types & Interfaces

```typescript
// Use interfaces for objects
interface Transaction {
  id: string;
  amount: number;
  description: string;
  categoryId: string;
  accountId: string;
  date: Date;
  type: TransactionType;
}

// Use type for unions, primitives, or simple types
type TransactionType = 'income' | 'expense' | 'transfer';
type Currency = 'EUR' | 'USD' | 'XAF';

// Use enums sparingly, prefer union types
```

### Null Handling

```typescript
// Prefer undefined over null
interface User {
  name: string;
  email?: string; // optional = undefined
}

// Use nullish coalescing
const value = data ?? defaultValue;

// Use optional chaining
const name = user?.profile?.name;
```

## Vue Components

### Script Setup Pattern

```vue
<script setup lang="ts">
// 1. Imports (external, then internal)
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useTransactionStore } from 'src/stores/transactionStore';
import type { Transaction } from 'src/types';

// 2. Props & Emits
interface Props {
  accountId: string;
  showBalance?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showBalance: true,
});

const emit = defineEmits<{
  select: [transaction: Transaction];
  delete: [id: string];
}>();

// 3. Composables & Stores
const $q = useQuasar();
const transactionStore = useTransactionStore();

// 4. Reactive State
const isLoading = ref(false);
const searchQuery = ref('');

// 5. Computed Properties
const filteredTransactions = computed(() => {
  return transactionStore.transactions.filter((t) =>
    t.description.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

// 6. Methods
function handleSelect(transaction: Transaction) {
  emit('select', transaction);
}

async function deleteTransaction(id: string) {
  isLoading.value = true;
  try {
    await transactionStore.delete(id);
    $q.notify({ type: 'positive', message: 'Deleted' });
  } finally {
    isLoading.value = false;
  }
}

// 7. Lifecycle
onMounted(() => {
  transactionStore.fetchAll();
});
</script>
```

### Template Guidelines

```vue
<template>
  <!-- Use semantic Quasar components -->
  <q-page padding>
    <!-- Conditional rendering -->
    <q-spinner v-if="isLoading" />
    
    <template v-else>
      <!-- List rendering with key -->
      <q-list>
        <q-item
          v-for="item in items"
          :key="item.id"
          clickable
          @click="handleClick(item)"
        >
          <q-item-section>{{ item.name }}</q-item-section>
        </q-item>
      </q-list>
      
      <!-- Empty state -->
      <div v-if="items.length === 0" class="text-center q-pa-lg">
        {{ $t('common.noData') }}
      </div>
    </template>
  </q-page>
</template>
```

## UI Components (Custom Wrappers)

### ⚠️ IMPORTANT: NEVER use Quasar components directly

Always use project custom components for common UI elements.

### Buttons (`src/components/buttons/`)

| Component | Usage | ❌ DON'T USE |
|-----------|-------|--------------|
| `BtnPrimary` | Primary action (save, confirm) | `<q-btn color="primary">` |
| `BtnSecondary` | Secondary action | `<q-btn color="secondary">` |
| `BtnLink` | Cancel, text link | `<q-btn flat>` |
| `BtnIcon` | Icon button (edit, delete) | `<q-btn flat round icon="...">` |
| `BtnFab` | Floating action button | `<q-btn fab>` |
| `BtnAction` | Action buttons (buy/sell) | `<q-btn unelevated>` |
| `BtnColor` | Color selector | `<q-btn>` with custom style |
| `BtnError` | Dangerous action | `<q-btn color="negative">` |

```vue
<!-- ✅ CORRECT -->
<BtnPrimary :label="t('common.save')" @click="save" />
<BtnIcon icon="edit" @click="openEdit" />
<BtnFab icon="add" @click="openCreate" />

<!-- ❌ FORBIDDEN -->
<q-btn color="primary" :label="t('common.save')" @click="save" />
<q-btn flat round icon="edit" @click="openEdit" />
<q-btn fab icon="add" @click="openCreate" />
```

### Inputs (`src/components/inputs/`)

| Component | Usage | ❌ DON'T USE |
|-----------|-------|--------------|
| `InputSingle` | Standard text field | `<q-input>` |
| `InputNumber` | Numeric field | `<q-input type="number">` |
| `InputDate` | Date selector | `<q-input>` with date picker |

```vue
<!-- ✅ CORRECT -->
<InputSingle v-model="form.name" :label="t('common.name')" :error="getError('name')" />
<InputNumber v-model="form.amount" :label="t('common.amount')" suffix="XOF" />
<InputDate v-model="form.date" :label="t('common.date')" />

<!-- ❌ FORBIDDEN -->
<q-input v-model="form.name" :label="t('common.name')" outlined dense />
<q-input v-model.number="form.amount" type="number" :label="t('common.amount')" />
```

### Modals (`src/components/modals/`)

| Component | Usage |
|-----------|-------|
| `ModalBase` | Standard modal with header/actions |
| `ModalConfirm` | Confirmation dialog |

### Tabs (`src/components/tabs/`)

| Component | Usage |
|-----------|-------|
| `TabNav` | Tab navigation (variants: underline, pills) |

### Why this rule?

1. **Consistency**: Same style everywhere in the app
2. **Maintainability**: Change style in one place
3. **DX**: Simplified and standardized props
4. **Accessibility**: Centralized management

## Pinia Stores

```typescript
// stores/transactionStore.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Transaction } from 'src/types';
import { transactionService } from 'src/services/transactionService';

export const useTransactionStore = defineStore('transaction', () => {
  // State
  const transactions = ref<Transaction[]>([]);
  const isLoading = ref(false);

  // Getters
  const totalExpenses = computed(() =>
    transactions.value
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)
  );

  const totalIncome = computed(() =>
    transactions.value
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)
  );

  // Actions
  async function fetchAll() {
    isLoading.value = true;
    try {
      transactions.value = await transactionService.getAll();
    } finally {
      isLoading.value = false;
    }
  }

  async function add(transaction: Omit<Transaction, 'id'>) {
    const newTransaction = await transactionService.create(transaction);
    transactions.value.push(newTransaction);
  }

  async function remove(id: string) {
    await transactionService.delete(id);
    transactions.value = transactions.value.filter((t) => t.id !== id);
  }

  return {
    // State
    transactions,
    isLoading,
    // Getters
    totalExpenses,
    totalIncome,
    // Actions
    fetchAll,
    add,
    remove,
  };
});
```

## Services Pattern

```typescript
// services/transactionService.ts
import type { Transaction } from 'src/types';
import { db } from 'src/services/database';

export const transactionService = {
  async getAll(): Promise<Transaction[]> {
    return db.query('SELECT * FROM transactions ORDER BY date DESC');
  },

  async getById(id: string): Promise<Transaction | undefined> {
    const results = await db.query('SELECT * FROM transactions WHERE id = ?', [id]);
    return results[0];
  },

  async create(data: Omit<Transaction, 'id'>): Promise<Transaction> {
    const id = crypto.randomUUID();
    await db.run(
      'INSERT INTO transactions (id, amount, description, categoryId, accountId, date, type) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, data.amount, data.description, data.categoryId, data.accountId, data.date, data.type]
    );
    return { id, ...data };
  },

  async update(id: string, data: Partial<Transaction>): Promise<void> {
    // Build dynamic update query
  },

  async delete(id: string): Promise<void> {
    await db.run('DELETE FROM transactions WHERE id = ?', [id]);
  },
};
```

## Styling (SCSS)

### Variables & Theming

```scss
// css/quasar.variables.scss
$primary: #6366f1;    // Indigo
$secondary: #8b5cf6;  // Violet
$accent: #06b6d4;     // Cyan
$positive: #22c55e;   // Green
$negative: #ef4444;   // Red
$warning: #f59e0b;    // Amber
$info: #3b82f6;       // Blue

$dark: #1e1e2e;
$dark-page: #11111b;
```

### Component Styles

```vue
<style lang="scss" scoped>
.transaction-card {
  border-radius: 12px;
  transition: transform 0.2s ease;

  &:active {
    transform: scale(0.98);
  }

  &__amount {
    font-size: 1.25rem;
    font-weight: 600;

    &--income {
      color: $positive;
    }

    &--expense {
      color: $negative;
    }
  }
}
</style>
```

## i18n

```typescript
// i18n/fr/index.ts
export default {
  common: {
    save: 'Enregistrer',
    cancel: 'Annuler',
    delete: 'Supprimer',
    edit: 'Modifier',
    noData: 'Aucune donnée',
  },
  transaction: {
    title: 'Transactions',
    add: 'Ajouter une transaction',
    income: 'Revenu',
    expense: 'Dépense',
    transfer: 'Transfert',
  },
  // ...
};
```

```vue
<template>
  <!-- Always use i18n -->
  <q-btn :label="$t('common.save')" />
  
  <!-- With interpolation -->
  <p>{{ $t('transaction.balance', { amount: balance }) }}</p>
</template>
```

## File Organization

```
src/
├── components/
│   ├── common/           # Shared components
│   │   ├── AppHeader.vue
│   │   └── AmountDisplay.vue
│   ├── transaction/      # Feature-specific
│   │   ├── TransactionList.vue
│   │   ├── TransactionCard.vue
│   │   └── TransactionForm.vue
│   └── charts/
│       ├── PieChart.vue
│       └── LineChart.vue
├── pages/
│   ├── IndexPage.vue     # Dashboard
│   ├── TransactionsPage.vue
│   ├── AccountsPage.vue
│   └── SettingsPage.vue
```

## Error Handling

```typescript
// Use try-catch with user feedback
async function saveTransaction() {
  try {
    await transactionStore.add(formData);
    $q.notify({ type: 'positive', message: t('transaction.saved') });
    router.push('/transactions');
  } catch (error) {
    console.error('Failed to save transaction:', error);
    $q.notify({ type: 'negative', message: t('errors.saveFailed') });
  }
}
```

## Testing Conventions

```typescript
// Component tests with Vitest
import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import TransactionCard from './TransactionCard.vue';

describe('TransactionCard', () => {
  it('displays amount with correct color for expense', () => {
    const wrapper = mount(TransactionCard, {
      props: {
        transaction: { type: 'expense', amount: 50 },
      },
    });
    expect(wrapper.find('.amount--expense').exists()).toBe(true);
  });
});
```
