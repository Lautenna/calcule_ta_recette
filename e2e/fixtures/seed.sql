-- =============================================================================
-- JDD — Jeu de données des tests end-to-end
-- =============================================================================
-- Amorçage de la base `calculateur_recette` avant exécution des tests.
--
-- Script IDEMPOTENT : rejouable autant de fois que nécessaire, il remet
-- toujours le compte de test dans le même état de départ (mot de passe connu,
-- email confirmé, aucun jeton en cours). C'est ce qui garantit qu'un test qui
-- passe aujourd'hui passera encore demain, quel que soit l'ordre d'exécution.
--
-- Lancement :  npm run seed        (depuis e2e/)
-- ou :         mariadb -u recette -precette -h 127.0.0.1 calculateur_recette < fixtures/seed.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Utilisateur « chemin nominal » — sert aux tests de connexion réussie.
--
--   email        : e2e.connexion@example.com
--   mot de passe : Test1234!      (en clair — voir fixtures/utilisateurs.js)
--   pseudo       : E2E Connexion
--   is_verified  : 1  → OBLIGATOIRE, le UserChecker Symfony refuse la connexion
--                       de tout compte dont l'email n'est pas confirmé.
--
-- Le mot de passe est stocké haché en bcrypt coût 13, l'algorithme configuré
-- dans backend/config/packages/security.yaml (`password_hashers: auto`).
-- Pour regénérer ce hash après un changement de mot de passe :
--   php -r "echo password_hash('MonMotDePasse', PASSWORD_BCRYPT, ['cost' => 13]);"
-- -----------------------------------------------------------------------------
INSERT INTO user (
    email, pseudo, roles, password, created_at, is_verified,
    confirmation_token, confirmation_expires_at, reset_token, reset_expires_at,
    metabolisme_base
) VALUES (
    'e2e.connexion@example.com',
    'E2E Connexion',
    '[]',
    '$2y$13$TK.3Vl.rc.sVDDUzOUVgd.Tg.43b92/H3M1SIkGau.ZRYYg.xC63e',
    NOW(),
    1,
    NULL, NULL, NULL, NULL,
    NULL
)
ON DUPLICATE KEY UPDATE
    pseudo                  = VALUES(pseudo),
    password                = VALUES(password),
    is_verified             = 1,
    confirmation_token      = NULL,
    confirmation_expires_at = NULL,
    reset_token             = NULL,
    reset_expires_at        = NULL;

-- -----------------------------------------------------------------------------
-- Utilisateur du parcours « mot de passe oublié ».
--
--   email        : e2e.motdepasse@example.com
--   mot de passe : Test1234!      (même hash que ci-dessus, même mot de passe)
--   pseudo       : E2E Mot De Passe
--   is_verified  : 1
--
-- Compte SÉPARÉ du compte de connexion : le test de réinitialisation change
-- réellement le mot de passe. Le faire sur le compte de connexion casserait les
-- tests de connexion qui tournent en parallèle.
--
-- Le test remet lui-même ce compte dans cet état avant et après son exécution
-- (voir `restaurerMotDePasse` dans fixtures/backend.js).
-- -----------------------------------------------------------------------------
INSERT INTO user (
    email, pseudo, roles, password, created_at, is_verified,
    confirmation_token, confirmation_expires_at, reset_token, reset_expires_at,
    metabolisme_base
) VALUES (
    'e2e.motdepasse@example.com',
    'E2E Mot De Passe',
    '[]',
    '$2y$13$TK.3Vl.rc.sVDDUzOUVgd.Tg.43b92/H3M1SIkGau.ZRYYg.xC63e',
    NOW(),
    1,
    NULL, NULL, NULL, NULL,
    NULL
)
ON DUPLICATE KEY UPDATE
    pseudo                  = VALUES(pseudo),
    password                = VALUES(password),
    is_verified             = 1,
    confirmation_token      = NULL,
    confirmation_expires_at = NULL,
    reset_token             = NULL,
    reset_expires_at        = NULL;

