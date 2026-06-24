<?php

namespace App\Command;

use App\Entity\Aliment;
use App\Repository\AlimentRepository;
use Doctrine\ORM\EntityManagerInterface;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Importe la table Ciqual (ANSES) dans l'entité Aliment.
 *
 * Source : table « aliments » à plat (une ligne par aliment, une colonne par constituant),
 * téléchargeable sur https://ciqual.anses.fr / Recherche Data Gouv (DOI 10.57745/RDMHWY).
 * Formats acceptés : .xlsx / .xls (via PhpSpreadsheet) ou .csv (séparateur ; ou ,).
 *
 *   php bin/console app:import-ciqual chemin/vers/Table_Ciqual.xlsx
 */
#[AsCommand(
    name: 'app:import-ciqual',
    description: 'Importe la table de composition Ciqual (ANSES) dans la base',
)]
class ImportCiqualCommand extends Command
{
    private const BATCH_SIZE = 200;

    /**
     * Pour chaque champ de l'entité, la liste des fragments d'en-tête (normalisés, sans
     * accents, en minuscules) qui permettent de retrouver la bonne colonne Ciqual.
     * Les fragments sont testés dans l'ordre : le premier en-tête qui contient TOUS les
     * fragments d'une variante gagne. Permet de gérer les variations d'intitulés.
     *
     * @var array<string, array<int, array<int, string>>>
     */
    private const COLUMN_MATCHERS = [
        'ciqualCode'  => [['alim_code']],
        'nom'         => [['alim_nom_fr']],
        'groupe'      => [['alim_ssssgrp_nom_fr'], ['alim_sssgrp_nom_fr'], ['alim_ssgrp_nom_fr'], ['alim_grp_nom_fr']],
        'energieKcal' => [['energie', 'kcal', '1169'], ['energie', 'kcal']],
        'energieKj'   => [['energie', 'kj', '1169'], ['energie', 'kj']],
        'graisses'    => [['lipides']],
        'graissesSat' => [['ag satures'], ['acides gras satures'], ['satures']],
        'glucides'    => [['glucides']],
        'sucres'      => [['sucres']],
        'proteines'   => [['proteines', 'jones'], ['proteines', '6.25'], ['proteines', '625'], ['proteines']],
        'sel'         => [['sel chlorure'], ['sel']],
        'fibres'      => [['fibres']],
        'fer'         => [['fer']],
        'calcium'     => [['calcium']],
    ];

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly AlimentRepository $alimentRepository,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addArgument('fichier', InputArgument::REQUIRED, 'Chemin du fichier Ciqual (.xlsx, .xls ou .csv)');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $path = $input->getArgument('fichier');

        if (!is_file($path) || !is_readable($path)) {
            $io->error(sprintf('Fichier introuvable ou illisible : %s', $path));
            return Command::FAILURE;
        }

        $io->title('Import Ciqual (ANSES)');

        // Le fichier Ciqual complet (~3 500 aliments × ~70 constituants) dépasse la limite
        // mémoire par défaut de PHP lors de la lecture du XLSX. Import ponctuel : on lève la limite.
        ini_set('memory_limit', '-1');

        try {
            $rows = $this->readRows($path);
        } catch (\Throwable $e) {
            $io->error('Lecture du fichier impossible : '.$e->getMessage());
            return Command::FAILURE;
        }

        if (count($rows) < 2) {
            $io->error('Le fichier ne contient pas de données exploitables.');
            return Command::FAILURE;
        }

        $header = array_shift($rows);
        $columns = $this->mapColumns($header);

        $missing = [];
        foreach (['ciqualCode', 'nom'] as $required) {
            if (!isset($columns[$required])) {
                $missing[] = $required;
            }
        }
        if ($missing) {
            $io->error(sprintf(
                "Colonnes obligatoires introuvables dans l'en-tête : %s.\nEn-têtes détectés : %s",
                implode(', ', $missing),
                implode(' | ', array_filter($header)),
            ));
            return Command::FAILURE;
        }

        $foundFields = array_keys($columns);
        $io->text(sprintf('Champs détectés : %s', implode(', ', $foundFields)));

        $existing = $this->alimentRepository->findAllIndexedByCiqualCode();
        $created = 0;
        $updated = 0;
        $skipped = 0;

        $io->progressStart(count($rows));

        foreach ($rows as $row) {
            $io->progressAdvance();

            $code = (int) $this->cellValue($row, $columns['ciqualCode']);
            $nom = trim((string) $this->cellValue($row, $columns['nom']));
            if ($code === 0 || $nom === '') {
                $skipped++;
                continue;
            }

            $aliment = $existing[$code] ?? null;
            if ($aliment === null) {
                $aliment = (new Aliment())->setCiqualCode($code);
                $this->em->persist($aliment);
                $existing[$code] = $aliment;
                $created++;
            } else {
                $updated++;
            }

            $aliment->setNom($nom);
            if (isset($columns['groupe'])) {
                $groupe = trim((string) $this->cellValue($row, $columns['groupe']));
                $aliment->setGroupe(($groupe !== '' && $groupe !== '-') ? $groupe : null);
            }

            $aliment->setEnergieKcal($this->parseNutrient($row, $columns['energieKcal'] ?? null));
            $aliment->setEnergieKj($this->parseNutrient($row, $columns['energieKj'] ?? null));
            $aliment->setGraisses($this->parseNutrient($row, $columns['graisses'] ?? null));
            $aliment->setGraissesSat($this->parseNutrient($row, $columns['graissesSat'] ?? null));
            $aliment->setGlucides($this->parseNutrient($row, $columns['glucides'] ?? null));
            $aliment->setSucres($this->parseNutrient($row, $columns['sucres'] ?? null));
            $aliment->setProteines($this->parseNutrient($row, $columns['proteines'] ?? null));
            $aliment->setSel($this->parseNutrient($row, $columns['sel'] ?? null));
            $aliment->setFibres($this->parseNutrient($row, $columns['fibres'] ?? null));
            $aliment->setFer($this->parseNutrient($row, $columns['fer'] ?? null));
            $aliment->setCalcium($this->parseNutrient($row, $columns['calcium'] ?? null));

            if (($created + $updated) % self::BATCH_SIZE === 0) {
                $this->em->flush();
            }
        }

