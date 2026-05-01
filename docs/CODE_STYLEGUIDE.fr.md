# Guide de Style du Code Zenkash

## TypeScript

### Types & Interfaces

```typescript
// Utiliser les interfaces pour les objets
interface Transaction {
  id: string;
  amount: number;
  description: string;
  categoryId: string;
  accountId: string;
  date: Date;
  type: TransactionType;
}

// Utiliser les types pour les unions, primitifs ou types simples
type TransactionType = 'income' | 'expense' | 'transfer';
type Currency = 'EUR' | 'USD' | 'XAF';

// Utiliser les enums avec parcimonie, préférer les types unions
```

### Gestion des Null

```typescript
// Préférer undefined à null
interface User {
  name: string;
  email?: string; // optionnel = undefined
}

// Utiliser la coalescence nulle
const value = data ?? defaultValue;

// Utiliser le chaînage optionnel
const name = user?.profile?.name;
```

## Composants Vue

### Pattern Script Setup

```vue
<script setup lang="ts">
// 1. Imports (externes, puis internes)
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

// 4. État réactif
const isLoading = ref(false);
const searchQuery = ref('');

// 5. Propriétés calculées
const filteredTransactions = computed(() => {
  return transactionStore.transactions.filter((t) =>
    t.description.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

// 6. Méthodes
function handleSelect(transaction: Transaction) {
  emit('select', transaction);
}

async function deleteTransaction(id: string) {
  isLoading.value = true;
  try {
    await transactionStore.delete(id);
    $q.notify({ type: 'positive', message: 'Supprimé' });
  } finally {
    isLoading.value = false;
  }
}

// 7. Cycle de vie
onMounted(() => {
  transactionStore.fetchAll();
});
</script>
```

### Directives pour les Templates

```vue
<template>
  <!-- Utiliser les composants Quasar sémantiques -->
  <q-page padding>
    <!-- Rendu conditionnel -->
    <q-spinner v-if="isLoading" />
    
    <template v-else>
      <!-- Rendu de liste avec clé -->
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
      
      <!-- État vide -->
      <div v-if="items.length === 0" class="text-center q-pa-lg">
        {{ $t('common.noData') }}
      </div>
    </template>
  </q-page>
</template>
```

## Composants UI (Wrappers Personnalisés)

### ⚠️ IMPORTANT : Ne JAMAIS utiliser les composants Quasar directement

Toujours utiliser les composants personnalisés du projet pour les éléments UI communs.

### Boutons (`src/components/buttons/`)

| Composant | Usage | ❌ NE PAS utiliser |
|-----------|-------|--------------------|
| `BtnPrimary` | Action principale (enregistrer, confirmer) | `<q-btn color="primary">` |
| `BtnSecondary` | Action secondaire | `<q-btn color="secondary">` |
| `BtnLink` | Annuler, lien texte | `<q-btn flat>` |
| `BtnIcon` | Bouton icône (modifier, supprimer) | `<q-btn flat round icon="...">` |
| `BtnFab` | Bouton d'action flottant | `<q-btn fab>` |
| `BtnAction` | Boutons d'action (acheter/vendre) | `<q-btn unelevated>` |
| `BtnColor` | Sélecteur de couleur | `<q-btn>` avec style personnalisé |
| `BtnError` | Action dangereuse | `<q-btn color="negative">` |

```vue
<!-- ✅ CORRECT -->
<BtnPrimary :label="t('common.save')" @click="save" />
<BtnIcon icon="edit" @click="openEdit" />
<BtnFab icon="add" @click="openCreate" />

<!-- ❌ INTERDIT -->
<q-btn color="primary" :label="t('common.save')" @click="save" />
<q-btn flat round icon="edit" @click="openEdit" />
<q-btn fab icon="add" @click="openCreate" />
```

### Champs de saisie (`src/components/inputs/`)

| Composant | Usage | ❌ NE PAS utiliser |
|-----------|-------|--------------------|
| `InputSingle` | Champ texte standard | `<q-input>` |
| `InputNumber` | Champ numérique | `<q-input type="number">` |
| `InputDate` | Sélecteur de date | `<q-input>` avec date picker |

```vue
<!-- ✅ CORRECT -->
<InputSingle v-model="form.name" :label="t('common.name')" :error="getError('name')" />
<InputNumber v-model="form.amount" :label="t('common.amount')" suffix="XOF" />
<InputDate v-model="form.date" :label="t('common.date')" />

<!-- ❌ INTERDIT -->
<q-input v-model="form.name" :label="t('common.name')" outlined dense />
<q-input v-model.number="form.amount" type="number" :label="t('common.amount')" />
```

### Modales (`src/components/modals/`)

| Composant | Usage |
|-----------|-------|
| `ModalBase` | Modal standard avec header/actions |
| `ModalConfirm` | Dialog de confirmation |

### Onglets (`src/components/tabs/`)

| Composant | Usage |
|-----------|-------|
| `TabNav` | Navigation par onglets (variantes: underline, pills) |

### Pourquoi cette règle ?

1. **Cohérence** : Même style partout dans l'app
2. **Maintenabilité** : Modifier le style à un seul endroit
3. **DX** : Props simplifiées et standardisées
4. **Accessibilité** : Gestion centralisée

## Stores Pinia

```typescript
// stores/transactionStore.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Transaction } from 'src/types';
import { transactionService } from 'src/services/transactionService';

export const useTransactionStore = defineStore('transaction', () => {
  // État
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
    // État
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

## Pattern Services

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
    // Construire une requête de mise à jour dynamique
  },

  async delete(id: string): Promise<void> {
    await db.run('DELETE FROM transactions WHERE id = ?', [id]);
  },
};
```

## Styles (SCSS)

### Variables & Thèmes

```scss
// css/quasar.variables.scss
$primary: #6366f1;    // Indigo
$secondary: #8b5cf6;  // Violet
$accent: #06b6d4;     // Cyan
$positive: #22c55e;   // Vert
$negative: #ef4444;   // Rouge
$warning: #f59e0b;    // Ambre
$info: #3b82f6;       // Bleu

$dark: #1e1e2e;
$dark-page: #11111b;
```

### Styles de Composants

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
  <!-- Toujours utiliser i18n -->
  <q-btn :label="$t('common.save')" />
  
  <!-- Avec interpolation -->
  <p>{{ $t('transaction.balance', { amount: balance }) }}</p>
</template>
```

## Organisation des Fichiers

```
src/
├── components/
│   ├── common/           # Composants partagés
│   │   ├── AppHeader.vue
│   │   └── AmountDisplay.vue
│   ├── transaction/      # Spécifiques à une fonctionnalité
│   │   ├── TransactionList.vue
│   │   ├── TransactionCard.vue
│   │   └── TransactionForm.vue
│   └── charts/
│       ├── PieChart.vue
│       └── LineChart.vue
├── pages/
│   ├── IndexPage.vue     # Tableau de bord
│   ├── TransactionsPage.vue
│   ├── AccountsPage.vue
│   └── SettingsPage.vue
```

## Gestion des Erreurs

```typescript
// Utiliser try-catch avec retour utilisateur
async function saveTransaction() {
  try {
    await transactionStore.add(formData);
    $q.notify({ type: 'positive', message: t('transaction.saved') });
    router.push('/transactions');
  } catch (error) {
    console.error('Échec de la sauvegarde de la transaction:', error);
    $q.notify({ type: 'negative', message: t('errors.saveFailed') });
  }
}
```