-- -----------------------------------------------------------------------------
-- Compte volontairement ABSENT — sert aux tests de connexion en échec.
--
--   email : e2e.inconnu@example.com   (voir fixtures/utilisateurs.js)
--
-- Le test « email inconnu » ne prouve quelque chose que si cette adresse
-- n'existe réellement pas. On la supprime donc explicitement plutôt que de le
-- supposer : une inscription manuelle ou un test d'inscription aurait pu la
-- créer entre-temps.
-- -----------------------------------------------------------------------------
DELETE FROM user WHERE email = 'e2e.inconnu@example.com';

-- -----------------------------------------------------------------------------
-- Compte volontairement ABSENT — sert aux tests d'inscription.
--
--   email : e2e.inscription@example.com   (voir fixtures/utilisateurs.js)
--
-- Les tests d'inscription vérifient des REFUS (code d'autorisation invalide,
-- champ obligatoire vide) : ils ne créent donc aucun compte. Mais si cette
-- adresse existait déjà en base, le serveur répondrait « Cet email est déjà
-- utilisé. » et masquerait l'erreur attendue — le test échouerait pour la
-- mauvaise raison. On garantit la précondition au lieu de l'espérer.
-- -----------------------------------------------------------------------------
DELETE FROM user WHERE email = 'e2e.inscription@example.com';

-- -----------------------------------------------------------------------------
-- Compte du chemin nominal d'inscription — créé PAR le test, jamais avant.
--
--   email : e2e.inscription.ok@example.com   (voir fixtures/utilisateurs.js)
--
-- Le test « code d'autorisation valide » crée réellement ce compte, puis le
-- supprime lui-même (avant et après son exécution). On le nettoie aussi ici au
-- cas où une exécution aurait été interrompue en plein milieu.
-- -----------------------------------------------------------------------------
DELETE FROM user WHERE email = 'e2e.inscription.ok@example.com';

-- -----------------------------------------------------------------------------
-- Utilisateur POSSÉDANT UNE RECETTE — sert au test « ajouter une recette
-- enregistrée comme ingrédient » (TC_INGREDIENT_010).
--
--   email        : e2e.recette@example.com
--   mot de passe : Test1234!      (même hash que les comptes ci-dessus)
--   pseudo       : E2E Recette
--
-- Compte SÉPARÉ des autres : la liste de recettes qu'il possède fait partie de
-- son état de test. Un autre test qui enregistrerait une recette dessus
-- changerait le contenu de la liste déroulante et rendrait le test intermittent.
-- -----------------------------------------------------------------------------
INSERT INTO user (
    email, pseudo, roles, password, created_at, is_verified,
    confirmation_token, confirmation_expires_at, reset_token, reset_expires_at,
    metabolisme_base
) VALUES (
    'e2e.recette@example.com',
    'E2E Recette',
    '[]',
    '$2y$13$TK.3Vl.rc.sVDDUzOUVgd.Tg.43b92/H3M1SIkGau.ZRYYg.xC63e',
    NOW(),
    1,
    NULL, NULL, NULL, NULL,
    NULL
)
ON DUPLICATE KEY UPDATE
    pseudo                  = VALUES(pseudo),
    password                = VALUES(password),
    is_verified             = 1,
    confirmation_token      = NULL,
    confirmation_expires_at = NULL,
    reset_token             = NULL,
    reset_expires_at        = NULL;

-- Recette de ce compte, réutilisable comme ingrédient dans le calculateur.
--
-- La composition est CALIBRÉE pour que le profil « pour 100 g » calculé par
-- l'application tombe sur des nombres ronds, vérifiables à la main :
--
--   ingrédient A : 150 g à 100 kcal / P 10 / G 20 / L  5  pour 100 g
--   ingrédient B :  50 g à 300 kcal / P 30 / G  0 / L 25  pour 100 g
--   ----------------------------------------------------------------
--   total 200 g  :      300 kcal / P 30 / G 30 / L 20
--   pour 100 g   :      150 kcal / P 15 / G 15 / L 10   ← attendu du test
--
-- Ces valeurs attendues sont reprises dans fixtures/ingredients.js : si la
-- composition change ici, il faut les recalculer là-bas.
--
-- On repart d'une table vide pour ce compte à chaque amorçage : sans ce DELETE,
-- chaque exécution ajouterait une recette de plus.
DELETE FROM recette WHERE user_id = (SELECT id FROM user WHERE email = 'e2e.recette@example.com');

