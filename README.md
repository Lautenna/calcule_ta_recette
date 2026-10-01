# Calcule ta recette

Application web qui calcule les **valeurs nutritionnelles d'une recette** : on la compose ingrédient par ingrédient, et l'application affiche le total, la valeur **par portion** et **pour 100 g**, avec la répartition des macronutriments. Elle propose aussi un calculateur de **métabolisme de base**.

> 🔒 **Site privé** : l'inscription exige un code d'autorisation, il est réservé aux proches.
>
> 🧪 **Projet de portfolio orienté QA** : en plus de l'application, le dépôt contient une suite de tests end-to-end Playwright (voir [Tests end-to-end](#tests-end-to-end)).

## Fonctionnalités

**Calculateur**
- Composition d'une recette : ajout d'ingrédients avec leur quantité, puis calcul du **total**, **par portion** (selon le nombre de personnes) et **pour 100 g**
- Répartition des macros (protéines, glucides, lipides) en graphique en anneau
- Trois façons de renseigner un ingrédient, via un assistant pas à pas :
  - **recherche dans la table [Ciqual](https://ciqual.anses.fr)** (ANSES), importée en base
  - **code-barres**, saisi ou **scanné à la caméra**, résolu par l'API [OpenFoodFacts](https://world.openfoodfacts.org) (la photo du produit s'affiche)
  - **saisie manuelle**
- Une **recette enregistrée peut servir d'ingrédient** dans une autre recette

**Compte**
- Inscription protégée par code d'autorisation, avec **confirmation par e-mail**
- Connexion par **JWT**, mot de passe oublié par e-mail, photo de profil
- **Mes ingrédients** et **Mes recettes** : sauvegarde personnelle, visible uniquement par son propriétaire

**Métabolisme de base**
- Calcul selon les équations originales de **Harris & Benedict (1919)**, pour chaque sexe

## Stack

| Partie | Technologies |
|---|---|
| Backend (`backend/`) | PHP ≥ 8.2, **Symfony 7.4**, **API Platform 4**, Doctrine ORM, LexikJWTAuthenticationBundle, NelmioCors, Symfony Mailer + Messenger, PhpSpreadsheet |
| Frontend (`frontend/`) | **React 19**, Vite, React Router 7, TanStack Query, Mantine, `@zxing` (lecture de code-barres) |
| Base de données | MariaDB |
| Tests E2E (`e2e/`) | **Playwright** |

## Architecture

Monorepo de deux applications séparées, plus la suite de tests :

```
.
├── backend/                 API Symfony + API Platform (REST / JSON-LD)
│   ├── src/Entity/          Aliment, Ingredient, Recette, User : directement des ressources API
│   ├── src/ApiResource/     Produit : proxy vers OpenFoodFacts
│   ├── src/Controller/      routes sur mesure : /api/me, confirmation e-mail, mot de passe, photo
│   ├── src/Doctrine/        extensions de requête (isolation par utilisateur, tri de la recherche)
│   ├── src/State/           providers et processors API Platform
│   ├── src/Mailer/          mails de confirmation et de réinitialisation
│   ├── src/Command/         app:import-ciqual
│   └── migrations/
├── frontend/                SPA React
│   └── src/
│       ├── api/client.js    apiFetch : préfixe /api, headers JSON-LD
│       ├── hooks/           appels API encapsulés dans des hooks React Query
│       ├── context/         AuthContext (session JWT)
│       ├── components/      calculateur, métabolisme, profil, layout
│       └── pages/           accueil, connexion, inscription, mot de passe, profil
├── e2e/                     suite Playwright (Page Objects, fixtures, jeu de données)
└── Makefile
```

### Choix de conception

- **Pas de couche Service/Controller pour le CRUD** : les entités portent `#[ApiResource]` et API Platform génère les routes.
- **Groupes de sérialisation sur chaque entité** (`xxx:read` / `xxx:write`) pour maîtriser ce qui sort et ce qui entre.
- **Isolation des données par utilisateur** : une extension Doctrine (`CurrentUserExtension`) restreint les requêtes aux ressources de l'utilisateur connecté, et les opérations sont protégées par des expressions `security`.
- **Proxy Vite** : le front appelle `/api` en chemin relatif et Vite redirige vers le serveur Symfony, sans URL absolue ni problème de CORS en développement.
- **Mails asynchrones** via Messenger : un worker doit tourner pour que les mails partent.

## Prérequis

