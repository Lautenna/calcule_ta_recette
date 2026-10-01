import { test, expect } from '@playwright/test'
import { ConnexionPage } from '../../../pages/ConnexionPage'
import { MotDePasseOubliePage } from '../../../pages/MotDePasseOubliePage'
import { NouveauMotDePassePage } from '../../../pages/NouveauMotDePassePage'
import { ProfilPage } from '../../../pages/ProfilPage'
import { Navbar } from '../../../pages/Navbar'
import { utilisateurMotDePasseOublie } from '../../../fixtures/utilisateurs'
import { lireUtilisateur, restaurerMotDePasse } from '../../../fixtures/backend'
import { attendreEmail, lienDuMail, viderBoiteMail } from '../../../fixtures/boiteMail'

/**
 * Suite : Authentification — Mot de passe oublié
 *
 * Particularité de ce parcours : il ne se déroule pas entièrement dans
 * l'application. L'utilisateur demande un lien, QUITTE le site, ouvre sa boîte
 * mail, puis revient par le lien reçu. Le test suit exactement ce chemin — il
 * lit le mail réellement envoyé et clique sur le lien qu'il contient — au lieu
 * de lire le jeton en base. C'est la seule façon de prouver que l'utilisateur
 * peut vraiment récupérer son compte : un mail non envoyé, ou porteur d'un lien
 * mal formé, resterait invisible autrement.
 *
 * Le courrier est capté par un collecteur SMTP local (fixtures/collecteurSmtp.js),
 * démarré avant la campagne : rien ne part sur Internet.
 *
 * Prérequis JDD : le compte `utilisateurMotDePasseOublie` doit exister en base,
 * email confirmé (`npm run seed`).
 */
