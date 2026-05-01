# Zenkash - AI Development Instructions

## Project Overview

**Zenkash** est une application de gestion de finances personnelles **complète et différenciante**. Contrairement aux apps classiques limitées à dépenses/revenus/catégories, Zenkash couvre également :
- **Investissements** (actions, crypto, biens) avec suivi de la valeur en temps réel
- **Projets** d'investissement (type startup, crowdfunding)
- **Épargne** distincte des investissements
- **Analyse avancée** de la répartition des revenus

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

## 🎯 Vision Fonctionnelle

### Concepts Clés

#### 1. Grandes Catégories (Meta-catégories)
Regroupements de haut niveau pour analyser la répartition globale :
- **Besoins obligatoires** : nutrition, loyer, santé, transport
- **Plaisirs** : loisirs, sorties, shopping
- **Revenus salariés** : salaire entreprise
- **Revenus freelance** : paiements projets clients
- **Dividendes** : retours sur investissements/projets
- **Épargne** : mise de côté sans investissement

#### 2. Catégories
Catégories détaillées, chacune **associée à une grande catégorie** :
- Loyer → Besoins obligatoires
- Transport → Besoins obligatoires
- Salaire Entreprise X → Revenus salariés
- Paiement Projet Y → Revenus freelance
- Dividende Comparo → Dividendes

#### 3. Portefeuilles (Wallets)
Où l'argent est stocké (créés par l'utilisateur) :
- Exemples : Espèces, Compte OM, Compte bancaire, BRVM, Wallet Binance, etc.

> ⚠️ **Note** : Les portefeuilles d'investissement (BRVM, crypto, etc.) sont **indépendants** des comptes bancaires. Ils ne sont pas liés entre eux.

