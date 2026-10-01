import { test, expect } from '@playwright/test'
import { InscriptionPage } from '../../../pages/InscriptionPage'
import { ConnexionPage } from '../../../pages/ConnexionPage'
import { Navbar } from '../../../pages/Navbar'
import {
  inscriptionValide,
  nouveauCompte,
  codeInvitationInvalide,
  utilisateurEmailInconnu,
} from '../../../fixtures/utilisateurs'
import {
  codeInvitationValide,
  lireUtilisateur,
  supprimerUtilisateur,
} from '../../../fixtures/backend'

/**
 * Suite : Authentification — Inscription
 *
 * Trois garde-fous sont vérifiés ici, chacun à son niveau :
 *
 *  1. le CODE D'AUTORISATION (le site est privé) — contrôlé par le serveur,
 *     seul endroit où le vrai code est connu : refusé s'il est faux (TC_AUTH_003),
 *     accepté s'il est bon (TC_AUTH_004) ;
 *  2. les CHAMPS OBLIGATOIRES (email, pseudo, mot de passe) — contrôlés par le
 *     navigateur, qui doit bloquer avant tout appel réseau (TC_AUTH_006 à TC_AUTH_000) ;
 *  3. le CONFORT DE SAISIE — l'email tapé en connexion suit l'utilisateur
 *     jusqu'au formulaire d'inscription (TC_AUTH_005).
 *
 * Prérequis JDD : l'email `inscriptionValide.email` ne doit PAS exister en base
 * (`npm run seed` le supprime). Seul TC_AUTH_004 crée réellement un compte, et il le
 * supprime avant et après lui-même : la suite reste rejouable à l'infini.
 */
