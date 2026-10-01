import { test, expect } from '@playwright/test'
import { MetabolismePage } from '../../pages/MetabolismePage'
import { profils, profilIncomplet } from '../../fixtures/metabolisme'

/**
 * Suite : Métabolisme de base — exactitude du calcul
 *
 *   TC_METABOLISME_001 — le métabolisme affiché est bien celui de la formule
 *
 * Même raison d'être que TC_RECETTE_004 côté recette : l'utilisateur ne peut pas
 * vérifier le chiffre qu'on lui donne. Il lit « 1394 kcal / jour » et le prend
 * pour argent comptant — un coefficient inversé, un âge ignoré ou une équation
 * appliquée au mauvais sexe donneraient un nombre tout aussi crédible à l'écran.
 * Seul un attendu posé à la main, à partir de la formule de référence, peut le
 * démasquer (voir fixtures/metabolisme.js).
 *
 * Ce cas ne vérifie QUE le calcul. La sauvegarde du résultat dans le profil
 * (proposée au seul utilisateur connecté) et le comportement des champs en
 * saisie invalide (lettres, valeurs négatives…) relèvent de cas distincts, qui
 * échoueraient pour d'autres raisons.
 *
 * Aucun compte nécessaire : la page est publique.
 */
test.describe('Métabolisme de base — exactitude du calcul', () => {
  test('TC_METABOLISME_001_calcul_correct — le métabolisme affiché est celui de la formule de Harris & Benedict, pour chaque sexe', async ({ page }) => {
    const metabolisme = new MetabolismePage(page)

    await test.step('Étant donné la page de calcul du métabolisme de base', async () => {
      await metabolisme.aller()

      // La formule annoncée à l'utilisateur est celle contre laquelle les
      // attendus du JDD ont été posés. Si l'application changeait d'équation,
      // ce contrôle situerait l'échec tout de suite : ce ne serait pas un bug
      // de calcul, mais un changement de référence.
      await expect(
        metabolisme.mentionFormule,
        'la page doit annoncer la formule de référence du JDD',
      ).toBeVisible()

      await expect(
        metabolisme.invitationASaisir,
        'aucune valeur ne doit être avancée avant toute saisie',
      ).toBeVisible()
    })

    await test.step('Et aucun métabolisme n’est affiché tant qu’une mesure manque', async () => {
      // Préalable aux cas de calcul, et pas un doublon de la validation : ce
      // qu'on vérifie ici, c'est que l'application ne calcule pas AVEC un champ
      // vide (traité comme un zéro), ce qui gonflerait le résultat de
      // 4,676 × âge sans que rien ne le signale.
      await metabolisme.choisirSexe(profilIncomplet.sexe)
      await metabolisme.saisirMesures({
        poids: profilIncomplet.poids,
        taille: profilIncomplet.taille,
      })

      await expect
        .poll(() => metabolisme.metabolismeAffiche(), {
          message: 'un profil incomplet ne doit produire aucun chiffre',
        })
        .toBeNull()
    })

    // Les profils s'enchaînent sur la même page, sans rechargement : à partir du
    // troisième, chacun ne modifie qu'une donnée (cf. `isole` dans le JDD). Une
    // valeur qui resterait figée sur la première saisie serait donc prise ici,
    // et pas seulement une formule fausse.
    for (const profil of profils) {
      await test.step(`Quand l’utilisateur décrit ${profil.resume} — ${profil.isole}`, async () => {
        await metabolisme.saisirProfil(profil)
      })

      await test.step(`Alors la page affiche ${profil.attendu} kcal / jour, soit ${profil.calcul}`, async () => {
        await expect
          .poll(() => metabolisme.metabolismeAffiche(), {
            message: `le métabolisme doit valoir ${profil.calcul}, arrondi à l’unité`,
          })
          .toBe(profil.attendu)

        await expect(
          metabolisme.uniteParJour,
          'le résultat doit être présenté en kcal par jour',
        ).toBeVisible()
      })
    }
  })
})
