import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import path from 'node:path'
import { DOSSIER_BOITE_MAIL } from './collecteurSmtp'

/**
 * Lecture de la boîte mail de test — côté tests.
 *
 * Le collecteur SMTP (collecteurSmtp.js) dépose les messages reçus en `.eml`.
 * Ce module les relit comme le ferait un utilisateur ouvrant son courrier :
 * destinataire, objet, corps, liens cliquables.
 *
 * Un message électronique n'est pas du texte brut : l'objet accentué est encodé
 * (`=?UTF-8?Q?...?=`), le corps est découpé en parties (texte + HTML) et encodé
 * en quoted-printable, ce qui coupe les longues URL en plein milieu. D'où le
 * décodage ci-dessous : sans lui, le lien de réinitialisation extrait du mail
 * serait tronqué et le test échouerait pour une mauvaise raison.
 */

/** Les `.eml` présents, du plus ancien au plus récent. */
function fichiersRecus() {
  if (!existsSync(DOSSIER_BOITE_MAIL)) return []

  return readdirSync(DOSSIER_BOITE_MAIL)
    .filter((nom) => nom.endsWith('.eml'))
    .sort()
    .map((nom) => path.join(DOSSIER_BOITE_MAIL, nom))
}

/**
 * Messages présents dans la boîte, éventuellement filtrés par destinataire.
 */
export function lireEmails(destinataire) {
  const emails = fichiersRecus().map(analyser)

  if (!destinataire) return emails

  return emails.filter((email) => email.pour.includes(destinataire.toLowerCase()))
}

/**
 * Vide la boîte (ou seulement le courrier d'un destinataire).
 *
 * À appeler avant de déclencher un envoi : sans cela, un test pourrait lire le
 * mail d'une exécution précédente — donc un lien périmé — et conclure à tort.
 */
export function viderBoiteMail(destinataire) {
  for (const fichier of fichiersRecus()) {
    if (destinataire && !analyser(fichier).pour.includes(destinataire.toLowerCase())) continue
    rmSync(fichier, { force: true })
  }
}

/**
 * Attend l'arrivée d'un mail pour un destinataire et le renvoie.
 *
 * L'application met le mail en file d'attente (Messenger) et répond
 * immédiatement : l'envoi réel se fait quelques instants plus tard, en tâche de
 * fond. On scrute donc la boîte au lieu de supposer une durée.
 */
export async function attendreEmail(destinataire, { delai = 20_000, intervalle = 250 } = {}) {
  const echeance = Date.now() + delai

  do {
    const [email] = lireEmails(destinataire)
    if (email) return email

    await new Promise((suite) => setTimeout(suite, intervalle))
  } while (Date.now() < echeance)

  throw new Error(
    `Aucun email reçu pour ${destinataire} après ${delai / 1000} s.\n`
    + 'Causes possibles :\n'
    + "  — un backend tournait déjà (make start-back) : Playwright l'a réutilisé tel quel, "
    + "avec le MAILER_DSN de backend/.env.local. Arrêter ce serveur pour laisser Playwright "
    + "le démarrer, ou le relancer avec MAILER_DSN pointant sur le collecteur de test ;\n"
    + '  — le worker Messenger ne tourne pas : les mails partent en file d\'attente '
    + '(php bin/console messenger:consume async).',
  )
}

/**
 * Premier lien du message correspondant au motif attendu.
 */
export function lienDuMail(email, motif) {
  const lien = email.liens.find((candidat) => motif.test(candidat))

  if (!lien) {
    throw new Error(
      `Aucun lien correspondant à ${motif} dans l'email « ${email.sujet} » (${email.fichier}).\n`
      + `Liens présents : ${email.liens.join(', ') || 'aucun'}`,
    )
  }

  return lien
}

/**
 * Analyse un `.eml`.
 *
 * Lu en latin1 (un octet = un caractère) : le vrai jeu de caractères dépend de
 * l'encodage déclaré par chaque partie du message, appliqué ensuite par
 * `decoderPartie`. Lire directement en UTF-8 abîmerait les parties encodées.
 */
function analyser(fichier) {
  const { entetes, corps } = separerEntetes(readFileSync(fichier, 'latin1'))
  const parties = extraireParties(entetes, corps)

  const contenuDe = (type) => parties
    .filter((partie) => partie.type.startsWith(type))
    .map((partie) => partie.contenu)
    .join('\n')

  const texte = contenuDe('text/plain')
  const html = contenuDe('text/html')

  return {
    fichier,
    de: adresses(entetes.get('from') ?? '')[0] ?? '',
    pour: adresses(entetes.get('to') ?? ''),
    sujet: decoderMotsEncodes(entetes.get('subject') ?? ''),
    texte,
    html,
    liens: extraireLiens(`${texte}\n${html}`),
  }
}

