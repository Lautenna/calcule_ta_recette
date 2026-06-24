<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260623181650 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE aliment (id INT AUTO_INCREMENT NOT NULL, ciqual_code INT NOT NULL, nom VARCHAR(255) NOT NULL, groupe VARCHAR(255) DEFAULT NULL, energie_kcal DOUBLE PRECISION DEFAULT NULL, energie_kj DOUBLE PRECISION DEFAULT NULL, graisses DOUBLE PRECISION DEFAULT NULL, graisses_sat DOUBLE PRECISION DEFAULT NULL, glucides DOUBLE PRECISION DEFAULT NULL, sucres DOUBLE PRECISION DEFAULT NULL, proteines DOUBLE PRECISION DEFAULT NULL, sel DOUBLE PRECISION DEFAULT NULL, fibres DOUBLE PRECISION DEFAULT NULL, fer DOUBLE PRECISION DEFAULT NULL, calcium DOUBLE PRECISION DEFAULT NULL, INDEX idx_aliment_nom (nom), UNIQUE INDEX uniq_ciqual_code (ciqual_code), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('DROP TABLE aliment');
    }
}
