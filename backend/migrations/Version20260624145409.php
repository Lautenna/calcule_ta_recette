<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260624145409 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE ingredient (id INT AUTO_INCREMENT NOT NULL, nom VARCHAR(255) NOT NULL, marque VARCHAR(255) DEFAULT NULL, energie_kcal DOUBLE PRECISION DEFAULT NULL, energie_kj DOUBLE PRECISION DEFAULT NULL, graisses DOUBLE PRECISION DEFAULT NULL, graisses_sat DOUBLE PRECISION DEFAULT NULL, glucides DOUBLE PRECISION DEFAULT NULL, sucres DOUBLE PRECISION DEFAULT NULL, proteines DOUBLE PRECISION DEFAULT NULL, sel DOUBLE PRECISION DEFAULT NULL, fibres DOUBLE PRECISION DEFAULT NULL, fer DOUBLE PRECISION DEFAULT NULL, calcium DOUBLE PRECISION DEFAULT NULL, user_id INT NOT NULL, INDEX IDX_6BAF7870A76ED395 (user_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('ALTER TABLE ingredient ADD CONSTRAINT FK_6BAF7870A76ED395 FOREIGN KEY (user_id) REFERENCES `user` (id)');
        $this->addSql('ALTER TABLE recette ADD composition JSON DEFAULT NULL, ADD user_id INT NOT NULL');
        $this->addSql('ALTER TABLE recette ADD CONSTRAINT FK_49BB6390A76ED395 FOREIGN KEY (user_id) REFERENCES `user` (id)');
        $this->addSql('CREATE INDEX IDX_49BB6390A76ED395 ON recette (user_id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE ingredient DROP FOREIGN KEY FK_6BAF7870A76ED395');
        $this->addSql('DROP TABLE ingredient');
        $this->addSql('ALTER TABLE recette DROP FOREIGN KEY FK_49BB6390A76ED395');
        $this->addSql('DROP INDEX IDX_49BB6390A76ED395 ON recette');
        $this->addSql('ALTER TABLE recette DROP composition, DROP user_id');
    }
}
