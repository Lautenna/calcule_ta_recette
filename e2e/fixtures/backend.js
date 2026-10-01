import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * Accès aux ressources du backend depuis les tests : base de données et
 * configuration.
 *
 * Un test end-to-end pilote l'application par l'interface, mais il a parfois
 * besoin de préparer ou de vérifier l'état réel du système :
 *
 *  - PRÉPARER : garantir qu'un compte n'existe pas avant de le créer, et le
 *    supprimer après, pour que la suite reste rejouable à l'infini ;
 *  - VÉRIFIER : contrôler en base ce que l'interface ne montre pas (ici, qu'un
 *    compte créé est bien en attente de confirmation).
 *
 * Ces accès restent volontairement limités à ces deux usages. Tout ce qui est
 * visible par l'utilisateur doit être vérifié par l'interface, sinon le test ne
 * prouve plus rien sur l'application telle qu'elle est utilisée.
 */

/** Racine du monorepo, déduite de l'emplacement de ce fichier. */
const RACINE = path.resolve(__dirname, '..', '..')

/**
 * Connexion MariaDB — mêmes identifiants que `npm run seed` (voir CLAUDE.md).
 * Surchargeables pour jouer la suite sur un autre environnement.
 */
const BASE = {
  hote: process.env.E2E_DB_HOST ?? '127.0.0.1',
  utilisateur: process.env.E2E_DB_USER ?? 'recette',
  motDePasse: process.env.E2E_DB_PASSWORD ?? 'recette',
  nom: process.env.E2E_DB_NAME ?? 'calculateur_recette',
}

/**
 * Exécute une requête SQL et renvoie les lignes brutes (colonnes séparées par
 * des tabulations, sans en-tête — options `-B -N`).
 */
function requeter(sql) {
  const sortie = execFileSync(
    'mariadb',
    [
      '-h', BASE.hote,
      '-u', BASE.utilisateur,
      `-p${BASE.motDePasse}`,
      BASE.nom,
      '-B', '-N',
      '-e', sql,
    ],
    { encoding: 'utf8' },
  )

  return sortie
    .split('\n')
    .filter((ligne) => ligne.length > 0)
    .map((ligne) => ligne.split('\t'))
}

/**
 * Échappe une valeur pour l'insérer dans une requête. Les emails de test sont
 * maîtrisés, mais on ne construit jamais de SQL par simple concaténation.
 */