/**
 * Sépare la zone d'en-têtes du corps (première ligne vide).
 */
function separerEntetes(brut) {
  const separation = brut.search(/\r?\n\r?\n/)
  const zoneEntetes = separation === -1 ? brut : brut.slice(0, separation)
  const corps = separation === -1 ? '' : brut.slice(separation).replace(/^\r?\n\r?\n/, '')

  const entetes = new Map()

  // Un en-tête long est « replié » sur plusieurs lignes, les suivantes étant
  // indentées : on les recolle avant de découper.
  for (const ligne of zoneEntetes.replace(/\r?\n[ \t]+/g, ' ').split(/\r?\n/)) {
    const separateur = ligne.indexOf(':')
    if (separateur === -1) continue

    entetes.set(ligne.slice(0, separateur).trim().toLowerCase(), ligne.slice(separateur + 1).trim())
  }

  return { entetes, corps }
}

/**
 * Aplatit le message en une liste de parties décodées (`multipart` compris,
 * y compris imbriqués).
 */
function extraireParties(entetes, corps) {
  const typeContenu = entetes.get('content-type') ?? 'text/plain'
  const frontiere = typeContenu.match(/boundary="?([^";]+)"?/i)?.[1]

  if (!frontiere) {
    return [{
      type: typeContenu.split(';')[0].trim().toLowerCase(),
      contenu: decoderPartie(corps, entetes),
    }]
  }

  const parties = []

  // Le premier morceau précède la frontière initiale (préambule) : on l'ignore.
  for (const morceau of corps.split(`--${frontiere}`).slice(1)) {
    if (morceau.startsWith('--')) break // frontière de fin

    const sousPartie = separerEntetes(morceau.replace(/^\r?\n/, ''))
    parties.push(...extraireParties(sousPartie.entetes, sousPartie.corps))
  }

  return parties
}

/**
 * Décode une partie selon son `Content-Transfer-Encoding`.
 */
function decoderPartie(contenu, entetes) {
  switch ((entetes.get('content-transfer-encoding') ?? '8bit').toLowerCase()) {
    case 'quoted-printable':
      return decoderQuotedPrintable(contenu)
    case 'base64':
      return Buffer.from(contenu.replace(/\s+/g, ''), 'base64').toString('utf8')
    default:
      return Buffer.from(contenu, 'latin1').toString('utf8')
  }
}

/**
 * Décodage quoted-printable : `=\r\n` est un saut de ligne « souple » ajouté
 * pour tenir dans 76 colonnes (c'est lui qui coupe les URL), et `=XX` un octet
 * en hexadécimal. On reconstitue les octets avant de les interpréter en UTF-8.
 */
function decoderQuotedPrintable(texte) {
  const sansSautsSouples = texte.replace(/=\r?\n/g, '')
  const octets = []

  for (let i = 0; i < sansSautsSouples.length; i += 1) {
    const hexa = sansSautsSouples.slice(i + 1, i + 3)

    if (sansSautsSouples[i] === '=' && /^[0-9A-Fa-f]{2}$/.test(hexa)) {
      octets.push(parseInt(hexa, 16))
      i += 2
      continue
    }

    octets.push(sansSautsSouples.charCodeAt(i) & 0xff)
  }

  return Buffer.from(octets).toString('utf8')
}

/**
 * Décode les « mots encodés » des en-têtes : un objet accentué voyage sous la
 * forme `=?UTF-8?Q?R=C3=A9initialise?=`.
 */
function decoderMotsEncodes(valeur) {
  return valeur
    // Deux mots encodés consécutifs sont séparés par une espace qui ne fait pas
    // partie du texte : on la retire avant de décoder.
    .replace(/\?=\s+=\?/g, '?==?')
    .replace(/=\?[^?]+\?([BbQq])\?([^?]*)\?=/g, (_, type, donnees) => (
      type.toUpperCase() === 'B'
        ? Buffer.from(donnees, 'base64').toString('utf8')
        : decoderQuotedPrintable(donnees.replace(/_/g, ' '))
    ))
}

/**
 * Adresses email contenues dans un en-tête (`Pseudo <a@b.c>` ou `a@b.c`).
 */
function adresses(entete) {
  const trouvees = decoderMotsEncodes(entete).match(/[^\s<>@,;:"]+@[\w.-]+/g) ?? []

  return trouvees.map((adresse) => adresse.toLowerCase())
}

/**
 * URL présentes dans le message, sans doublon (le même lien figure en général
 * dans la partie texte ET dans la partie HTML).
 */
function extraireLiens(contenu) {
  const trouves = contenu.match(/https?:\/\/[^\s"'<>]+/g) ?? []

  return [...new Set(trouves)]
}
