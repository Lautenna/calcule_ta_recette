import { motifEan13 } from './codeBarres'

/**
 * CAMÉRA FACTICE — pour tester le scan d'un code-barres sans caméra physique.
 *
 * Le scanner de l'application (composant BarcodeScanner) fait deux choses :
 *   1. il demande au navigateur la liste des caméras, puis un flux vidéo ;
 *   2. il analyse ce flux image par image pour y reconnaître un code-barres.
 *
 * On ne remplace donc QUE la caméra : le navigateur reçoit un vrai flux vidéo,
 * qui filme un vrai code-barres EAN-13 (dessiné à la volée, cf. `motifEan13`).
 * L'application, elle, tourne telle quelle — c'est bien son décodeur qui lit le
 * code, et le test prouve la chaîne complète : caméra → décodage → appel de
 * l'API → remplissage du formulaire.
 *
 * L'alternative — simuler la détection en appelant directement le code de
 * l'application — ne prouverait rien du scan lui-même.
 */

/** Résolution du flux vidéo factice, comparable à celle d'une webcam. */
const LARGEUR = 640
const HAUTEUR = 480

/** Largeur d'un module (la plus fine barre) : 95 modules → code de 380 px. */
const ECHELLE = 4

/** Hauteur des barres, en pixels. */
const HAUTEUR_BARRES = 220

/** Images par seconde diffusées par la caméra factice. */
const IMAGES_PAR_SECONDE = 10

/**
 * Installe la caméra factice dans le navigateur.
 *
 * À appeler AVANT toute navigation : le remplacement est injecté au démarrage de
 * chaque page, avant le code de l'application.
 */
export async function installerCameraFactice(page, codeBarres) {
  // Le motif est calculé côté Node : une erreur de JDD est ainsi signalée tout
  // de suite, avec une pile d'appels lisible, et non au fond du navigateur.
  const modules = motifEan13(codeBarres)

  await page.addInitScript(
    ({ modules, largeur, hauteur, echelle, hauteurBarres, imagesParSeconde }) => {
      /**
       * Dessine le code-barres sur un canvas et en diffuse le contenu sous forme
       * de flux vidéo, exactement comme le ferait une caméra.
       */
      const filmerLeCodeBarres = () => {
        const canvas = document.createElement('canvas')
        canvas.width = largeur
        canvas.height = hauteur

        const contexte = canvas.getContext('2d')
        if (!contexte) throw new Error('Caméra factice : impossible de dessiner le code-barres.')

        const x = (largeur - modules.length * echelle) / 2
        const y = (hauteur - hauteurBarres) / 2

        const dessiner = () => {
          // Le fond blanc fait aussi office de zone de silence : sans marge
          // claire de part et d'autre, aucun lecteur ne sait où le code commence.
          contexte.fillStyle = '#ffffff'
          contexte.fillRect(0, 0, largeur, hauteur)

          contexte.fillStyle = '#000000'
          modules.forEach((module, rang) => {
            if (module) contexte.fillRect(x + rang * echelle, y, echelle, hauteurBarres)
          })
        }

        dessiner()
        // Un canvas qui ne change plus peut cesser d'alimenter le flux : on le
        // redessine en continu pour que la caméra « filme » vraiment.
        setInterval(dessiner, Math.round(1000 / imagesParSeconde))

        return canvas.captureStream(imagesParSeconde)
      }

      const cameraFactice = {
        deviceId: 'camera-factice-e2e',
        groupId: 'groupe-camera-factice-e2e',
        kind: 'videoinput',
        label: 'Caméra factice (tests E2E)',
        toJSON() {
          return { ...this }
        },
      }

      const appareilsFactices = {
        enumerateDevices: async () => [cameraFactice],
        // Un flux neuf à chaque demande : l'application arrête le précédent en
        // fermant le scanner, et un flux arrêté ne redémarre pas.
        getUserMedia: async () => filmerLeCodeBarres(),
        getSupportedConstraints: () => ({ deviceId: true, facingMode: true }),
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }

      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        get: () => appareilsFactices,
      })
    },
    {
      modules,
      largeur: LARGEUR,
      hauteur: HAUTEUR,
      echelle: ECHELLE,
      hauteurBarres: HAUTEUR_BARRES,
      imagesParSeconde: IMAGES_PAR_SECONDE,
    },
  )
}
