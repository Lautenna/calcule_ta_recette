import { test, expect } from '@playwright/test'
import { ConnexionPage } from '../../pages/ConnexionPage'
import { CalculateurPage } from '../../pages/CalculateurPage'
import { ProfilPage } from '../../pages/ProfilPage'
import { compterRecettes, supprimerRecette, supprimerRecettesParNom } from '../../fixtures/backend'
import { utilisateurMesRecettes, utilisateurValide } from '../../fixtures/utilisateurs'
import { recetteAEnregistrer, recetteRefusee } from '../../fixtures/ingredients'

/**
 * Suite : Recette — enregistrer une recette sur son compte
 *
 *   TC_RECETTE_001 — connecté     → la recette est enregistrée dans le profil
 *   TC_RECETTE_002 — non connecté → une connexion est proposée, rien n'est enregistré
 *
 * Le bouton « Enregistrer la recette » est proposé à tout le monde : c'est
 * l'issue du clic qui dépend de la session. D'où deux cas, pour les deux issues.
 *
 * Ce que ces cas vérifient au-delà du message affiché : une recette enregistrée
 * doit être RESTITUABLE. Une application qui confirmerait l'enregistrement en ne
 * gardant que le nom afficherait exactement le même message de succès — c'est
 * pourquoi TC_RECETTE_001 rouvre la recette et confronte ses totaux à ceux du
 * JDD, posés à la main et déjà vérifiés par TC_RECETTE_004.
 *
 * Prérequis JDD : `utilisateurMesRecettes` et `utilisateurValide` doivent exister
 * en base, email confirmé (`npm run seed`).
 */