test.describe('Authentification — Mot de passe oublié', () => {
  const compte = utilisateurMotDePasseOublie

  /**
   * Ce test modifie réellement le mot de passe du compte : sans remise à l'état
   * initial, il ne passerait qu'une seule fois. On restaure APRÈS (nettoyage) et
   * AVANT (une exécution interrompue a pu laisser le nouveau mot de passe en
   * place, ou une demande de réinitialisation en cours).
   */
  test.beforeEach(() => {
    restaurerMotDePasse(compte.email, compte.motDePasseHache)
    // Un mail resté d'une exécution précédente porterait un jeton périmé : le
    // test le prendrait pour le sien et échouerait sans raison valable.
    viderBoiteMail(compte.email)
  })

  test.afterEach(() => {
    restaurerMotDePasse(compte.email, compte.motDePasseHache)
  })

  test('TC_AUTH_010_MotDePasse_oublié_réinitialisation_par_mail', async ({ page }) => {
    // Le parcours complet enchaîne cinq écrans, deux connexions et l'attente
    // d'un mail réellement acheminé (envoi asynchrone, via la file Messenger) :
    // il lui faut plus que le délai par défaut.
    test.slow()

    const connexion = new ConnexionPage(page)
    const motDePasseOublie = new MotDePasseOubliePage(page)
    const nouveauMotDePasse = new NouveauMotDePassePage(page)
    const profil = new ProfilPage(page)
    const navbar = new Navbar(page)

    /** Le lien de réinitialisation, tel qu'extrait du mail reçu. */
    let lienRecu = ''

    await test.step("Étant donné un compte existant, sans demande de réinitialisation en cours", async () => {
      const etatInitial = lireUtilisateur(compte.email)

      expect(
        etatInitial,
        `Le compte de test ${compte.email} est absent de la base : lancer « npm run seed ».`,
      ).not.toBeNull()
      expect(etatInitial?.confirme, "l'email du compte doit être confirmé").toBe(true)
      expect(
        etatInitial?.jetonDeReinitialisation,
        'aucun jeton ne doit préexister, sinon le test pourrait valider un ancien lien',
      ).toBe(false)
    })

    await test.step("Quand l'utilisateur, ne retrouvant plus son mot de passe, suit « Mot de passe oublié ? »", async () => {
      await connexion.aller()
      await connexion.champEmail.fill(compte.email)
      await connexion.lienMotDePasseOublie.click()

      await expect(page).toHaveURL('/forgot-password')
      await expect(motDePasseOublie.titre).toBeVisible()
      // Confort de saisie : l'email tapé en connexion suit l'utilisateur, il n'a
      // pas à le retaper au moment où il est déjà en difficulté.
      await expect(motDePasseOublie.champEmail).toHaveValue(compte.email)
    })

    await test.step('Et demande un lien de réinitialisation', async () => {
      const reponse = page.waitForResponse(
        (r) => r.request().method() === 'POST' && r.url().includes('/api/forgot-password'),
      )

      await motDePasseOublie.demanderLien(compte.email)
      expect((await reponse).status(), 'le serveur doit accepter la demande (200)').toBe(200)
    })

    await test.step("Alors l'application accuse réception de la demande", async () => {
      await expect(motDePasseOublie.titreVerifierEmail).toBeVisible()
      // L'adresse est rappelée : c'est là que l'utilisateur doit aller chercher
      // son lien, et une faute de frappe se voit à ce moment-là.
      await expect(motDePasseOublie.emailDestinataire).toHaveText(compte.email)
      await expect(motDePasseOublie.messageErreur).toBeHidden()
    })

    await test.step("Et il reçoit par mail un lien de réinitialisation à son adresse", async () => {
      const mail = await attendreEmail(compte.email)

      expect(mail.pour, 'le mail doit être adressé au seul demandeur').toEqual([compte.email])
      expect(mail.sujet).toContain('Réinitialise ton mot de passe')
      expect(mail.texte, "le mail doit s'adresser à l'utilisateur par son pseudo")
        .toContain(compte.pseudo)

      // Le lien est le cœur du mail : sans lui, l'utilisateur reste bloqué.
      lienRecu = lienDuMail(mail, /\/reset-password\?token=/)
      expect(lienRecu, 'le lien doit pointer vers le frontend').toContain('http://localhost:5173')

      // Contrôle en base : le jeton attendu par ce lien a bien été généré.
      // On ne lit jamais sa valeur — le test doit dépendre du mail, pas de la base.
      expect(lireUtilisateur(compte.email)?.jetonDeReinitialisation).toBe(true)
    })

    await test.step('Quand il ouvre ce lien et choisit un nouveau mot de passe', async () => {
      await nouveauMotDePasse.ouvrir(lienRecu)
      await expect(nouveauMotDePasse.titre).toBeVisible()
      await expect(
        nouveauMotDePasse.messageErreur,
        'le lien reçu doit être accepté sans erreur',
      ).toBeHidden()

      await nouveauMotDePasse.choisirMotDePasse(compte.nouveauMotDePasse)
    })

    await test.step("Alors l'application confirme la mise à jour", async () => {
      await expect(nouveauMotDePasse.titreSucces).toBeVisible()
      await expect(nouveauMotDePasse.messageErreur).toBeHidden()
      await expect(nouveauMotDePasse.lienSeConnecter).toBeVisible()
    })

    await test.step('Et il peut se connecter avec son nouveau mot de passe', async () => {
      // La vraie preuve que la réinitialisation a fonctionné : l'utilisateur
      // récupère l'accès à son compte.
      await nouveauMotDePasse.lienSeConnecter.click()
      await expect(connexion.titre).toBeVisible()

      await connexion.seConnecter(compte.email, compte.nouveauMotDePasse)

      await expect(page).toHaveURL('/profil')
      await expect(profil.titre).toHaveText(compte.pseudo)
      await expect(navbar.pseudo(compte.pseudo)).toBeVisible()

      const jeton = await page.evaluate(() => localStorage.getItem('auth_token'))
      expect(jeton ?? '', 'une session doit être ouverte (JWT stocké)')
        .toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/)
    })

    await test.step("Et l'ancien mot de passe ne fonctionne plus", async () => {
      // Sans ce contrôle, le test passerait aussi si le serveur avait ajouté un
      // second mot de passe valide au lieu de remplacer l'ancien.
      await page.evaluate(() => localStorage.clear())
      await connexion.aller()
      await connexion.seConnecter(compte.email, compte.motDePasse)

      await expect(connexion.messageErreur).toBeVisible()
      await expect(page).toHaveURL('/login')
      expect(await page.evaluate(() => localStorage.getItem('auth_token'))).toBeNull()
    })

    await test.step("Et le lien reçu par mail ne peut pas servir une seconde fois", async () => {
      // Un lien de réinitialisation qui resterait valable serait un vrai risque :
      // il traîne dans une boîte mail, souvent consultée depuis plusieurs
      // appareils. Il doit être consommé par son premier usage.
      expect(
        lireUtilisateur(compte.email)?.jetonDeReinitialisation,
        'le jeton doit être effacé après usage',
      ).toBe(false)

      await nouveauMotDePasse.ouvrir(lienRecu)
      await nouveauMotDePasse.choisirMotDePasse('EncoreUnAutre999!')

      await expect(nouveauMotDePasse.messageErreur).toContainText('déjà été utilisé')
      await expect(nouveauMotDePasse.titreSucces).toBeHidden()
      await expect(nouveauMotDePasse.lienDemanderNouveauLien).toBeVisible()
    })
  })
})
