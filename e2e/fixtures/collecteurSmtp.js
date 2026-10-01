import net from 'node:net'
import { mkdirSync, renameSync, writeFileSync } from 'node:fs'
import path from 'node:path'

/**
 * Collecteur SMTP de test — la « boîte mail » de l'environnement de test.
 *
 * POURQUOI : certains parcours ne se terminent PAS dans l'application (mot de
 * passe oublié, confirmation d'inscription). L'utilisateur doit aller chercher
 * un lien dans sa boîte mail. Un test qui sauterait cette étape — en lisant le
 * jeton en base, par exemple — validerait la moitié du parcours seulement : le
 * mail pourrait ne jamais partir, ou contenir un lien cassé, sans qu'aucun test
 * ne s'en aperçoive.
 *
 * COMMENT : ce module ouvre un vrai serveur SMTP minimal (en réception seule)
 * sur 127.0.0.1. Le backend y envoie ses mails comme à n'importe quel serveur
 * d'envoi ; chaque message reçu est déposé sur le disque en `.eml`, où les
 * tests viennent le lire (voir boiteMail.js).
 *
 * Deux bénéfices : aucun mail ne quitte la machine pendant les tests, et les
 * messages restent consultables après coup (ouvrir un `.eml` dans un client
 * mail) pour analyser une anomalie.
 *
 * Il est démarré une fois pour toute la campagne, avant les tests
 * (voir global-setup.js), et arrêté à la fin.
 */

/** Dossier où les messages reçus sont déposés (ignoré par git). */
export const DOSSIER_BOITE_MAIL = path.join(__dirname, '..', '.mails')

/**
 * Adresse d'écoute. Surchargeable si le port 1025 est déjà pris sur la machine
 * (un Mailpit / MailHog local, par exemple) :
 *   E2E_SMTP_PORT=1125 npx playwright test
 */
export const ADRESSE_COLLECTEUR = {
  hote: process.env.E2E_SMTP_HOTE ?? '127.0.0.1',
  port: Number(process.env.E2E_SMTP_PORT ?? 1025),
}

/** DSN à donner au backend (MAILER_DSN) pour qu'il écrive dans cette boîte. */
export const DSN_COLLECTEUR = `smtp://${ADRESSE_COLLECTEUR.hote}:${ADRESSE_COLLECTEUR.port}`

/** Nom d'hôte annoncé dans le dialogue SMTP — visible dans les traces. */
const NOM_SERVEUR = 'collecteur-e2e'

/**
 * Démarre le collecteur et attend qu'il soit réellement en écoute.
 */
export function demarrerCollecteur() {
  mkdirSync(DOSSIER_BOITE_MAIL, { recursive: true })

  let recus = 0

  /**
   * Connexions en cours. Le client SMTP (le worker Messenger du backend) garde
   * sa connexion ouverte entre deux envois : sans les fermer nous-mêmes à
   * l'arrêt, `serveur.close()` attendrait indéfiniment leur fin et Playwright
   * ne rendrait jamais la main.
   */
  const connexions = new Set()

  const serveur = net.createServer((socket) => {
    connexions.add(socket)
    socket.on('close', () => connexions.delete(socket))

    // Une connexion oubliée ne doit pas, à elle seule, maintenir le processus
    // en vie à la fin de la campagne.
    socket.unref()

    /** Ce qui reste à traiter du flux, jusqu'au prochain saut de ligne. */
    let tampon = ''
    /** Vrai entre `DATA` et la ligne « . » qui clôt le message. */
    let enDonnees = false
    let message = ''

    const repondre = (ligne) => socket.write(`${ligne}\r\n`)

    // Un client SMTP qui raccroche brutalement ne doit pas faire tomber le
    // processus Playwright : on absorbe l'erreur réseau.
    socket.on('error', () => socket.destroy())
    socket.setEncoding('latin1')

    repondre(`220 ${NOM_SERVEUR} ESMTP prêt`)

    socket.on('data', (morceau) => {
      tampon += morceau

      let fin
      while ((fin = tampon.indexOf('\r\n')) !== -1) {
        const ligne = tampon.slice(0, fin)
        tampon = tampon.slice(fin + 2)
        traiter(ligne)
      }
    })

    function traiter(ligne) {
      if (enDonnees) {
        if (ligne === '.') {
          enDonnees = false
          recus += 1
          deposer(message, recus)
          message = ''
          repondre('250 2.0.0 Message accepté')
          return
        }

        // « Dot stuffing » : un point en début de ligne est doublé par
        // l'expéditeur, il faut le rétablir.
        message += `${ligne.startsWith('..') ? ligne.slice(1) : ligne}\r\n`
        return
      }

      // Les commandes SMTP tiennent en 4 lettres (MAIL FROM, RCPT TO, DATA…).
      switch (ligne.slice(0, 4).toUpperCase()) {
        case 'EHLO':
          // Capacités annoncées, volontairement minimales : ni STARTTLS ni AUTH,
          // pour que le client envoie en clair sans négociation.
          repondre(`250-${NOM_SERVEUR}`)
          repondre('250-8BITMIME')
          repondre('250 SIZE 20971520')
          return
        case 'HELO':
          repondre(`250 ${NOM_SERVEUR}`)
          return
        case 'MAIL':
        case 'RCPT':
          repondre('250 2.1.0 OK')
          return
        case 'DATA':
          enDonnees = true
          repondre('354 Envoyer le message, terminé par <CRLF>.<CRLF>')
          return
        case 'RSET':
          message = ''
          repondre('250 2.0.0 OK')
          return
        case 'NOOP':
          repondre('250 2.0.0 OK')
          return
        case 'QUIT':
          repondre(`221 2.0.0 ${NOM_SERVEUR} au revoir`)
          socket.end()
          return
        default:
          // STARTTLS, AUTH, VRFY… : refus explicite plutôt que silence, sinon le
          // client attendrait une réponse jusqu'à expiration de son délai.
          repondre('502 5.5.1 Commande non gérée par le collecteur de test')
      }
    }
  })

  return new Promise((resoudre, rejeter) => {
    serveur.on('error', (erreur) => {
      rejeter(
        new Error(
          `Impossible de démarrer le collecteur SMTP sur ${ADRESSE_COLLECTEUR.hote}:${ADRESSE_COLLECTEUR.port} `
          + `(${erreur.message}).\nSi le port est déjà utilisé : E2E_SMTP_PORT=1125 npx playwright test`,
        ),
      )
    })

    serveur.listen(ADRESSE_COLLECTEUR.port, ADRESSE_COLLECTEUR.hote, () => {
      // Idem : le serveur en écoute ne doit pas empêcher le processus de sortir.
      serveur.unref()

      resoudre({
        arreter: () => new Promise((fini) => {
          serveur.close(() => fini())
          // Après `close()`, le serveur n'accepte plus rien mais attend la fin
          // des connexions déjà ouvertes : on les coupe pour qu'il se termine.
          for (const connexion of connexions) connexion.destroy()
          connexions.clear()
        }),
      })
    })
  })
}

/**
 * Dépose un message reçu dans la boîte.
 *
 * Écriture sous nom temporaire puis renommage : un test qui lit le dossier au
 * même instant ne peut jamais tomber sur un fichier à moitié écrit.
 */
function deposer(message, numero) {
  const nom = String(numero).padStart(3, '0')
  const partiel = path.join(DOSSIER_BOITE_MAIL, `${nom}.partiel`)

  writeFileSync(partiel, message, 'latin1')
  renameSync(partiel, path.join(DOSSIER_BOITE_MAIL, `${nom}.eml`))
}