- PHP ≥ 8.2 et [Composer](https://getcomposer.org)
- [Symfony CLI](https://symfony.com/download)
- [Node.js](https://nodejs.org) (LTS)
- MariaDB en local

## Installation

```bash
git clone https://github.com/Lautenna/calcule_ta_recette.git
cd calcule_ta_recette
make install        # composer install + npm install
```

### Base de données

Crée la base et l'utilisateur (valeurs par défaut de `backend/.env`) :

```sql
CREATE DATABASE calculateur_recette CHARACTER SET utf8mb4;
CREATE USER 'recette'@'127.0.0.1' IDENTIFIED BY 'recette';
GRANT ALL ON calculateur_recette.* TO 'recette'@'127.0.0.1';
```

Applique les migrations, puis importe la table Ciqual. Le fichier Excel est à télécharger sur [ciqual.anses.fr](https://ciqual.anses.fr) (il n'est pas versionné) :

```bash
make migrate
cd backend && php bin/console app:import-ciqual "chemin/vers/Table Ciqual.xlsx"
```

### Configuration

Crée `backend/.env.local` (jamais versionné) pour les valeurs sensibles :

```env
REGISTRATION_CODE=ton_code_d_inscription
MAILER_DSN=smtp://TON_ADRESSE@gmail.com:MOT_DE_PASSE_APPLICATION@smtp.gmail.com:465?encryption=ssl
MAILER_FROM=ton-adresse@gmail.com
```

Sans `MAILER_DSN` (valeur par défaut `null://null`), aucun mail n'est envoyé.

Génère les clés JWT utilisées pour l'authentification :

```bash
cd backend && php bin/console lexik:jwt:generate-keypair
```

## Lancer l'application

Dans **trois terminaux** :

```bash
make start-back                                         # Symfony → https://localhost:8000
make start-front                                        # Vite    → http://localhost:5173
cd backend && php bin/console messenger:consume async   # worker : envoi des mails
```

Ouvre ensuite <http://localhost:5173>. Le serveur Symfony local sert en HTTPS avec un certificat auto-signé.

## Commandes utiles

| Commande | Effet |
|---|---|
| `make install` | installe les dépendances backend et frontend |
| `make start-back` / `make start-front` | démarre les serveurs |
| `make migrate` | applique les migrations Doctrine |
| `make cc` | vide le cache Symfony |
| `cd backend && php bin/console make:migration` | génère une migration après modification d'une entité |
| `cd frontend && npm run lint` | lint ESLint |
| `cd frontend && npm run build` | build de production du front |

## API

Documentation interactive générée par API Platform sur `/api/docs`. Format : `application/ld+json` (`application/json` accepté, avec moins de métadonnées). Les collections ont la forme `{ "member": [...], "totalItems": N }`.

| Route | Rôle |
|---|---|
| `POST /api/users` | inscription (code d'autorisation requis) |
| `POST /api/login` | connexion, retourne un JWT |
| `POST /api/confirm-email` · `/api/resend-confirmation` | confirmation du compte |
| `POST /api/forgot-password` · `/api/reset-password` | mot de passe oublié |
| `GET /api/me` | utilisateur connecté |
| `POST /api/users/{id}/photo` | photo de profil |
| `GET /api/produits/{code}` | produit OpenFoodFacts par code-barres |
| `GET /api/aliments` | recherche dans Ciqual (lecture seule) |
| `/api/ingredients`, `/api/recettes` | CRUD des ingrédients et recettes de l'utilisateur connecté |

## Tests end-to-end

La suite Playwright pilote l'application comme un utilisateur : navigateur réel, backend réel, base réelle et **boîte mail réelle** (un collecteur SMTP local lit les mails envoyés et suit leurs liens). Elle couvre :

- l'authentification : connexion, inscription sous code d'autorisation, mot de passe oublié
- le calculateur : complétion Ciqual, code-barres (saisi et scanné par une caméra factice), validation, suppression, enregistrement
- l'exactitude des calculs nutritionnels (attendus posés à la main, jamais recalculés avec la formule de l'application)
- le métabolisme de base

```bash
cd e2e
npm ci
npx playwright install --with-deps
npm run seed    # comptes de test
npm test
```

⚠️ Aucun serveur ne doit tourner avant : Playwright démarre lui-même le front, le back et le worker de mails. Pièges, jeu de données, stratégie de sélecteurs et liste des cas de test sont détaillés dans [e2e/README.md](e2e/README.md).

## Données externes

- **Ciqual** : table de composition nutritionnelle des aliments publiée par l'ANSES, importée par `app:import-ciqual`.
- **OpenFoodFacts** : base collaborative de produits alimentaires, interrogée à la volée pour les codes-barres.