INSERT INTO recette (user_id, nom, nombre_personnes, description, composition)
SELECT
    id,
    'Base E2E réutilisable',
    4,
    NULL,
    '[{"type":"ingredient","nom":"Base E2E A","quantite":150,"energie_kcal":100,"proteines":10,"glucides":20,"graisses":5},
      {"type":"ingredient","nom":"Base E2E B","quantite":50,"energie_kcal":300,"proteines":30,"glucides":0,"graisses":25}]'
FROM user WHERE email = 'e2e.recette@example.com';

-- -----------------------------------------------------------------------------
-- Utilisateur du test « enregistrer un ingrédient » (TC_INGREDIENT_011).
--
--   email        : e2e.ingredient@example.com
--   mot de passe : Test1234!
--   pseudo       : E2E Ingredient
--
-- Compte SÉPARÉ, et sa liste d'ingrédients est vidée : le test vérifie qu'un
-- ingrédient APPARAÎT dans « Mes ingrédients ». S'il y était déjà (exécution
-- précédente), le test passerait sans rien prouver. Le test refait ce nettoyage
-- lui-même avant et après, pour ne pas dépendre d'un amorçage récent.
-- -----------------------------------------------------------------------------
INSERT INTO user (
    email, pseudo, roles, password, created_at, is_verified,
    confirmation_token, confirmation_expires_at, reset_token, reset_expires_at,
    metabolisme_base
) VALUES (
    'e2e.ingredient@example.com',
    'E2E Ingredient',
    '[]',
    '$2y$13$TK.3Vl.rc.sVDDUzOUVgd.Tg.43b92/H3M1SIkGau.ZRYYg.xC63e',
    NOW(),
    1,
    NULL, NULL, NULL, NULL,
    NULL
)
ON DUPLICATE KEY UPDATE
    pseudo                  = VALUES(pseudo),
    password                = VALUES(password),
    is_verified             = 1,
    confirmation_token      = NULL,
    confirmation_expires_at = NULL,
    reset_token             = NULL,
    reset_expires_at        = NULL;

DELETE FROM ingredient WHERE user_id = (SELECT id FROM user WHERE email = 'e2e.ingredient@example.com');

-- -----------------------------------------------------------------------------
-- Utilisateur du test « enregistrer une recette » (TC_RECETTE_001).
--
--   email        : e2e.mesrecettes@example.com
--   mot de passe : Test1234!
--   pseudo       : E2E Mes Recettes
--
-- Encore un compte à part, et surtout PAS `e2e.recette@example.com` : ce test
-- ajoute réellement une recette. Sur le compte de TC_INGREDIENT_010, il
-- changerait le contenu de la liste déroulante « Recette enregistrée » et
-- rendrait ce test intermittent.
--
-- Sa liste de recettes est vidée à l'amorçage : le test vérifie qu'une recette
-- APPARAÎT dans « Mes recettes ». Si elle y était déjà (exécution précédente),
-- le test passerait sans rien prouver. Le test refait ce nettoyage lui-même
-- avant et après, pour ne pas dépendre d'un amorçage récent.
-- -----------------------------------------------------------------------------
INSERT INTO user (
    email, pseudo, roles, password, created_at, is_verified,
    confirmation_token, confirmation_expires_at, reset_token, reset_expires_at,
    metabolisme_base
) VALUES (
    'e2e.mesrecettes@example.com',
    'E2E Mes Recettes',
    '[]',
    '$2y$13$TK.3Vl.rc.sVDDUzOUVgd.Tg.43b92/H3M1SIkGau.ZRYYg.xC63e',
    NOW(),
    1,
    NULL, NULL, NULL, NULL,
    NULL
)
ON DUPLICATE KEY UPDATE
    pseudo                  = VALUES(pseudo),
    password                = VALUES(password),
    is_verified             = 1,
    confirmation_token      = NULL,
    confirmation_expires_at = NULL,
    reset_token             = NULL,
    reset_expires_at        = NULL;

DELETE FROM recette WHERE user_id = (SELECT id FROM user WHERE email = 'e2e.mesrecettes@example.com');