test.describe('Authentification — Inscription', () => {
  /**
   * Jeu de données complet, privé du champ à omettre.
   */
  function donneesSansLeChamp(champOmis) {
    const donnees = {
      email: inscriptionValide.email,
      pseudo: inscriptionValide.pseudo,
      motDePasse: inscriptionValide.motDePasse,
      confirmation: inscriptionValide.motDePasse,
      codeInvitation: inscriptionValide.codeInvitation,
    }

    delete donnees[champOmis]

    // Laisser la confirmation seule remplie ajouterait une erreur « les mots de
    // passe ne correspondent pas » : on la vide aussi, pour que le test ne
    // porte que sur l'absence du mot de passe.
    if (champOmis === 'motDePasse') delete donnees.confirmation

    return donnees
  }

  test("TC_AUTH_003_inscription_code_invitation_invalide", async ({ page }) => {
    const inscription = new InscriptionPage(page)
    const navbar = new Navbar(page)

    await test.step('Étant donné un visiteur sur le formulaire d\'inscription', async () => {
      await inscription.aller()
      await expect(navbar.boutonConnexion).toBeVisible()
    })

    await test.step("Quand il remplit tout correctement mais avec un code d'autorisation erroné", async () => {
      await inscription.remplir({
        email: inscriptionValide.email,
        pseudo: inscriptionValide.pseudo,
        motDePasse: inscriptionValide.motDePasse,
        confirmation: inscriptionValide.motDePasse,
        codeInvitation: codeInvitationInvalide,
      })
    })

    await test.step('Alors le serveur refuse la création (422 Unprocessable Entity)', async () => {
      // Le code est un secret du serveur : c'est donc bien lui — et pas le
      // navigateur — qui doit prononcer le refus. On intercepte la réponse pour
      // le prouver, un blocage purement côté client serait contournable.
      const reponse = page.waitForResponse(
        (r) => r.request().method() === 'POST' && r.url().includes('/api/users'),
      )
      await inscription.soumettre()
      expect((await reponse).status()).toBe(422)
    })

    await test.step("Et l'erreur est restituée sur le champ « Code d'autorisation »", async () => {
      const erreur = await inscription.erreurDuChamp(inscription.champCodeInvitation)
      await expect(erreur).toHaveText("Le code d'autorisation est invalide.")
      await expect(inscription.messageErreur.first()).toBeVisible()
    })

    await test.step('Et aucun compte n\'a été créé', async () => {
      // Le formulaire reste affiché : l'écran « Vérifie ta boîte mail », qui ne
      // s'affiche qu'après une inscription réussie, ne doit jamais apparaître.
      await expect(page).toHaveURL('/register')
      await expect(inscription.titreVerifierEmail).toBeHidden()
      await expect(navbar.boutonConnexion).toBeVisible()

      const jeton = await page.evaluate(() => localStorage.getItem('auth_token'))
      expect(jeton, 'une inscription refusée ne doit ouvrir aucune session').toBeNull()

      // Contrôle décisif : on resoumet le même formulaire. Si la tentative
      // précédente avait créé le compte malgré le code invalide, le serveur
      // répondrait « email déjà utilisé » au lieu de « code invalide ».
      await inscription.soumettre()
      const erreur = await inscription.erreurDuChamp(inscription.champCodeInvitation)
      await expect(erreur).toHaveText("Le code d'autorisation est invalide.")
      await expect(
        inscription.messageEmailDejaUtilise,
        "l'email ne doit pas avoir été enregistré par la tentative refusée",
      ).toBeHidden()
    })
  })

  test('TC_AUTH_006/007/008/009 un formulaire vide bloque l\'inscription et signale chaque champ obligatoire', async ({ page }) => {
    const inscription = new InscriptionPage(page)

    await inscription.aller()
    const appelsServeur = inscription.surveillerAppelsInscription()

    await test.step('Quand le visiteur soumet le formulaire sans rien saisir', async () => {
      await inscription.soumettre()
    })

    await test.step('Alors chaque champ obligatoire porte son propre message d\'erreur', async () => {
      const attendus = [
        { champ: inscription.champEmail, message: 'Email invalide' },
        { champ: inscription.champPseudo, message: 'Au moins 2 caractères' },
        { champ: inscription.champMotDePasse, message: 'Au moins 6 caractères' },
        { champ: inscription.champCodeInvitation, message: "Code d'autorisation requis" },
      ]

      for (const attendu of attendus) {
        const erreur = await inscription.erreurDuChamp(attendu.champ)
        await expect(erreur).toHaveText(attendu.message)
      }
    })

    await test.step('Et le visiteur reste sur le formulaire, sans compte créé', async () => {
      await expect(page).toHaveURL('/register')
      await expect(inscription.titreVerifierEmail).toBeHidden()
    })

    await test.step('Et le serveur n\'a jamais été sollicité', async () => {
      // Le vrai enjeu : la validation doit être bloquante, pas seulement
      // décorative. Si un POST /api/users partait, rien ne garantirait qu'un
      // compte incomplet ne finisse pas en base.
      expect(appelsServeur, 'aucun POST /api/users ne doit partir').toHaveLength(0)
    })
  })

  /**
   * Les trois champs d'identité sont obligatoires et se vérifient de la même
   * façon : on remplit tout sauf un, et le formulaire doit rester bloqué. Un
   * test paramétré évite de recopier trois fois le même scénario.
   */
  const champsObligatoires = [
    { cas: 'TC_AUTH_006', champ: 'email', libelle: 'Email', message: 'Email invalide' },
    { cas: 'IN-04', champ: 'pseudo', libelle: 'Pseudo', message: 'Au moins 2 caractères' },
    { cas: 'IN-05', champ: 'motDePasse', libelle: 'Mot de passe', message: 'Au moins 6 caractères' },
  ]

  for (const { cas, champ, libelle, message } of champsObligatoires) {
    test(`${cas} — un champ « ${libelle} » vide bloque l'inscription`, async ({ page }) => {
      const inscription = new InscriptionPage(page)
      const champVise = inscription.champ(libelle)

      await inscription.aller()
      const appelsServeur = inscription.surveillerAppelsInscription()

      await test.step(`Étant donné un formulaire entièrement rempli sauf « ${libelle} »`, async () => {
        await inscription.remplir(
          donneesSansLeChamp(champ),
        )
        await expect(champVise).toBeEmpty()
      })

      await test.step('Quand le visiteur soumet le formulaire', async () => {
        await inscription.soumettre()
      })

      await test.step(`Alors « ${libelle} » est signalé en erreur et l'inscription est refusée`, async () => {
        const erreur = await inscription.erreurDuChamp(champVise)
        await expect(erreur).toHaveText(message)

        await expect(page).toHaveURL('/register')
        await expect(inscription.titreVerifierEmail).toBeHidden()
        expect(appelsServeur, 'aucun POST /api/users ne doit partir').toHaveLength(0)
      })

      await test.step('Et les autres champs ne sont pas mis en cause', async () => {
        // Garantit que le refus vient bien du champ omis : si un autre champ
        // était aussi en erreur, le test ne prouverait plus rien sur celui-ci.
        for (const autre of [inscription.champEmail, inscription.champPseudo, inscription.champMotDePasse, inscription.champCodeInvitation]) {
          if ((await autre.inputValue()) === '') continue
          expect(
            await inscription.champSansErreur(autre),
            'seul le champ obligatoire omis doit être en erreur',
          ).toBe(true)
        }
      })
    })
  }

  /**
   * Chemin nominal : le seul scénario de la suite qui crée réellement un compte.
   *
   * Le vrai code d'autorisation n'est pas versionné (voir fixtures/backend.js) :
   * si on ne le trouve pas, le test se marque « ignoré » plutôt que d'échouer
   * pour un faux motif.
   *
   * Un test qui écrit en base doit rendre l'environnement comme il l'a trouvé,
   * sinon il ne passe qu'une fois. Le compte est donc supprimé APRÈS (nettoyage)
   * et AVANT (une exécution interrompue peut en avoir laissé un).
   *
   * Il utilise sa propre adresse (`nouveauCompte`), distincte de celle des
   * tests de refus : la suite tourne en parallèle, et un compte créé ici ne doit
   * pas changer ce que le serveur répond ailleurs.
   */
  test.describe("Chemin nominal — code d'autorisation valide", () => {
    const codeValide = codeInvitationValide()

    test.beforeEach(() => {
      if (codeValide) supprimerUtilisateur(nouveauCompte.email)
    })

    test.afterEach(() => {
      if (codeValide) supprimerUtilisateur(nouveauCompte.email)
    })

    test("TC_AUTH_004_inscription_code_invitation_valide", async ({ page }) => {
      test.skip(
        !codeValide,
        "Code d'autorisation introuvable : renseigner backend/.env.local (REGISTRATION_CODE) ou E2E_CODE_INVITATION",
      )

      const inscription = new InscriptionPage(page)
      const connexion = new ConnexionPage(page)
      const navbar = new Navbar(page)

      await test.step("Étant donné qu'aucun compte n'existe pour cet email", async () => {
        expect(lireUtilisateur(nouveauCompte.email)).toBeNull()
        await inscription.aller()
      })

      await test.step("Quand le visiteur remplit le formulaire avec le bon code d'autorisation", async () => {
        await inscription.remplir({
          email: nouveauCompte.email,
          pseudo: nouveauCompte.pseudo,
          motDePasse: nouveauCompte.motDePasse,
          confirmation: nouveauCompte.motDePasse,
          codeInvitation: codeValide,
        })

        const reponse = page.waitForResponse(
          (r) => r.request().method() === 'POST' && r.url().includes('/api/users'),
        )
        await inscription.soumettre()
        expect((await reponse).status(), 'le serveur doit créer la ressource (201)').toBe(201)
      })

      await test.step("Alors l'écran « Vérifie ta boîte mail » confirme la création", async () => {
        await expect(inscription.titreVerifierEmail).toBeVisible()
        // L'adresse est rappelée à l'utilisateur : c'est là qu'il doit aller
        // chercher son lien, une faute de frappe se voit à ce moment-là.
        await expect(page.getByText(nouveauCompte.email)).toBeVisible()
        await expect(inscription.messageErreur).toBeHidden()
      })

      await test.step("Et l'inscription n'ouvre PAS de session", async () => {
        // Un compte non confirmé ne doit donner aucun accès : l'utilisateur
        // reste un visiteur jusqu'au clic sur le lien reçu par mail.
        const jeton = await page.evaluate(() => localStorage.getItem('auth_token'))
        expect(jeton, "l'inscription ne doit pas connecter l'utilisateur").toBeNull()
        await expect(navbar.boutonConnexion).toBeVisible()
      })

      await test.step('Et le compte est bien enregistré, en attente de confirmation', async () => {
        // Contrôle en base : l'interface ne montre pas cet état, et c'est lui
        // qui conditionne tout le reste du parcours (mail, connexion).
        const compte = lireUtilisateur(nouveauCompte.email)
        expect(compte, 'le compte doit exister en base').not.toBeNull()
        expect(compte?.pseudo).toBe(nouveauCompte.pseudo)
        expect(compte?.confirme, "l'email ne doit pas être confirmé d'office").toBe(false)
        expect(compte?.jetonDeConfirmation, 'un jeton de confirmation doit être généré').toBe(true)
      })

      await test.step('Et la connexion reste refusée tant que l\'email n\'est pas confirmé', async () => {
        await connexion.aller()
        await connexion.seConnecter(nouveauCompte.email, nouveauCompte.motDePasse)

        await expect(connexion.messageErreur).toContainText('confirmée')
        await expect(page).toHaveURL('/login')
        // L'application propose la sortie de secours adaptée à cet état.
        await expect(
          page.getByRole('button', { name: "Renvoyer l'email de confirmation" }),
        ).toBeVisible()
      })
    })
  })

  test("TC_AUTH_005_inscription_sauvegarde_mail_dossier_inscription", async ({ page }) => {
    const connexion = new ConnexionPage(page)
    const inscription = new InscriptionPage(page)

    await test.step("Étant donné un visiteur qui tente de se connecter sans avoir de compte", async () => {
      await connexion.aller()
      await connexion.seConnecter(utilisateurEmailInconnu.email, utilisateurEmailInconnu.motDePasse)
      await expect(connexion.messageErreur).toBeVisible()
    })

    await test.step('Quand il choisit « Créer un compte »', async () => {
      await connexion.lienCreerCompte.click()
      await expect(inscription.titre).toBeVisible()
      await expect(page).toHaveURL('/register')
    })

    await test.step("Alors son email est déjà saisi, sans avoir à le retaper", async () => {
      await expect(inscription.champEmail).toHaveValue(utilisateurEmailInconnu.email)
      // Repris tel quel : le champ doit être utilisable en l'état, donc sans
      // message d'erreur affiché d'entrée de jeu.
      expect(
        await inscription.champSansErreur(inscription.champEmail),
        "l'email repris ne doit pas être signalé en erreur",
      ).toBe(true)
    })

    await test.step('Et seul l\'email est repris — pas le mot de passe', async () => {
      // Faire transiter un mot de passe d'un écran à l'autre serait un risque
      // inutile ; l'utilisateur doit le ressaisir.
      await expect(inscription.champMotDePasse).toBeEmpty()
      await expect(inscription.champConfirmation).toBeEmpty()
      await expect(inscription.champPseudo).toBeEmpty()
      await expect(inscription.champCodeInvitation).toBeEmpty()
    })

    await test.step("Et si aucun email n'a été saisi, le champ reste vide", async () => {
      // Contre-épreuve indispensable : sans elle, un champ qui afficherait
      // toujours quelque chose (« undefined », un email résiduel) passerait le
      // test précédent sans que la reprise fonctionne vraiment.
      //
      // On repasse par la connexion sans rien taper, plutôt que de recharger
      // /register : l'email est transporté dans l'entrée d'historique du
      // navigateur, un simple rechargement le restituerait donc (comportement
      // normal — et souhaitable — mais qui ne prouverait rien ici).
      await connexion.aller()
      await connexion.lienCreerCompte.click()
      await expect(inscription.titre).toBeVisible()
      await expect(inscription.champEmail).toBeEmpty()
    })
  })
})
