<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Repository\UserRepository;
use App\State\UserPasswordHasher;
use App\State\UserRegistrationProcessor;
use App\Validator\ValidRegistrationCode;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Serializer\Annotation\Groups;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: UserRepository::class)]
#[ORM\Table(name: '`user`')]
#[ORM\UniqueConstraint(name: 'uniq_user_email', columns: ['email'])]
#[UniqueEntity(fields: ['email'], message: 'Cet email est déjà utilisé.')]
#[ApiResource(
    operations: [
        // Inscription publique : hash du mot de passe + envoi de l'email de confirmation
        new Post(
            uriTemplate: '/users',
            denormalizationContext: ['groups' => ['user:write']],
            validationContext: ['groups' => ['Default', 'user:create']],
            processor: UserRegistrationProcessor::class,
        ),
        // Lecture / mise à jour du profil (protégés — propriétaire uniquement)
        new Get(security: "is_granted('ROLE_USER') and object == user"),
        new Patch(
            denormalizationContext: ['groups' => ['user:write']],
            security: "is_granted('ROLE_USER') and object == user",
            processor: UserPasswordHasher::class,
        ),
    ],
    normalizationContext: ['groups' => ['user:read']],
    denormalizationContext: ['groups' => ['user:write']],
)]
class User implements UserInterface, PasswordAuthenticatedUserInterface
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['user:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 180)]
    #[Assert\NotBlank(message: "L'email est obligatoire.")]
    #[Assert\Email(message: "L'email n'est pas valide.")]
    #[Assert\Length(max: 180)]
    #[Groups(['user:read', 'user:write'])]
    private string $email = '';

    #[ORM\Column(length: 100)]
    #[Assert\NotBlank(message: 'Le pseudo est obligatoire.')]
    #[Assert\Length(min: 2, max: 100)]
    #[Groups(['user:read', 'user:write'])]
    private string $pseudo = '';

    /**
     * @var list<string>
     */
    #[ORM\Column]
    #[Groups(['user:read'])]
    private array $roles = [];

    /**
     * Mot de passe hashé (jamais exposé en lecture/écriture directe).
     */
    #[ORM\Column]
    private string $password = '';

    /**
     * Mot de passe en clair, fourni à l'inscription/modification puis hashé.
     */
    #[Assert\NotBlank(message: 'Le mot de passe est obligatoire.', groups: ['user:create'])]
    #[Assert\Length(min: 6, max: 4096, minMessage: 'Le mot de passe doit faire au moins {{ limit }} caractères.')]
    #[Groups(['user:write'])]
    private ?string $plainPassword = null;

    /**
     * Code d'invitation requis à l'inscription (site privé).
     * Non persisté : sert uniquement à la validation lors de la création.
     */
    #[Assert\NotBlank(message: "Le code d'autorisation est obligatoire.", groups: ['user:create'])]
    #[ValidRegistrationCode(groups: ['user:create'])]
    #[Groups(['user:write'])]
    private ?string $codeInvitation = null;

    /**
     * Chemin relatif de la photo de profil (optionnel), ex: /uploads/avatars/xxx.jpg
     */
    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['user:read'])]
    private ?string $photoProfil = null;

    #[ORM\Column]
    #[Groups(['user:read'])]
    private \DateTimeImmutable $createdAt;

    /**
     * L'email a-t-il été confirmé via le lien reçu par mail ?
     * Tant que false, la connexion est refusée (voir App\Security\UserChecker).
     */
    #[ORM\Column]
    #[Groups(['user:read'])]
    private bool $isVerified = false;

    /**
     * Jeton aléatoire envoyé par mail pour confirmer l'inscription.
     * Effacé une fois l'email confirmé. Jamais exposé via l'API.
     */
    #[ORM\Column(length: 64, nullable: true)]
    private ?string $confirmationToken = null;

    /**
     * Date limite de validité du jeton de confirmation (24 h).
     */
    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $confirmationExpiresAt = null;

    /**
     * Jeton aléatoire envoyé par mail pour réinitialiser le mot de passe.
     * Effacé une fois le mot de passe changé. Jamais exposé via l'API.
     */
    #[ORM\Column(length: 64, nullable: true)]
    private ?string $resetToken = null;

    /**
     * Date limite de validité du jeton de réinitialisation (1 h).
     */
    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $resetExpiresAt = null;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getEmail(): string
    {
        return $this->email;
    }

    public function setEmail(string $email): static
    {
        $this->email = $email;
        return $this;
    }

    public function getPseudo(): string
    {
        return $this->pseudo;
    }

    public function setPseudo(string $pseudo): static
    {
        $this->pseudo = $pseudo;
        return $this;
    }

    /**
     * Identifiant unique de connexion (l'email).
     */
    public function getUserIdentifier(): string
    {
        return $this->email;
    }

    /**
     * @return list<string>
     */
    public function getRoles(): array
    {
        $roles = $this->roles;
        $roles[] = 'ROLE_USER';

        return array_values(array_unique($roles));
    }

    /**
     * @param list<string> $roles
     */
    public function setRoles(array $roles): static
    {
        $this->roles = $roles;
        return $this;
    }

    public function getPassword(): string
    {
        return $this->password;
    }

    public function setPassword(string $password): static
    {
        $this->password = $password;
        return $this;
    }

    public function getPlainPassword(): ?string
    {
        return $this->plainPassword;
    }

    public function setPlainPassword(?string $plainPassword): static
    {
        $this->plainPassword = $plainPassword;
        return $this;
    }

    public function getCodeInvitation(): ?string
    {
        return $this->codeInvitation;
    }

    public function setCodeInvitation(?string $codeInvitation): static
    {
        $this->codeInvitation = $codeInvitation;
        return $this;
    }

    public function getPhotoProfil(): ?string
    {
        return $this->photoProfil;
    }

    public function setPhotoProfil(?string $photoProfil): static
    {
        $this->photoProfil = $photoProfil;
        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function isVerified(): bool
    {
        return $this->isVerified;
    }

    public function getConfirmationToken(): ?string
    {
        return $this->confirmationToken;
    }

    public function getConfirmationExpiresAt(): ?\DateTimeImmutable
    {
        return $this->confirmationExpiresAt;
    }

    /**
     * Démarre (ou relance) la confirmation : génère un nouveau jeton valable 24 h
     * et remet le compte à l'état « non confirmé ».
     */
    public function startEmailConfirmation(): void
    {
        $this->isVerified = false;
        $this->confirmationToken = bin2hex(random_bytes(32));
        $this->confirmationExpiresAt = (new \DateTimeImmutable())->modify('+24 hours');
    }

    /**
     * Marque l'email comme confirmé et efface le jeton (usage unique).
     */
    public function confirmEmail(): void
    {
        $this->isVerified = true;
        $this->confirmationToken = null;
        $this->confirmationExpiresAt = null;
    }

    /**
     * Le jeton de confirmation est-il encore valable (non expiré) ?
     */
    public function isConfirmationTokenValid(): bool
    {
        return $this->confirmationExpiresAt !== null
            && $this->confirmationExpiresAt > new \DateTimeImmutable();
    }

    public function getResetToken(): ?string
    {
        return $this->resetToken;
    }

    public function getResetExpiresAt(): ?\DateTimeImmutable
    {
        return $this->resetExpiresAt;
    }

    /**
     * Démarre (ou relance) une réinitialisation de mot de passe :
     * génère un nouveau jeton valable 1 h.
     */
    public function startPasswordReset(): void
    {
        $this->resetToken = bin2hex(random_bytes(32));
        $this->resetExpiresAt = (new \DateTimeImmutable())->modify('+1 hour');
    }

    /**
     * Efface le jeton de réinitialisation (usage unique, après changement réussi).
     */
    public function clearPasswordReset(): void
    {
        $this->resetToken = null;
        $this->resetExpiresAt = null;
    }

    /**
     * Le jeton de réinitialisation est-il encore valable (non expiré) ?
     */
    public function isResetTokenValid(): bool
    {
        return $this->resetExpiresAt !== null
            && $this->resetExpiresAt > new \DateTimeImmutable();
    }

    /**
     * Efface les données sensibles temporaires.
     */
    public function eraseCredentials(): void
    {
        $this->plainPassword = null;
    }
}
