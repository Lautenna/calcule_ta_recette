# Tests end-to-end — Calculateur de recette

Suite Playwright qui pilote l'application par l'interface, comme un utilisateur :
navigateur réel, backend réel, base réelle, et **boîte mail réelle** (un collecteur
SMTP local, voir [Le courrier](#le-courrier)).

Périmètre couvert : authentification (connexion, inscription sous code
d'autorisation, mot de passe oublié), calculateur (complétion Ciqual, code-barres
OpenFoodFacts, scan caméra, validation, suppression, enregistrement), exactitude
des calculs nutritionnels, métabolisme de base. **33 tests, 32 cas de test.**

---

## Démarrage rapide

```bash
# 1. À la racine du monorepo — base de données à jour
make migrate
cd backend && php bin/console app:import-ciqual   # table Ciqual (requise par 2 cas)

# 2. Ici, dans e2e/
npm ci
npx playwright install --with-deps
npm run seed        # amorce les comptes de test (voir Jeu de données)
npm test
```

Playwright démarre lui-même le front et le back (`webServer` dans
[playwright.config.js](playwright.config.js)) : **aucun serveur ne doit tourner
avant**. C'est le piège n°1, détaillé juste en dessous.

---

## Les trois pièges

### 1. Ne pas avoir de backend déjà démarré

Si un `make start-back` tourne, `reuseExistingServer` le réutilise **tel quel** —
donc avec le `MAILER_DSN` de `backend/.env.local`. Conséquence : les mails de test
partent pour de vrai via ton compte Gmail (vers des adresses `@example.com`, donc
bounce garanti), et les tests qui les attendent échouent après 20 s.

Deux issues : arrêter ce serveur pour laisser Playwright le démarrer, ou le
relancer avec le DSN du collecteur :

```bash
cd backend && MAILER_DSN=smtp://127.0.0.1:1025 symfony server:start
```

### 2. Amorcer la base

Cinq comptes de test doivent exister, email confirmé — un par parcours qui modifie
réellement des données. `npm run seed` les crée (script idempotent, rejouable).
Sans lui, les tests concernés échouent avec un message explicite (« lancer
`npm run seed` »), pas une erreur obscure.

### 3. Renseigner le code d'autorisation

Le site est privé : l'inscription exige `REGISTRATION_CODE`. C'est un secret, donc
il n'est pas versionné. Il est lu dans `backend/.env.local`, ou dans
`E2E_CODE_INVITATION`. **Sans lui, `IN-06` se marque « ignoré »** plutôt que
d'échouer — pense à vérifier qu'il n'est pas silencieusement sauté.

---

## Lancer les tests

| Commande | Effet |
|---|---|
| `npm test` | toute la campagne, sans interface |
| `npm run test:headed` | navigateur visible |
| `npm run test:ui` | mode interactif (pas à pas, time-travel) |
| `npm run report` | ouvre le rapport HTML de la dernière campagne |
| `npm run seed` | (ré)amorce le jeu de données |
| `npx playwright test tests/Authentification` | un dossier |
| `npx playwright test --grep "CO-01"` | un cas précis |
| `npx playwright test --debug` | inspecteur pas à pas |

En cas d'échec, Playwright conserve capture d'écran et vidéo dans
`test-results/`, et la trace au premier réessai (`npx playwright show-trace`).

---

## Prérequis

- **Node** (avec `@playwright/test`, installé par `npm ci`)
- **MariaDB** local, base `calculateur_recette` migrée (`make migrate` à la racine)
- **Table Ciqual peuplée** — `php bin/console app:import-ciqual`, requis par
  `TC_INGREDIENT_001` et `TC_INGREDIENT_002`
- **PHP / Symfony CLI** — Playwright lance `symfony server:start`
- **Worker Messenger** — les mails passent par la file asynchrone. Il est démarré
  automatiquement par `backend/.symfony.local.yaml` quand Playwright démarre le
  serveur. Sans lui, aucun mail n'arrive jamais.
- **Accès Internet** — `TC_INGREDIENT_008/009/013/014/015` interrogent l'API
  publique OpenFoodFacts, volontairement non simulée : c'est justement le lien à
  prouver.
- **Ports libres** : 5173 (front), 8000 (back, HTTPS), 1025 (collecteur SMTP)

---

## Le courrier

Deux parcours ne se terminent pas dans l'application : l'utilisateur quitte le
site, ouvre sa boîte mail, et revient par le lien reçu. Les tests suivent
exactement ce chemin — ils lisent le mail réellement envoyé et cliquent son lien —
au lieu de lire le jeton en base. Un mail jamais parti, ou porteur d'un lien mal
formé, resterait invisible autrement.

[fixtures/collecteurSmtp.js](fixtures/collecteurSmtp.js) ouvre pour la durée de la
campagne un vrai serveur SMTP minimal sur `127.0.0.1:1025`. Chaque message reçu
est déposé en `.eml` dans `.mails/` (ignoré par git), où
[fixtures/boiteMail.js](fixtures/boiteMail.js) le relit comme le ferait un client
mail : destinataire, objet décodé, corps, liens.

Deux bénéfices : rien ne quitte la machine, et les messages restent consultables
après coup — ouvrir un `.eml` suffit pour analyser une anomalie.

Si le port 1025 est déjà pris (Mailpit, MailHog…) :
`E2E_SMTP_PORT=1125 npx playwright test`.

---

## Organisation

```
fixtures/     jeu de données et outillage (JDD, base, collecteur SMTP, caméra factice)
pages/        Page Objects — un par écran, plus CarteIngredient (une instance PAR carte)
tests/        les specs, groupées par domaine fonctionnel
global-setup  ouvre la boîte mail de test avant la campagne, la ferme après
```

Principes tenus dans toute la suite :

- **Aucune donnée de test en dur dans les specs** — tout passe par `fixtures/`.
- **Un repère pour trouver, une assertion pour vérifier** — jamais le texte affiché
  pour les deux à la fois (voir [Stratégie de sélecteurs](#stratégie-de-sélecteurs)).
- **Un compte par parcours qui écrit** — les tests tournent en parallèle ; un test
  qui change un mot de passe ou ajoute une recette ne doit pas perturber les autres.
- **Nettoyage avant *et* après** — avant aussi, car une exécution interrompue laisse
  des traces. C'est ce qui rend la suite rejouable à l'infini.
- **Préconditions vérifiées, pas supposées** — un compte absent ou un aliment Ciqual
  manquant est signalé comme tel, au lieu de faire échouer une assertion d'interface.
- **Ce que l'utilisateur voit est vérifié par l'interface.** La base n'est consultée
  que pour ce qui est invisible à l'écran (compte en attente de confirmation) ou pour
  préparer l'état de départ.
- **Suffixage par `workerIndex`** là où deux exécutions concurrentes du même cas
  toucheraient la même donnée.

---

## Stratégie de sélecteurs

Deux familles de repères, et un critère pour choisir.

**Par défaut, ce que perçoit l'utilisateur** — rôle ARIA, libellé, texte visible
(`getByRole`, `getByLabel`). C'est le cas de la quasi-totalité des actions de la
suite : boutons, champs, messages. Ces sélecteurs ne cassent pas au moindre
changement de style, et ils vérifient au passage que l'interface reste utilisable
au lecteur d'écran.

**Par exception, un `data-testid` posé dans l'application**, quand ce qu'il faut
désigner n'a pas de nom accessible — parce que ce n'est justement pas un élément
avec lequel on interagit :

| Ce qu'il faut désigner | Repère | Ce que le texte ne permettait pas |
|---|---|---|
| une carte ingrédient | `carte-ingredient` | une carte n'est ni une région ni un formulaire nommé, et deux cartes affichent les mêmes libellés : un test à plusieurs lignes ne pouvait dire que « ce nom est quelque part dans la page » |
| l'étape courante de l'assistant | `etape-type`, `etape-methode`, `etape-recette`, `etape-code-barres`, `etape-saisie` | affirmer « la carte en est à telle étape », et non « telle phrase est affichée » |
| une ligne, une cellule du tableau | `ligne-total`, `ligne-par-portion`, `ligne-pour-100g`, `ligne-ingredient`, `cellule-energie`… | une cellule était atteinte par son RANG : réordonner les colonnes aurait fait lire la mauvaise valeur sans rien casser |
| les valeurs de la ligne de synthèse | `synthese-nom`, `synthese-quantite`, `synthese-energie` | « · 150 g » mêle mise en forme et valeur (voir ci-dessous) |
| les listes du profil et leurs lignes | `mes-ingredients`, `mes-recettes`, `ingredient-enregistre`, `recette-enregistree` | les deux listes exposent le même libellé de suppression (« Supprimer X »), et « Mes recettes » se retrouve dans le pseudo d'un compte de test |
| le métabolisme affiché | `metabolisme-valeur` | ce nombre n'a aucun nom accessible : il était trouvé « par sa forme », comme seul texte numérique de sa carte |

**Le repère dit OÙ lire, l'assertion dit QUOI.** C'est la règle qui justifie tous
les cas ci-dessus. `getByText('· 150 g')` joue les deux rôles à la fois, et cette
confusion coûte cher dans un sens précis : le jour où la mise en forme change, un
`toBeVisible()` échoue proprement (« introuvable »), mais un `toBeHidden()`
**passe**, pour la mauvaise raison. Un test vert qui ne vérifie plus rien est pire
qu'un test rouge. Avec `getByTestId('synthese-quantite')` +
`toContainText('150 g')`, les deux sens échouent bruyamment — et le rapport montre
l'écart de valeur au lieu d'un élément manquant.

**Ce qui reste volontairement sans `data-testid`**, parce que le repère y est
lui-même l'objet du test :

- les **messages d'erreur de champ** — suivis par `aria-describedby`, c'est-à-dire
  par le lien que l'application déclare entre un champ et son erreur. Un message
  affiché sans ce lien est invisible pour un lecteur d'écran ;
- le **bandeau de notification** — trouvé par son rôle `alert`, qui est
  précisément ce qui le fait annoncer ;
- la **roue des macros** — son nom accessible PORTE la valeur à vérifier
  (« Répartition macros : 190 kcal par portion ») ;
- les **messages adressés à l'utilisateur** (« une connexion vous sera proposée »,
  « Aucune recette enregistrée. ») — c'est ce texte-là, tel qu'il est écrit, que le
  cas de test affirme.

---

## Jeu de données

Amorcé par [fixtures/seed.sql](fixtures/seed.sql), décrit dans
[fixtures/utilisateurs.js](fixtures/utilisateurs.js). Tous ces comptes ont l'email
confirmé et le mot de passe `Test1234!`.

| Compte | Rôle |
|---|---|
| `e2e.connexion@example.com` | chemin nominal de connexion — **aucun test ne le modifie** |
| `e2e.motdepasse@example.com` | mot de passe oublié — ce parcours change le mot de passe |
| `e2e.recette@example.com` | possède une recette calibrée, réutilisable comme ingrédient |
| `e2e.ingredient@example.com` | ajoute un ingrédient personnel |
| `e2e.mesrecettes@example.com` | enregistre une recette |

Trois adresses doivent au contraire **ne pas exister** (`seed.sql` les supprime) :
`e2e.inconnu@`, `e2e.inscription@`, `e2e.inscription.ok@`. Sans cette garantie, le
serveur répondrait « email déjà utilisé » et masquerait l'erreur attendue.

> ⚠️ `npm run seed` écrit dans la base de **développement**. Ces comptes ont un mot
> de passe publiquement versionné : ne jamais jouer ce script sur un environnement
> exposé.

---

## Variables d'environnement

Toutes optionnelles — les valeurs par défaut visent l'environnement local.

| Variable | Défaut | Usage |
|---|---|---|
| `E2E_CODE_INVITATION` | lu dans `backend/.env.local` | code d'autorisation d'inscription |
| `E2E_MAILER_DSN` | collecteur local | DSN passé au backend démarré par Playwright |
| `E2E_SMTP_HOTE` / `E2E_SMTP_PORT` | `127.0.0.1` / `1025` | adresse du collecteur SMTP |
| `E2E_DB_HOST` / `E2E_DB_USER` / `E2E_DB_PASSWORD` / `E2E_DB_NAME` | `127.0.0.1` / `recette` / `recette` / `calculateur_recette` | accès base pour préparer et vérifier |
| `E2E_EMAIL` / `E2E_MOT_DE_PASSE` / `E2E_PSEUDO` | compte de connexion du JDD | rejouer la suite sur un autre environnement |
| `CI` | — | active `forbidOnly`, 2 réessais, 1 seul worker |

---

## Cas de test

### Authentification

| Cas | Vérifie | Fichier |
|---|---|---|
| `CO-01` | identifiants valides → session ouverte, profil accessible, JWT stocké, session persistée au rechargement | [connexion](tests/Authentification/Connexion/connexion.spec.js) |
| `CO-02` | mot de passe incorrect → refus, aucun jeton, `/profil` inaccessible par URL | ↑ |
| `CO-03` | email inconnu → même refus | ↑ |
| `CO-04` | le message d'erreur ne révèle pas si le compte existe | ↑ |
| `IN-01` | code d'autorisation invalide → 422, aucun compte créé | [inscription](tests/Authentification/Inscription/inscription.spec.js) |
| `IN-02` | formulaire vide → chaque champ signalé, aucun appel serveur | ↑ |
| `IN-03` → `IN-05` | email / pseudo / mot de passe manquant → blocage côté navigateur | ↑ |
| `IN-06` | code valide → compte créé **en attente de confirmation**, aucune session, connexion refusée | ↑ |
| `IN-07` | l'email saisi en connexion est repris à l'inscription, le mot de passe non | ↑ |
| `TC_AUTH_010` | mot de passe oublié : mail reçu, lien suivi, nouveau mot de passe utilisable | [mot-de-passe-oublie](tests/Authentification/MotDePasse/mot-de-passe-oublie.spec.js) |

### Calculateur

| Cas | Vérifie | Fichier |
|---|---|---|
| `TC_INGREDIENT_001` | sélectionner un aliment Ciqual complète énergie, P, G, L | [completion-ciqual](tests/Calculateur/completion-ciqual.spec.js) |
| `TC_INGREDIENT_003` | sans sélection, rien n'est complété : un ingrédient inventé reste saisissable | ↑ |
| `TC_INGREDIENT_002` | quantité manquante → validation refusée | [validation](tests/Calculateur/validation.spec.js) |
| `TC_INGREDIENT_004` | valeurs nutritionnelles manquantes → refus | ↑ |
| `TC_INGREDIENT_005` | carte complète → repliement sur la ligne de synthèse | ↑ |
| `TC_INGREDIENT_006` | supprimer la seule ligne la remet à zéro sans la retirer | [suppression](tests/Calculateur/suppression.spec.js) |
| `TC_INGREDIENT_007` | plusieurs lignes → seule la ligne visée est retirée | ↑ |
| `TC_INGREDIENT_008` | code-barres tapé, validé au bouton **et** à la touche Entrée (2 tests) | [code-barres](tests/Calculateur/code-barres.spec.js) |
| `TC_INGREDIENT_009` | code-barres **scanné à la caméra**, décodé par l'application | ↑ |
| `TC_INGREDIENT_013` | code-barres tapé dans le champ « Nom » → reconnu comme tel, Ciqual non interrogé | ↑ |
| `TC_INGREDIENT_014` | sous le seuil de 8 chiffres, aucune recherche ne part | ↑ |
| `TC_INGREDIENT_015` | code inconnu → signalé, saisie manuelle proposée en repli | ↑ |
| `TC_INGREDIENT_010` | une recette du compte s'ajoute comme ingrédient, profil pour 100 g calculé | [recette](tests/Calculateur/recette.spec.js) |
| `TC_INGREDIENT_011` | connecté → l'ingrédient est mémorisé et réutilisable | [enregistrement](tests/Calculateur/enregistrement.spec.js) |
| `TC_INGREDIENT_012` | non connecté → connexion proposée, rien n'est enregistré | ↑ |

### Recette et métabolisme

| Cas | Vérifie | Fichier |
|---|---|---|
| `TC_RECETTE_001` | connecté → recette enregistrée **et restituable** (totaux confrontés au JDD) | [enregistrement-recette](tests/Calculateur/enregistrement-recette.spec.js) |
| `TC_RECETTE_002` | non connecté → connexion proposée, rien n'est enregistré | ↑ |
| `TC_RECETTE_003` | par portion = total ÷ nombre de portions, total inchangé | [calcul-macros](tests/Calculateur/calcul-macros.spec.js) |
| `TC_RECETTE_004` | chaque macro mise à l'échelle de la quantité, puis additionnée | ↑ |
| `TC_METABOLISME_001` | métabolisme conforme à Harris & Benedict, pour chaque sexe | [calcul](tests/Metabolisme/calcul.spec.js) |

Les attendus des cas de calcul sont **posés à la main** dans les fixtures, jamais
recalculés avec la formule de l'application : c'est la seule façon de démasquer un
coefficient inversé ou une division oubliée.

---

## Un test échoue — par où commencer

| Message | Cause |
|---|---|
| `Aucun email reçu pour … après 20 s` | un backend tournait déjà (piège n°1), ou le worker Messenger est arrêté |
| `Le compte de test … est absent de la base` | `npm run seed` |
| `Impossible de démarrer le collecteur SMTP … (EADDRINUSE)` | port 1025 occupé → `E2E_SMTP_PORT=1125` |
| `IN-06` marqué « ignoré » | `REGISTRATION_CODE` introuvable (piège n°3) |
| `précondition JDD : « … » doit exister dans la base Ciqual` | `php bin/console app:import-ciqual` |
| `l'API doit servir le produit (reçu 404/502)` | OpenFoodFacts indisponible — dépendance externe, l'application n'est pas en cause |
| `précondition JDD : le code-barres … doit désigner un produit …` | OFF est contributif : la fiche du produit a changé |

Chaque message d'échec de cette suite est rédigé pour nommer la cause probable :
lis-le avant de rejouer le test.

---

## Couverture navigateur

Un seul projet actif : **Chromium** (le build embarqué par Playwright, pas Google
Chrome). Les projets `firefox`, `webkit` et les profils mobiles sont présents mais
commentés dans [playwright.config.js](playwright.config.js).

Rien dans la suite n'est propre à Chromium — aucun sélecteur fragile (rôles ARIA
et `data-testid`, cf. [Stratégie de sélecteurs](#stratégie-de-sélecteurs)), aucun
flag de lancement, et la caméra factice remplace
`navigator.mediaDevices` en JavaScript pur. Le seul point de vigilance à
l'élargissement est `TC_INGREDIENT_009` sous WebKit : il repose sur
`canvas.captureStream()`, absent des Safari antérieurs à 16.4.