test.describe('Recette — enregistrer une recette sur son compte', () => {
  /**
   * Noms des recettes manipulées par CETTE exécution, suffixés par l'indice du
   * worker Playwright qui la joue.
   *
   * Le compte de test est partagé, et son contenu fait partie de ce que le test
   * vérifie. Deux exécutions simultanées du même cas (`--repeat-each`, réessais
   * en parallèle) enregistreraient la même recette dans la même liste : l'une
   * effacerait celle de l'autre, ou en trouverait deux. Le test échouerait sans
   * que l'application y soit pour rien — le pire défaut d'une suite automatisée.
   *
   * Un worker ne joue qu'un test à la fois : son indice suffit donc à garantir
   * que deux exécutions concurrentes ne touchent jamais la même recette.
   */
  const nomRecette = () => `${recetteAEnregistrer.nom} (poste ${test.info().workerIndex})`
  const nomRecetteRefusee = () => `${recetteRefusee.nom} (poste ${test.info().workerIndex})`

  /**
   * Ménage avant ET après : avant, parce qu'une exécution interrompue a pu
   * laisser la recette derrière elle — le test ne prouverait alors rien en la
   * « retrouvant » dans le profil ; après, pour ne rien laisser traîner en base.
   *
   * On ne vide PAS toute la liste du compte : cela effacerait la recette d'une
   * exécution concurrente.
   *
   * La recette du cas non connecté est nettoyée tous comptes confondus : elle ne
   * devrait jamais exister, et si l'application la créait malgré tout, la ligne
   * fautive ferait échouer toutes les exécutions suivantes.
   */
  const nettoyer = () => {
    supprimerRecette(utilisateurMesRecettes.email, nomRecette())
    supprimerRecettesParNom(nomRecetteRefusee())
  }

  test.beforeEach(nettoyer)
  test.afterEach(nettoyer)

  test('TC_RECETTE_001_enrégistré_recette_compte_connecté — un utilisateur connecté enregistre sa recette, la retrouve dans son profil et la rouvre intacte', async ({ page }) => {
    const connexion = new ConnexionPage(page)
    const calculateur = new CalculateurPage(page)
    const profil = new ProfilPage(page)

    /** Recette du JDD, sous le nom propre à cette exécution. */
    const recette = { ...recetteAEnregistrer, nom: nomRecette() }

    await test.step('Étant donné un utilisateur connecté ayant composé une recette de deux ingrédients', async () => {
      await connexion.ouvrirSession(utilisateurMesRecettes)
      await calculateur.aller()
      await calculateur.composer(recette.ingredients)

      // 5 portions, et non les 4 par défaut : c'est ce qui permettra de vérifier
      // à la réouverture que ce réglage a lui aussi été enregistré.
      await calculateur.reglerPortions(recette.portions)
    })

    await test.step('Quand il la nomme et clique sur « Enregistrer la recette »', async () => {
      await calculateur.champNomRecette.fill(recette.nom)
      await calculateur.boutonEnregistrerRecette.click()
    })

    await test.step('Alors l’enregistrement est confirmé', async () => {
      await expect(calculateur.notification)
        .toContainText('Recette enregistrée dans votre profil.')
    })

    await test.step('Et l’application sait désormais quelle recette elle édite', async () => {
      // Le bouton passe de « Enregistrer la recette » à « Mettre à jour » : c'est
      // le garde-fou contre le doublon créé par un second clic.
      await expect(calculateur.boutonMettreAJour).toBeVisible()
      await expect(calculateur.boutonEnregistrerRecette).toBeHidden()
      await expect(calculateur.boutonNouvelleRecette, 'repartir de zéro doit rester possible').toBeVisible()
    })

    await test.step('Et la recette figure dans « Mes recettes », une seule fois, avec son résumé', async () => {
      await profil.aller()

      await expect(profil.sectionRecettes).toBeVisible()
      // Compté dans la SEULE liste des recettes : un ingrédient enregistré sous
      // le même nom ne peut plus être pris pour la recette cherchée.
      await expect(
        profil.ligneRecette(recette.nom),
        'un seul enregistrement doit avoir eu lieu',
      ).toHaveCount(1)

      // Le nom seul ne prouverait rien : ce résumé atteste que le nombre de
      // portions et la composition ont été enregistrés avec lui.
      await expect(profil.resumeRecette(recette.nom)).toHaveText(recette.resume)
    })

    await test.step('Et la rouvrir depuis le profil restitue la recette entière', async () => {
      // C'est la raison d'être de l'enregistrement : retrouver sa recette telle
      // qu'on l'avait laissée, sans rien ressaisir.
      await profil.boutonModifierRecette(recette.nom).click()

      await expect(calculateur.titreModification(recette.nom)).toBeVisible()
      await expect(
        calculateur.cartes,
        'la recette doit être restituée avec toutes ses lignes, ni plus ni moins',
      ).toHaveCount(recette.ingredients.length)

      // Chaque ingrédient est cherché dans SA ligne, à son rang : l'ordre de la
      // composition fait partie de ce qui doit avoir été enregistré.
      for (const [indice, ingredient] of recette.ingredients.entries()) {
        await expect(
          calculateur.carte(indice).syntheseNom,
          `« ${ingredient.nom} » doit être restitué en ligne ${indice + 1}`,
        ).toHaveText(ingredient.nom)
      }

      await expect(
        calculateur.valeurPortions,
        'le nombre de portions doit être restitué',
      ).toHaveText(String(recette.portions))
    })

    await test.step('Et son calcul nutritionnel est identique à celui d’avant l’enregistrement', async () => {
      // L'empreinte de la recette : ces attendus sont ceux de TC_RECETTE_003
      // et 004, posés à la main. S'ils tombent encore juste après un aller-retour
      // en base, c'est que les quantités et les valeurs nutritionnelles ont été
      // enregistrées, et pas seulement le nom.
      await calculateur.afficherDetailParIngredient()

      await expect
        .poll(() => calculateur.valeursDe(calculateur.ligneTotal), {
          message: 'le total de la recette rouverte doit être inchangé',
        })
        .toEqual(recette.total)

      expect(
        await calculateur.valeursDe(calculateur.ligneParPortion),
        'les valeurs par portion doivent être inchangées',
      ).toEqual(recette.parPortion)
    })
  })

  test('TC_RECETTE_002_enrégistré_recette_compte_NonConnecté — un visiteur non connecté est invité à se connecter, et aucune recette n’est enregistrée', async ({ page }) => {
    const connexion = new ConnexionPage(page)
    const calculateur = new CalculateurPage(page)

    /** Recette qui ne doit jamais naître, sous le nom propre à cette exécution. */
    const recette = { ...recetteRefusee, nom: nomRecetteRefusee() }

    /** Installé avant toute action : une requête manquée ne se rejoue pas. */
    const tentativesEnregistrement = calculateur.espionnerEnregistrementRecette()

    await test.step('Étant donné un visiteur NON connecté ayant composé et nommé une recette', async () => {
      await calculateur.aller()
      await calculateur.composer(recette.ingredients)
      await calculateur.reglerPortions(recette.portions)

      // La recette est complète : rien d'autre que l'absence de session ne peut
      // faire obstacle à l'enregistrement.
      await calculateur.champNomRecette.fill(recette.nom)
      await expect(
        calculateur.boutonEnregistrerRecette,
        'le bouton reste proposé, même sans session',
      ).toBeVisible()
    })

    await test.step('Quand il clique sur « Enregistrer la recette »', async () => {
      await calculateur.boutonEnregistrerRecette.click()
    })

    await test.step('Alors il est conduit vers la page de connexion', async () => {
      await expect(page).toHaveURL('/login')
      await expect(connexion.titre).toBeVisible()
    })

    await test.step('Et aucun enregistrement n’a été tenté', async () => {
      expect(
        tentativesEnregistrement,
        'aucune requête d’enregistrement ne doit partir sans session',
      ).toEqual([])

      const jeton = await page.evaluate(() => localStorage.getItem('auth_token'))
      expect(jeton, 'aucune session ne doit avoir été ouverte').toBeNull()
    })

    await test.step('Et rien n’a atterri en base, sur aucun compte', async () => {
      // Le réseau prouve qu'aucun appel n'est parti ; la base prouve qu'aucune
      // recette n'est apparue. Le second contrôle ne fait pas doublon : il ne
      // suppose pas que l'enregistrement passe forcément par cette route-là.
      expect(
        compterRecettes(recette.nom),
        'la recette d’un visiteur non connecté ne doit exister nulle part',
      ).toBe(0)
    })

    await test.step('Et une fois connecté, il est ramené au calculateur', async () => {
      // L'invitation tient sa promesse : le visiteur revient là où il en était,
      // et non sur une page sans rapport.
      // Compte volontairement en lecture seule : s'y connecter ne le modifie pas.
      await connexion.seConnecter(utilisateurValide.email, utilisateurValide.motDePasse)
      await expect(page).toHaveURL('/calculateur')
    })
  })
})
