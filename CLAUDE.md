# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Monorepo avec deux applications séparées :
- `backend/` — Symfony 7 + API Platform 3, expose une API REST/JSON-LD
- `frontend/` — React 19 + Vite (JavaScript), consomme l'API via proxy Vite

## Commandes courantes

```bash
# Installation des dépendances
make install
cd backend && php bin/console messenger:consume async   # permet l'envoi de mails

# Démarrer les serveurs (deux terminaux séparés)
make start-back    # Symfony sur http://localhost:8000
make start-front   # Vite sur http://localhost:5173

# Base de données
make migrate       # Applique les migrations Doctrine
make cc            # Vide le cache Symfony

# Tests backend
make test
cd backend && php bin/phpunit tests/Unit/MonTest.php   # un seul test

# Créer une migration après modification d'entité
cd backend && php bin/console make:migration
```

## Base de données

MariaDB local. Identifiants dans `backend/.env` :
- utilisateur : `recette`, mot de passe : `recette`
- base : `calculateur_recette`

Pour se connecter directement : `mariadb -u recette -precette -h 127.0.0.1 calculateur_recette`

## Architecture backend

Les entités dans `backend/src/Entity/` sont directement des ressources API Platform via `#[ApiResource]`. Il n'y a pas de couche Controller/Service distincte — API Platform génère automatiquement les routes CRUD.

**Pattern obligatoire pour chaque entité :**
- `normalizationContext: ['groups' => ['xxx:read']]` — contrôle les champs retournés en lecture
- `denormalizationContext: ['groups' => ['xxx:write']]` — contrôle les champs acceptés en écriture
- Chaque propriété doit déclarer ses groupes avec `#[Groups([...])]`

Après toute modification d'entité : `make migrate` (génère + applique la migration).

## Architecture frontend

Le frontend appelle l'API via `src/api/client.js` (`apiFetch`), qui préfixe automatiquement `/api` et positionne les headers JSON-LD. Le proxy Vite (`vite.config.js`) redirige `/api` vers `http://localhost:8000` — utiliser uniquement des chemins relatifs, jamais d'URL absolue.

Les appels API sont encapsulés dans des hooks React Query dans `src/hooks/`. Les réponses collections d'API Platform ont la forme `{ "member": [...], "totalItems": N }` (hydra_prefix désactivé).

## Formats API

L'API accepte et retourne `application/ld+json`. Le format `application/json` est aussi supporté mais retourne moins de métadonnées. Toujours utiliser `Accept: application/ld+json` côté client.

## CORS

NelmioCorsBundle autorise uniquement les origines `localhost` (tous ports). Configuré dans `backend/config/packages/nelmio_cors.yaml`, appliqué uniquement sur `^/api`.
