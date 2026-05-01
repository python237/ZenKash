# Zenkash - Instructions de Développement IA

## Aperçu du Projet

**Zenkash** est une application de gestion de finances personnelles **complète et différenciante**. Contrairement aux apps classiques limitées à dépenses/revenus/catégories, Zenkash couvre également :
- **Investissements** (actions, crypto, biens) avec suivi de la valeur en temps réel
- **Projets** d'investissement (type startup, crowdfunding)
- **Épargne** distincte des investissements
- **Analyse avancée** de la répartition des revenus

### Stack Technique
- **Framework** : Vue 3 (Composition API)
- **Bibliothèque UI** : Quasar Framework (Material Design 3)
- **Gestion d'état** : Pinia
- **Langage** : TypeScript
- **Mobile** : Capacitor (Android en priorité, iOS plus tard)
- **Stockage** : SQLite local (offline-first, pas de requêtes réseau)
- **i18n** : vue-i18n (Français & Anglais)
- **Build** : Vite

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

## 📊 Tableaux de Bord

### Tableau de Bord Principal (Rapport)
Pour un **mois donné**, affiche :
- % des revenus investis en bourse/crypto
- % des revenus investis en projets
- % des revenus dépensés
- % des revenus laissés en banque (épargne)
- Alertes budgets dépassés
- Répartition par grande catégorie (graphique circulaire)

### Tableau de Bord Investissements
- **Total investi** : somme de tous les montants mis
- **Valeur totale du portefeuille** : somme des (quantité × taux actuel)
- **Plus/moins-value globale**
- Liste des investissements avec mini-indicateur de santé

**Vue détaillée d'un investissement** :
- Montant investi
- Valeur actuelle
- État de santé (+ ou -)
- Graphe d'évolution (historique des taux)

### Tableau de Bord Projets
- Total investi dans les projets
- Total dividendes encaissés
- ROI global
- Liste des projets avec statut

### Tableau de Bord Transactions
- Liste des transactions (filtrable par mois/catégorie/portefeuille)
- Solde par portefeuille

---

## 🧭 Navigation

**Navigation en bas (5 items)** :
1. **Rapport** : tableau de bord principal
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

## Structure du Projet

```
zenkash/
├── app/                    # Application Quasar
│   ├── src/
│   │   ├── assets/         # Ressources statiques (images, polices)
│   │   ├── boot/           # Fichiers de démarrage (initialisation plugins)
│   │   ├── components/     # Composants Vue réutilisables
│   │   ├── composables/    # Composables Vue (logique partagée)
│   │   ├── css/            # Styles globaux (SCSS)
│   │   ├── i18n/           # Traductions (en, fr)
│   │   ├── layouts/        # Layouts de l'app
│   │   ├── pages/          # Pages des routes
│   │   ├── router/         # Configuration Vue Router
│   │   ├── services/       # Logique métier & services API
│   │   ├── stores/         # Stores Pinia
│   │   └── types/          # Types/interfaces TypeScript
│   ├── src-capacitor/      # Configuration native Capacitor
│   └── quasar.config.ts    # Configuration Quasar
├── docs/                   # Documentation
└── .github/                # Workflows GitHub
```

---

## Directives de Code

### Règles Générales
1. Toujours utiliser **TypeScript** avec typage strict
2. Utiliser **Composition API** avec `<script setup lang="ts">`
3. Suivre la configuration ESLint et Prettier du projet
4. Utiliser **Pinia** pour la gestion d'état (pas Vuex)
5. Tout texte doit utiliser des **clés i18n**, pas de chaînes codées en dur
6. **TOUJOURS utiliser les composants personnalisés** - voir section Composants UI

### Composants UI (Wrappers Personnalisés)

⚠️ **RÈGLE STRICTE** : Ne JAMAIS utiliser `<q-btn>`, `<q-input>` directement dans les pages ou composants.

Toujours utiliser les wrappers personnalisés dans `src/components/`.

#### Boutons (`src/components/buttons/`)
| Composant | Usage |
|-----------|-------|
| `BtnPrimary` | Action principale (enregistrer, confirmer) |
| `BtnSecondary` | Action secondaire |
| `BtnLink` | Annuler, lien texte |
| `BtnIcon` | Bouton icône (modifier, supprimer, fermer) |
| `BtnFab` | Bouton d'action flottant |
| `BtnAction` | Boutons d'action colorés (acheter/vendre) |
| `BtnColor` | Sélecteur de couleur |
| `BtnError` | Action dangereuse |

#### Champs de saisie (`src/components/inputs/`)
| Composant | Usage |
|-----------|-------|
| `InputSingle` | Champ texte standard |
| `InputNumber` | Champ numérique (gère la conversion string→number) |
| `InputDate` | Sélecteur de date avec popup |

#### Modales (`src/components/modals/`)
| Composant | Usage |
|-----------|-------|
| `ModalBase` | Modal standard |
| `ModalConfirm` | Dialog de confirmation |

#### Onglets (`src/components/tabs/`)
| Composant | Usage |
|-----------|-------|
| `TabNav` | Navigation par onglets |

```vue
<!-- ✅ CORRECT -->
<BtnPrimary :label="t('common.save')" @click="save" />
<BtnIcon dense icon="edit" @click="edit" />
<InputNumber v-model="form.amount" :label="t('amount')" />

<!-- ❌ INTERDIT -->
<q-btn color="primary" :label="t('common.save')" />
<q-btn flat round dense icon="edit" />
<q-input v-model.number="form.amount" type="number" />
```

### Conventions de Nommage
- **Fichiers** : kebab-case (`transaction-list.vue`, `use-currency.ts`)
- **Composants** : PascalCase (`TransactionList.vue`)
- **Composables** : camelCase avec préfixe `use` (`useCurrency.ts`)
- **Stores** : camelCase avec suffixe `Store` (`transactionStore.ts`)
- **Types/Interfaces** : PascalCase (`Transaction`, `Account`)

### Structure des Composants
```vue
<template>
  <!-- Template en premier -->
</template>

<script setup lang="ts">
// Imports
// Props/Emits
// Composables
// État réactif
// Computed
// Méthodes
// Hooks de cycle de vie
</script>

<style lang="scss" scoped>
// Styles scopés
</style>
```

### Base de Données & Stockage
- Utiliser SQLite via `@capacitor-community/sqlite`
- Toutes les données sont stockées localement (offline-first)
- Pas de requêtes réseau pour les fonctionnalités principales
- Concevoir le schéma pour une future synchronisation multi-appareils

### Considérations Mobile
- Concevoir mobile-first (Android en priorité)
- Utiliser les utilitaires responsive de Quasar
- Tester sur de vrais appareils quand possible
- Considérer les interactions tactiles et gestes

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

- C'est un **projet personnel** - prioriser la simplicité et l'utilisabilité
- Garder l'UI **propre, moderne et professionnelle**
- Toutes les données financières sont **sensibles** - les manipuler avec soin
- L'app doit fonctionner **100% hors ligne** - pas de requêtes réseau pour les fonctionnalités principales
- **Épargne ≠ Investissement** : l'argent laissé en banque est de l'épargne, pas un investissement