function citer(valeur) {
  return `'${valeur.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
}

/**
 * Supprime un compte s'il existe. Sans effet s'il n'existe pas : la fonction
 * peut donc s'appeler avant ET après un test sans condition.
 */
export function supprimerUtilisateur(email) {
  requeter(`DELETE FROM user WHERE email = ${citer(email)}`)
}

/**
 * État d'un compte en base, ou `null` s'il n'existe pas.
 */
export function lireUtilisateur(email) {
  const lignes = requeter(
    `SELECT pseudo, is_verified, confirmation_token IS NOT NULL, reset_token IS NOT NULL
     FROM user WHERE email = ${citer(email)}`,
  )

  if (lignes.length === 0) return null

  const [pseudo, confirme, jetonConfirmation, jetonReinitialisation] = lignes[0]

  return {
    pseudo,
    confirme: confirme === '1',
    // On ne lit jamais les jetons eux-mêmes : un test qui court-circuiterait le
    // mail ne prouverait plus que le mail fonctionne. On vérifie seulement leur
    // présence — un jeton généré à la demande, effacé après usage.
    jetonDeConfirmation: jetonConfirmation === '1',
    jetonDeReinitialisation: jetonReinitialisation === '1',
  }
}

/**
 * Supprime UN ingrédient personnel d'un compte, désigné par son nom exact.
 *
 * Le test « enregistrer un ingrédient » vérifie qu'un ingrédient APPARAÎT dans
 * « Mes ingrédients » : s'il y était déjà (exécution précédente), le test
 * passerait sans rien prouver. On nettoie donc avant ET après.
 *
 * Volontairement ciblé sur un nom plutôt que sur tout le compte : deux
 * exécutions concurrentes du même test travaillent sur des noms différents, et
 * ne doivent pas se supprimer mutuellement leurs données.
 *
 * Sans effet si le compte ou l'ingrédient n'existe pas.
 */
export function supprimerIngredient(email, nom) {
  requeter(
    `DELETE FROM ingredient
      WHERE nom = ${citer(nom)}
        AND user_id = (SELECT id FROM user WHERE email = ${citer(email)})`,
  )
}

/**
 * Supprime UNE recette d'un compte, désignée par son nom exact.
 *
 * Même raisonnement que `supprimerIngredient` : le test « enregistrer une
 * recette » vérifie qu'une recette APPARAÎT dans « Mes recettes ». Si elle y
 * était déjà, il passerait sans rien prouver. On nettoie donc avant ET après, et
 * on cible un nom plutôt que tout le compte, pour ne pas effacer les données
 * d'une exécution concurrente.
 *
 * Sans effet si le compte ou la recette n'existe pas.
 */
export function supprimerRecette(email, nom) {
  requeter(
    `DELETE FROM recette
      WHERE nom = ${citer(nom)}
        AND user_id = (SELECT id FROM user WHERE email = ${citer(email)})`,
  )
}

/**
 * Supprime les recettes portant ce nom exact, TOUS COMPTES CONFONDUS.
 *
 * Utile là où l'on ne sait pas à quel compte une recette aurait pu être
 * rattachée : le cas non connecté ne doit rien enregistrer, mais si l'application
 * le faisait quand même, la ligne fautive rendrait toutes les exécutions
 * suivantes rouges pour de mauvaises raisons.
 */
export function supprimerRecettesParNom(nom) {
  requeter(`DELETE FROM recette WHERE nom = ${citer(nom)}`)
}

/**
 * Nombre de recettes portant ce nom exact, TOUS COMPTES CONFONDUS.
 *
 * Sert au cas non connecté : prouver qu'une recette n'a pas été enregistrée
 * demande de regarder au-delà d'un compte donné, puisqu'il n'y a justement
 * aucune session à interroger. Zéro est la seule réponse acceptable.
 */
export function compterRecettes(nom) {
  const lignes = requeter(`SELECT COUNT(*) FROM recette WHERE nom = ${citer(nom)}`)

  return Number.parseInt(lignes[0][0], 10)
}

/**
 * Remet un compte dans son état de départ : mot de passe initial, email
 * confirmé, aucune demande de réinitialisation en cours.
 *
 * Le parcours « mot de passe oublié » modifie réellement le compte : sans cette
 * remise à zéro, le test ne passerait qu'une fois. On l'appelle avant ET après
 * le test — avant aussi, car une exécution interrompue a pu laisser le compte
 * avec le nouveau mot de passe.
 *
 * Sans effet si le compte n'existe pas (base non amorcée) : c'est le test qui
 * signale alors la précondition manquante, avec un message explicite.
 */
export function restaurerMotDePasse(email, motDePasseHache) {
  requeter(
    `UPDATE user
        SET password = ${citer(motDePasseHache)},
            is_verified = 1,
            reset_token = NULL,
            reset_expires_at = NULL
      WHERE email = ${citer(email)}`,
  )
}

/**
 * Le vrai code d'autorisation du site (site privé).
 *
 * C'est un secret : il n'est pas écrit dans les fixtures versionnées. On le
 * récupère là où il vit réellement — la variable d'environnement du test, sinon
 * `backend/.env.local`. Renvoie `null` si aucune source n'est disponible : les
 * tests qui en dépendent se marquent alors « ignoré » plutôt que d'échouer sur
 * un faux problème (utile en CI, où le fichier n'existe pas).
 */
export function codeInvitationValide() {
  if (process.env.E2E_CODE_INVITATION) return process.env.E2E_CODE_INVITATION

  let contenu
  try {
    contenu = readFileSync(path.join(RACINE, 'backend', '.env.local'), 'utf8')
  } catch {
    return null
  }

  const trouve = contenu.match(/^REGISTRATION_CODE\s*=\s*(.*)$/m)
  if (!trouve) return null

  // Retire les guillemets éventuels autour de la valeur (REGISTRATION_CODE="x").
  const valeur = trouve[1].trim().replace(/^(['"])(.*)\1$/, '$2')

  return valeur.length > 0 ? valeur : null
}
