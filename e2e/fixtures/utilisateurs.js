/**
 * JDD — comptes utilisateurs manipulés par les tests.
 *
 * Aucune donnée de test n'est écrite en dur dans les specs : elles passent
 * toutes par ce fichier. Si un compte change, on ne corrige qu'ici.
 *
 * Les valeurs sont surchargeables par variables d'environnement, pour pouvoir
 * jouer la même suite sur un autre environnement (CI, recette…) sans toucher
 * au code :
 *   E2E_EMAIL=... E2E_MOT_DE_PASSE=... npx playwright test
 *
 * Ces comptes doivent exister en base : voir fixtures/seed.sql (`npm run seed`).
 */

/**
 * Compte du chemin nominal : email confirmé, mot de passe valide.
 * Aucun test ne doit modifier ce compte, pour qu'il reste réutilisable.
 */
export const utilisateurValide = {
  email: process.env.E2E_EMAIL ?? 'e2e.connexion@example.com',
  motDePasse: process.env.E2E_MOT_DE_PASSE ?? 'Test1234!',
  pseudo: process.env.E2E_PSEUDO ?? 'E2E Connexion',
}

/**
 * Compte du parcours « mot de passe oublié ».
 *
 * Compte SÉPARÉ de `utilisateurValide`, et c'est le point important : ce
 * parcours change réellement le mot de passe du compte. S'il s'exécutait sur le
 * compte de connexion, les tests de connexion tournant en parallèle échoueraient
 * de façon intermittente.
 *
 * `motDePasseHache` est le mot de passe initial tel qu'il est stocké : le test
 * s'en sert pour remettre le compte dans son état de départ, et rester ainsi
 * rejouable. Même valeur que dans seed.sql (bcrypt de `motDePasse`).
 */
export const utilisateurMotDePasseOublie = {
  email: 'e2e.motdepasse@example.com',
  pseudo: 'E2E Mot De Passe',
  motDePasse: 'Test1234!',
  motDePasseHache: '$2y$13$TK.3Vl.rc.sVDDUzOUVgd.Tg.43b92/H3M1SIkGau.ZRYYg.xC63e',
  /** Choisi pendant le test, via le lien reçu par mail. */
  nouveauMotDePasse: 'Nouveau5678!',
}

/**
 * Compte POSSÉDANT UNE RECETTE enregistrée — parcours « réutiliser une recette
 * comme ingrédient » du calculateur.
 *
 * Compte SÉPARÉ des autres : la liste de ses recettes fait partie de son état de
 * test. Un test qui enregistrerait une recette sur le compte de connexion
 * changerait le contenu de la liste déroulante ici, et ce test deviendrait
 * intermittent.
 *
 * La recette elle-même est amorcée par seed.sql, avec une composition calibrée
 * pour donner un profil « pour 100 g » en nombres ronds (voir `recetteEnregistree`
 * dans fixtures/ingredients.js).
 */
export const utilisateurAvecRecette = {
  email: 'e2e.recette@example.com',
  pseudo: 'E2E Recette',
  motDePasse: 'Test1234!',
}

/**
 * Compte du parcours « enregistrer un ingrédient dans mes ingrédients ».
 *
 * Encore un compte à part, pour la même raison : le test AJOUTE réellement un
 * ingrédient. Il fait le ménage lui-même avant et après (voir
 * `supprimerIngredient` dans fixtures/backend.js) afin de rester rejouable.
 */
export const utilisateurMesIngredients = {
  email: 'e2e.ingredient@example.com',
  pseudo: 'E2E Ingredient',
  motDePasse: 'Test1234!',
}

/**
 * Compte du parcours « enregistrer une recette dans mon profil ».
 *
 * Distinct de `utilisateurAvecRecette`, et c'est le point important : ce test
 * AJOUTE une recette. Sur le compte de TC_INGREDIENT_010, il changerait le
 * contenu de la liste déroulante « Recette enregistrée » et rendrait ce test
 * intermittent.
 *
 * Le test fait le ménage lui-même avant et après (voir `supprimerRecette` dans
 * fixtures/backend.js) afin de rester rejouable.
 */
export const utilisateurMesRecettes = {
  email: 'e2e.mesrecettes@example.com',
  pseudo: 'E2E Mes Recettes',
  motDePasse: 'Test1234!',
}

/**
 * Chemin d'erreur n°1 — le compte existe, le mot de passe est faux.
 *
 * Dérivé de `utilisateurValide` : si l'email du compte de test change, ce cas
 * suit automatiquement. Seul le mot de passe est volontairement erroné.
 */
export const utilisateurMotDePasseIncorrect = {
  email: utilisateurValide.email,
  motDePasse: 'MauvaisMotDePasse123!',
}

/**
 * Chemin d'erreur n°2 — l'email n'existe pas, le mot de passe est valide.
 *
 * Le mot de passe reprend celui du compte valide : ainsi, si le test échoue,
 * c'est bien l'email inconnu qui est en cause et rien d'autre.
 *
 * Cette adresse ne doit PAS exister en base — seed.sql la supprime pour rendre
 * cette précondition explicite au lieu de la supposer.
 */
export const utilisateurEmailInconnu = {
  email: 'e2e.inconnu@example.com',
  motDePasse: utilisateurValide.motDePasse,
}

/**
 * Code d'autorisation volontairement erroné (site privé : l'inscription exige
 * le code REGISTRATION_CODE du backend).
 *
 * Non vide, donc accepté par la validation du navigateur : c'est bien le
 * serveur qui doit le refuser. Cette valeur ne doit jamais correspondre au
 * vrai code.
 */
export const codeInvitationInvalide = 'CODE-INVALIDE-E2E'

/**
 * JDD des tests de REFUS d'inscription — un compte qui ne doit jamais naître.
 *
 * Tous les champs sont valides côté navigateur : chaque test n'invalide qu'UNE
 * chose à la fois (un champ vidé, ou le code d'autorisation), pour que la cause
 * d'un échec soit sans ambiguïté.
 *
 * Le code est volontairement faux, et c'est sans conséquence : ces tests sont
 * soit refusés par le serveur pour cette raison même (IN-01), soit bloqués par
 * le navigateur avant le moindre appel réseau (IN-02 à IN-05). Le vrai code
 * n'est utilisé que par le test du chemin nominal, qui le lit là où il vit :
 * voir `codeInvitationValide()` dans fixtures/backend.js.
 *
 * Cette adresse ne doit PAS exister en base — seed.sql la supprime, sinon le
 * serveur répondrait « email déjà utilisé » et masquerait l'erreur attendue.
 */
export const inscriptionValide = {
  email: 'e2e.inscription@example.com',
  pseudo: 'E2E Inscription',
  motDePasse: 'Test1234!',
  codeInvitation: codeInvitationInvalide,
}

/**
 * JDD du chemin nominal — le compte réellement créé (code d'autorisation valide).
 *
 * Adresse DIFFÉRENTE de `inscriptionValide` : c'est une question d'isolation
 * entre tests. Les tests tournent en parallèle ; si le test nominal créait le
 * compte que les tests de refus tentent de créer, ces derniers recevraient
 * « Cet email est déjà utilisé » au lieu de l'erreur attendue — un test
 * intermittent, le pire des défauts pour une suite automatisée.
 *
 * Ce compte est supprimé avant et après le test qui l'utilise.
 */
export const nouveauCompte = {
  email: 'e2e.inscription.ok@example.com',
  pseudo: 'E2E Inscription OK',
  motDePasse: inscriptionValide.motDePasse,
}