> 📝 **Important** : Toutes les entités (grandes catégories, catégories, portefeuilles, items d'investissement) sont **créées par l'utilisateur**. Aucune donnée prédéfinie - l'app démarre vide.

#### 4. Transactions
- **Revenu** : entrée d'argent → associé à un portefeuille + catégorie
- **Dépense** : sortie d'argent → associé à un portefeuille + catégorie

#### 5. Budgets (Mensuels)
- Définis par **mois spécifique** (pas d'auto-report)
- Associés à une catégorie ou grande catégorie
- Affichage du taux de consommation + alertes
- Possibilité de **copier le budget du mois précédent**

#### 6. Investissements (Actions/Crypto/Biens)
Chaque investissement contient :
- **Label** : nom exact (ex: "SONATEL", "Bitcoin", "Appartement Dakar")
- **Type** : action, crypto, bien immobilier, autre
- **Quantité** : nombre d'unités détenues
- **Taux/Prix unitaire** : valeur actuelle d'une unité
- **Historique des taux** : chaque mise à jour est sauvegardée → permet graphe d'évolution
- **Portefeuille source** : d'où vient l'argent investi

**Calculs automatiques** :
- Montant total investi (somme des achats)
- Valeur actuelle = quantité × taux actuel
- Plus/moins-value = valeur actuelle - montant investi
- État de santé (gain/perte en %)

#### 7. Projets (Investissements non-titres)
Pour les investissements type startup, crowdfunding (ex: Comparo) :
- **Montant investi** : argent sorti
- **Dividendes reçus** : retours encaissés (revenus catégorisés en "Dividendes")
- **ROI** : retour sur investissement calculé

---

## 📊 Dashboards

### Dashboard Principal (Rapport)
Pour un **mois donné**, affiche :
- % des revenus investis en bourse/crypto
- % des revenus investis en projets
- % des revenus dépensés
- % des revenus laissés en banque (épargne)
- Alertes budgets dépassés
- Répartition par grande catégorie (pie chart)

### Dashboard Investissements
- **Total investi** : somme de tous les montants mis
- **Valeur totale du portefeuille** : somme des (quantité × taux actuel)
- **Plus/moins-value globale**
- Liste des investissements avec mini-indicateur de santé

**Vue détaillée d'un investissement** :
- Montant investi
- Valeur actuelle
- État de santé (+ ou -)
- Graphe d'évolution (historique des taux)

### Dashboard Projets
- Total investi dans les projets
- Total dividendes encaissés
- ROI global
- Liste des projets avec statut

### Dashboard Transactions
- Liste des transactions (filtrable par mois/catégorie/portefeuille)
- Solde par portefeuille

---

## 🧭 Navigation

**Bottom Navigation (5 items)** :
1. **Rapport** : dashboard principal
2. **Transactions** : liste et ajout de revenus/dépenses
3. **Investissement** : gestion actions/crypto/biens
4. **Projets** : gestion projets d'investissement
5. **Plus** : accès à Budgets, Catégories, Portefeuilles, Paramètres

---

## 🗃️ Modèle de Données (Schéma Simplifié)

```typescript
// Grandes catégories
interface MasterCategory {
  id: string
  name: string
  type: 'expense' | 'income'
  icon?: string
  color?: string
}

// Catégories
interface Category {
  id: string
  name: string
  masterCategoryId: string
  icon?: string
}

// Portefeuilles
interface Wallet {
  id: string
  name: string
  type: 'cash' | 'bank' | 'mobile_money' | 'other'
  balance: number // calculé
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
  spent: number // calculé
}

// Items d'investissement
interface InvestmentItem {
  id: string
  label: string
  type: 'stock' | 'crypto' | 'real_estate' | 'other'
  quantity: number
  currentRate: number
  walletId: string // portefeuille source
  createdAt: Date
}

// Historique des taux
interface RateHistory {
  id: string
  investmentItemId: string
  rate: number
  date: Date
}

// Transactions d'investissement (achats/ventes)
interface InvestmentTransaction {
  id: string
  investmentItemId: string
  type: 'buy' | 'sell'
  quantity: number
  pricePerUnit: number
  date: Date
  walletId: string
}

// Projets
interface Project {
  id: string
  name: string
  description?: string
  totalInvested: number
  walletId: string
  createdAt: Date
}

// Dividendes de projet (liés aux transactions revenus)
interface ProjectDividend {
  id: string
  projectId: string
  transactionId: string // lié à une transaction de type revenu
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

⚠️ **STRICT RULE / RÈGLE STRICTE**:
- 🇬🇧 NEVER use `<q-btn>`, `<q-input>` directly in pages or components.
- 🇫🇷 Ne JAMAIS utiliser `<q-btn>`, `<q-input>` directement dans les pages ou composants.

Always use custom wrappers in `src/components/`. / Toujours utiliser les wrappers dans `src/components/`.

#### Buttons (`src/components/buttons/`)
| Component | Usage (EN) | Usage (FR) |
|-----------|------------|------------|
| `BtnPrimary` | Primary action (save, confirm) | Action principale |
| `BtnSecondary` | Secondary action | Action secondaire |
| `BtnLink` | Cancel, text link | Annuler, lien texte |
| `BtnIcon` | Icon button (edit, delete, close) | Bouton icône |
| `BtnFab` | Floating action button | Bouton d'action flottant |
| `BtnAction` | Colored action buttons (buy/sell) | Boutons d'action colorés |
| `BtnColor` | Color selector | Sélecteur de couleur |
| `BtnError` | Dangerous action | Action dangereuse |

#### Inputs (`src/components/inputs/`)
| Component | Usage (EN) | Usage (FR) |
|-----------|------------|------------|
| `InputSingle` | Standard text field | Champ texte standard |
| `InputNumber` | Numeric field (handles string→number) | Champ numérique |
| `InputDate` | Date picker with popup | Sélecteur de date |

#### Modals (`src/components/modals/`)
| Component | Usage |
|-----------|-------|
| `ModalBase` | Standard modal / Modal standard |
| `ModalConfirm` | Confirmation dialog / Dialog de confirmation |

#### Tabs (`src/components/tabs/`)
| Component | Usage |
|-----------|-------|
| `TabNav` | Tab navigation / Navigation par onglets |

```vue
<!-- ✅ CORRECT -->
<BtnPrimary :label="t('common.save')" @click="save" />
<BtnIcon dense icon="edit" @click="edit" />
<InputNumber v-model="form.amount" :label="t('amount')" />

<!-- ❌ FORBIDDEN / INTERDIT -->
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

## Commandes

```bash
# Se placer dans le dossier app
cd app

# Développement
yarn dev              # Serveur de développement (hot-reload)

# Build
yarn build            # Build pour production

# Qualité du code
yarn lint             # ESLint et vérification TypeScript
yarn lintfix          # Formatage avec Prettier
yarn typecheck        # Vérification des types uniquement

# Mobile
yarn android          # Build APK Android (icônes, version, patches Gradle)
yarn ios              # Build pour iOS
yarn assets           # Génération des icônes depuis SVG
```

---

## Notes Importantes

- Ceci est un **projet personnel** - privilégier simplicité et utilisabilité
- Garder l'UI **propre, moderne et professionnelle**
- Toutes les données financières sont **sensibles** - à manipuler avec soin
- L'app doit fonctionner **100% hors-ligne** - pas de requêtes réseau pour les fonctionnalités core
- **Épargne ≠ Investissement** : l'argent laissé en banque est de l'épargne, pas un investissement
