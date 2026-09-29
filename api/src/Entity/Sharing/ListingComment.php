<?php

namespace App\Entity\Sharing;

use App\Entity\Identity\Profile;
use App\Entity\Sale\Listing;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/**
 * Un commentaire sous une annonce de vente (confirmé le 21/09). Même
 * hiérarchie que les autres commentaires ; une annonce n'a pas de Share,
 * son audience suffit à dire qui la voit.
 */
#[ORM\Entity]
class ListingComment extends Comment
{
    /** RESTRICT : une annonce ne se supprime pas, elle se retire. */
    #[ORM\ManyToOne(targetEntity: Listing::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'RESTRICT')]
    private Listing $listing;

    public function __construct(Profile $author, Listing $listing, string $body, ?Comment $parent = null)
    {
        parent::__construct($author, $body, null, $parent);
        $this->listing = $listing;
        $this->assertReplyOnSameTarget();
    }

    public function getListing(): Listing
    {
        return $this->listing;
    }

    public function getTargetId(): Uuid
    {
        return $this->listing->getId();
    }
}
