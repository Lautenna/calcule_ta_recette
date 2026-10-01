import { test, expect } from '@playwright/test'
import { ProfilPage } from '../../../pages/ProfilPage'
import { Navbar } from '../../../pages/Navbar'
import { ConnexionPage } from '../../../pages/ConnexionPage'
import {
  utilisateurValide,
  utilisateurEmailInconnu,
  utilisateurMotDePasseIncorrect,
} from '../../../fixtures/utilisateurs'

/**
 * Suite : Authentification — Connexion
 *
 * Prérequis JDD : le compte `utilisateurValide` doit exister en base avec son
 * email confirmé, et `utilisateurEmailInconnu` ne doit PAS exister
 * (`npm run seed` garantit les deux).
 */
test.describe('Authentification — Connexion', () => {
  test('TC_AUTH_001_connexion_identifiants_valides', async ({ page }) => {
    const connexion = new ConnexionPage(page)
    const profil = new ProfilPage(page)
    const navbar = new Navbar(page)

    await test.step('Étant donné un visiteur non connecté sur la page de connexion', async () => {
      await connexion.aller()
      await expect(navbar.boutonConnexion).toBeVisible()
    })

    await test.step('Quand il saisit des identifiants valides et soumet le formulaire', async () => {
      await connexion.seConnecter(utilisateurValide.email, utilisateurValide.motDePasse)
    })

    await test.step('Alors il est redirigé vers son espace personnel', async () => {
      await expect(page).toHaveURL('/profil')
      await expect(profil.titre).toHaveText(utilisateurValide.pseudo)
    })

    await test.step('Et la barre de navigation reflète la session ouverte', async () => {
      await expect(navbar.pseudo(utilisateurValide.pseudo)).toBeVisible()
      await expect(navbar.boutonConnexion).toBeHidden()
    })

    await test.step('Et un jeton JWT valide est conservé par le navigateur', async () => {
      // Contrôle technique complémentaire : l'affichage peut être correct alors
      // que la session n'est pas réellement persistée. On vérifie donc aussi le
      // jeton stocké par le front (clé `auth_token`, cf. frontend/src/api/client.js).
      const jeton = await page.evaluate(() => localStorage.getItem('auth_token'))
      expect(jeton ?? '', 'un JWT (3 segments séparés par des points) doit être stocké')
        .toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/)
    })

    await test.step('Et la session survit à un rechargement de page', async () => {
      await page.reload()
      await expect(page).toHaveURL('/profil')
      await expect(profil.titre).toHaveText(utilisateurValide.pseudo)
    })
  })

  /**
   * Les deux cas d'échec ci-dessous se vérifient exactement de la même façon :
   * la seule différence est l'identifiant erroné. On factorise donc les
   * assertions ici, pour que CO-02 et CO-03 restent lisibles et qu'un
   * changement de comportement ne se corrige qu'à un seul endroit.
   */
  async function verifierConnexionRefusee(page, identifiants) {
    const connexion = new ConnexionPage(page)
    const profil = new ProfilPage(page)
    const navbar = new Navbar(page)

    await test.step('Étant donné un visiteur non connecté sur la page de connexion', async () => {
      await connexion.aller()
      await expect(navbar.boutonConnexion).toBeVisible()
    })

    await test.step('Quand il soumet ces identifiants', async () => {
      await connexion.seConnecter(identifiants.email, identifiants.motDePasse)
    })

    await test.step("Alors il reste sur la page de connexion, avec un message d'erreur", async () => {
      await expect(connexion.messageErreur).toBeVisible()
      // Le libellé exact vient du backend (Symfony/Lexik) : on vérifie qu'un
      // message est bien restitué à l'utilisateur, sans figer sa formulation.
      await expect(connexion.messageErreur).not.toBeEmpty()
      await expect(page).toHaveURL('/login')
    })

    await test.step('Et aucune session n\'est ouverte', async () => {
      await expect(navbar.boutonConnexion).toBeVisible()
      await expect(navbar.pseudo(utilisateurValide.pseudo)).toBeHidden()

      // Contrôle technique : un échec d'authentification ne doit laisser aucun
      // jeton derrière lui, sinon la session paraîtrait ouverte au rechargement.
      const jeton = await page.evaluate(() => localStorage.getItem('auth_token'))
      expect(jeton, 'aucun JWT ne doit être stocké après un échec').toBeNull()
    })

    await test.step('Et l\'accès direct au profil par l\'URL est refusé', async () => {
      // Le vrai enjeu du test : contourner le formulaire ne doit rien donner.
      // <PrivateRoute> renvoie le visiteur vers /login.
      await profil.aller()
      await expect(page).toHaveURL('/login')
      await expect(connexion.titre).toBeVisible()
      await expect(profil.boutonParametres).toBeHidden()
    })
  }

  test('TC_AUTH_002_connexion_mot_de_passe_incorrect', async ({ page }) => {
    await verifierConnexionRefusee(page, utilisateurMotDePasseIncorrect)
  })

  test('TC_AUTH_011_un email inconnu refuse la connexion et l\'accès au profil', async ({ page }) => {
    await verifierConnexionRefusee(page, utilisateurEmailInconnu)
  })

  test('TC_AUTH_012_le message d\'erreur ne révèle pas si le compte existe', async ({ page }) => {
    // Un message différent selon que l'email existe ou non permettrait à un
    // attaquant d'énumérer les comptes du site. Les deux cas doivent donc
    // renvoyer exactement le même texte.
    const connexion = new ConnexionPage(page)

    const messageApresEchec = async (identifiants) => {
      await connexion.aller()
      await connexion.seConnecter(identifiants.email, identifiants.motDePasse)
      await expect(connexion.messageErreur).toBeVisible()
      return (await connexion.messageErreur.innerText()).trim()
    }

    const messageMotDePasseIncorrect = await messageApresEchec(utilisateurMotDePasseIncorrect)
    const messageEmailInconnu = await messageApresEchec(utilisateurEmailInconnu)

    expect(
      messageEmailInconnu,
      "le message d'un email inconnu doit être identique à celui d'un mot de passe erroné",
    ).toBe(messageMotDePasseIncorrect)
  })
})
