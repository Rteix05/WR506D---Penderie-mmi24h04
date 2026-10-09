<?php

namespace App\Service\Media;

use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\Filesystem\Filesystem;
use Symfony\Component\Uid\Uuid;

/**
 * Les fichiers des photos, sur le disque du serveur (MEDIA_DIR).
 *
 * La base ne garde que le chemin relatif (Media.path) : passer plus tard à
 * un stockage objet (S3, MinIO) ne changera que cette classe. Les fichiers
 * ne sont jamais servis directement : ils passent par GET /api/media/{id},
 * qui vérifie les droits (les photos sont privées comme les objets).
 */
final class MediaStorage
{
    private const EXTENSIONS = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];

    private readonly Filesystem $fs;

    public function __construct(#[Autowire('%env(resolve:MEDIA_DIR)%')] private readonly string $root)
    {
        $this->fs = new Filesystem();
    }

    /** Range les octets et renvoie le chemin relatif : 2026/10/<uuid>.jpg (un dossier par mois). */
    public function store(string $bytes, string $mimeType): string
    {
        $path = \sprintf('%s/%s.%s', date('Y/m'), Uuid::v7()->toRfc4122(), self::EXTENSIONS[$mimeType] ?? 'bin');
        $this->fs->dumpFile($this->absolute($path), $bytes);

        return $path;
    }

    public function absolute(string $path): string
    {
        // Le chemin vient de la base, jamais du client ; on refuse quand même toute remontée.
        if (str_contains($path, '..')) {
            throw new \InvalidArgumentException('Chemin de média invalide.');
        }

        return rtrim($this->root, '/').'/'.$path;
    }

    public function exists(string $path): bool
    {
        return $this->fs->exists($this->absolute($path));
    }

    public function delete(string $path): void
    {
        $this->fs->remove($this->absolute($path));
    }
}