        $this->em->flush();
        $io->progressFinish();

        $io->success(sprintf(
            '%d aliments créés, %d mis à jour, %d ignorés.',
            $created,
            $updated,
            $skipped,
        ));

        return Command::SUCCESS;
    }

    /**
     * Lit le fichier en un tableau de lignes (chaque ligne = tableau indexé de cellules).
     *
     * @return array<int, array<int, string|null>>
     */
    private function readRows(string $path): array
    {
        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        if ($ext === 'csv') {
            return $this->readCsvRows($path);
        }

        $reader = IOFactory::createReaderForFile($path);
        $reader->setReadDataOnly(true);
        $spreadsheet = $reader->load($path);
        $sheet = $spreadsheet->getActiveSheet();

        $rows = [];
        foreach ($sheet->getRowIterator() as $row) {
            $cells = [];
            $cellIterator = $row->getCellIterator();
            $cellIterator->setIterateOnlyExistingCells(false);
            foreach ($cellIterator as $cell) {
                $cells[] = $cell->getValue();
            }
            $rows[] = $cells;
        }

        // Libère le modèle objet (lourd) avant la boucle d'import pour réduire le pic mémoire.
        $spreadsheet->disconnectWorksheets();
        unset($sheet, $spreadsheet);

        return $rows;
    }

    /**
     * @return array<int, array<int, string|null>>
     */
    private function readCsvRows(string $path): array
    {
        $rows = [];
        $handle = fopen($path, 'r');
        if ($handle === false) {
            throw new \RuntimeException('Ouverture du CSV impossible.');
        }

        // Détecte le séparateur sur la première ligne (Ciqual CSV utilise souvent ;).
        $firstLine = fgets($handle);
        $delimiter = (substr_count((string) $firstLine, ';') >= substr_count((string) $firstLine, ',')) ? ';' : ',';
        rewind($handle);

        while (($cells = fgetcsv($handle, 0, $delimiter)) !== false) {
            $rows[] = $cells;
        }
        fclose($handle);

        return $rows;
    }

    /**
     * Associe chaque champ de l'entité à l'index de colonne correspondant dans l'en-tête.
     *
     * @param array<int, string|null> $header
     * @return array<string, int>
     */
    private function mapColumns(array $header): array
    {
        $normalized = array_map(fn ($h) => $this->normalize((string) $h), $header);

        $columns = [];
        foreach (self::COLUMN_MATCHERS as $field => $variants) {
            foreach ($variants as $fragments) {
                foreach ($normalized as $index => $head) {
                    if ($head === '') {
                        continue;
                    }
                    $allMatch = true;
                    foreach ($fragments as $fragment) {
                        if (!str_contains($head, $fragment)) {
                            $allMatch = false;
                            break;
                        }
                    }
                    if ($allMatch) {
                        $columns[$field] = $index;
                        continue 3; // champ trouvé, on passe au champ suivant
                    }
                }
            }
        }

        return $columns;
    }

    /**
     * @param array<int, string|null> $row
     */
    private function cellValue(array $row, int $index): string
    {
        return isset($row[$index]) ? (string) $row[$index] : '';
    }

    /**
     * Convertit une valeur Ciqual en float, ou null si la donnée est inconnue.
     * Gère : virgule décimale, « traces » (=0), « - » et vide (=null), préfixes « < » / « > ».
     *
     * @param array<int, string|null> $row
     */
    private function parseNutrient(array $row, ?int $index): ?float
    {
        if ($index === null) {
            return null;
        }

        $raw = trim($this->cellValue($row, $index));
        if ($raw === '' || $raw === '-') {
            return null;
        }

        $clean = strtolower($raw);
        if (str_contains($clean, 'traces')) {
            return 0.0;
        }

        // Retire les bornes (< 0,1), espaces (y compris insécables) et normalise la virgule.
        $clean = str_replace(['<', '>', ' ', "\u{00A0}"], '', $clean);
        $clean = str_replace(',', '.', $clean);

        return is_numeric($clean) ? (float) $clean : null;
    }

    /**
     * Normalise un en-tête pour la comparaison : minuscules, sans accents, espaces compactés.
     */
    private function normalize(string $value): string
    {
        $value = trim(strtolower($value));
        $value = strtr($value, [
            'à' => 'a', 'â' => 'a', 'ä' => 'a',
            'é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e',
            'î' => 'i', 'ï' => 'i',
            'ô' => 'o', 'ö' => 'o',
            'ù' => 'u', 'û' => 'u', 'ü' => 'u',
            'ç' => 'c',
            "\u{00A0}" => ' ',
        ]);

        return (string) preg_replace('/\s+/', ' ', $value);
    }
}
