# Zenkash

**Application complète de gestion de finances personnelles** pour suivre les dépenses, revenus, investissements et projets.

## Fonctionnalités

- 📊 **Tableau de bord** - Vue mensuelle de la répartition des revenus
- 💸 **Transactions** - Suivi des revenus et dépenses par catégorie
- 📈 **Investissements** - Gestion des actions, crypto et actifs avec suivi en temps réel
- 🚀 **Projets** - Suivi des investissements startup/crowdfunding et ROI
- 💰 **Budgets** - Budgets mensuels avec alertes
- 💳 **Portefeuilles** - Plusieurs portefeuilles (espèces, banque, mobile money, etc.)

## Stack Technique

- **Framework** : Vue 3 (Composition API)
- **UI** : Quasar Framework (Material Design 3)
- **État** : Pinia
- **Langage** : TypeScript
- **Mobile** : Capacitor (Android, iOS)
- **Stockage** : SQLite (offline-first)
- **i18n** : vue-i18n (Français & Anglais)

## Démarrage

### Prérequis

- Node.js 18+
- Yarn ou pnpm
- Android Studio (pour le développement Android)

### Installation

```bash
# Cloner le dépôt
git clone https://github.com/yourusername/zenkash.git
cd zenkash

# Installer les dépendances
cd app && yarn install

# Démarrer le serveur de développement
yarn dev
```

### Développement Mobile

```bash
# Ajouter Capacitor Android
quasar mode add capacitor
quasar dev -m capacitor -T android

# Build APK
quasar build -m capacitor -T android
```

## Structure du Projet

```
zenkash/
├── app/                    # Application Quasar
│   ├── src/
│   │   ├── components/     # Composants Vue réutilisables
│   │   ├── composables/    # Composables Vue
│   │   ├── pages/          # Pages des routes
│   │   ├── stores/         # Stores Pinia
│   │   ├── services/       # Logique métier
│   │   └── types/          # Types TypeScript
│   └── src-capacitor/      # Config Capacitor
├── docs/                   # Documentation
└── .github/                # Workflows GitHub
```

## Documentation

- [Guide de Style](CODE_STYLEGUIDE.fr.md) - Conventions de code et patterns
- [Instructions IA](CLAUDE.fr.md) - Instructions de développement pour les assistants IA

**Versions anglaises :**
- [Code Style Guide](CODE_STYLEGUIDE.md)
- [AI Instructions](CLAUDE.md)

## Concepts Clés

### Grandes Catégories
Regroupements de haut niveau pour l'analyse revenus/dépenses :
- Besoins essentiels (alimentation, loyer, santé)
- Plaisirs (loisirs, shopping)
- Revenus salariés
- Revenus freelance
- Dividendes
- Épargne

### Investissements
Suivi des actions, crypto et actifs avec :
- Quantité et taux actuel
- Historique des taux et graphiques d'évolution
- Calculs automatiques de plus/moins-values

### Projets
Pour les investissements non-titres (startups, crowdfunding) :
- Suivi des montants investis
- Enregistrement des dividendes reçus
- Calcul du ROI

## Contribuer

1. Forker le dépôt
2. Créer une branche feature (`git checkout -b feature/super-fonctionnalite`)
3. Committer vos changements (`git commit -m 'Ajoute une super fonctionnalité'`)
4. Pusher la branche (`git push origin feature/super-fonctionnalite`)
5. Ouvrir une Pull Request

## Licence

Ce projet est pour usage personnel.

## Auteur

Didier Tagne
