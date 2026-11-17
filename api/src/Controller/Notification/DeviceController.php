<?php

namespace App\Controller\Notification;

use App\Entity\Identity\Account;
use App\Entity\Notification\DeviceToken;
use App\Entity\Notification\NotificationPreference;
use App\Enum\Notification\DevicePlatform;
use App\Enum\Notification\NotificationType;
use App\Security\CurrentProfile;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\Routing\Attribute\Route;

/**
 * L'appareil qui reçoit les push, et ce qu'on veut y recevoir :
 *
 *  - PUT    /api/device-tokens {token, platform: IOS|ANDROID} : l'app
 *    enregistre son jeton Expo à chaque ouverture (rattaché au compte, il
 *    sert à tous ses profils) ;
 *  - DELETE /api/device-tokens {token} : à la déconnexion ;
 *  - GET    /api/notification-preferences : par famille (social, prêts,
 *    ventes, famille, modération), push activé ou non ;
 *  - PUT    /api/notification-preferences {group, push} : régler une
 *    famille, pour le profil actif. Les notifications restent toujours
 *    visibles dans l'app : seul le push se coupe.
 */
final class DeviceController extends AbstractController
{
    /** Les familles de « Régler mes notifications ». */
    public const GROUPS = [
        'social' => [NotificationType::FriendRequest, NotificationType::FriendAccepted, NotificationType::FollowNew, NotificationType::FollowMutual, NotificationType::CommentAdded, NotificationType::ShareReceived],
        'loans' => [NotificationType::LoanRequested, NotificationType::LoanAccepted, NotificationType::LoanDueSoon, NotificationType::LoanOverdue, NotificationType::LoanReturned, NotificationType::ItemLost],
        'sales' => [NotificationType::ListingSold, NotificationType::OrderPaid, NotificationType::OrderShipped, NotificationType::RefundIssued],
        'family' => [NotificationType::ApprovalRequested, NotificationType::ApprovalDecided],
        'moderation' => [NotificationType::ModerationAction],
    ];

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly CurrentProfile $current,
    ) {
    }

    #[Route('/api/device-tokens', name: 'api_device_token_register', methods: ['PUT'])]
    public function register(Request $request): JsonResponse
    {
        $body = $request->toArray();
        $token = \is_string($body['token'] ?? null) ? trim($body['token']) : '';
        $platform = DevicePlatform::tryFrom((string) ($body['platform'] ?? ''));
        if (!preg_match('/^(Exponent|Expo)PushToken\[[^\]]+\]$/', $token) || null === $platform) {
            throw new BadRequestHttpException('« token » est un jeton Expo (ExponentPushToken[…]) et « platform » vaut IOS ou ANDROID.');
        }
        $account = $this->account();
        $device = $this->em->getRepository(DeviceToken::class)->findOneBy(['token' => $token]);
        if (null === $device) {
            $this->em->persist(new DeviceToken($account, $token, $platform));
        } else {
            // Le même téléphone, éventuellement passé sur un autre compte.
            $device->register($account);
        }
        $this->em->flush();

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }

    #[Route('/api/device-tokens', name: 'api_device_token_forget', methods: ['DELETE'])]
    public function forget(Request $request): JsonResponse
    {
        $token = '' === $request->getContent() ? null : ($request->toArray()['token'] ?? null);
        $device = \is_string($token) ? $this->em->getRepository(DeviceToken::class)->findOneBy(['token' => $token, 'account' => $this->account()]) : null;
        if (null !== $device) {
            $this->em->remove($device);
            $this->em->flush();
        }

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }

    #[Route('/api/notification-preferences', name: 'api_notification_preferences', methods: ['GET'])]
    public function preferences(): JsonResponse
    {
        $me = $this->current->get();
        $off = [];
        foreach ($this->em->getRepository(NotificationPreference::class)->findBy(['profile' => $me]) as $pref) {
            if (!$pref->isPushEnabled()) {
                $off[$pref->getType()->value] = true;
            }
        }
        $groups = [];
        foreach (self::GROUPS as $key => $types) {
            // Une famille est coupée si tous ses types le sont.
            $groups[] = ['group' => $key, 'push' => array_filter($types, static fn (NotificationType $t) => !isset($off[$t->value])) !== []];
        }

        return $this->json(['groups' => $groups]);
    }

    #[Route('/api/notification-preferences', name: 'api_notification_preferences_update', methods: ['PUT'])]
    public function update(Request $request): JsonResponse
    {
        $body = $request->toArray();
        $group = (string) ($body['group'] ?? '');
        if (!isset(self::GROUPS[$group]) || !\is_bool($body['push'] ?? null)) {
            throw new BadRequestHttpException('« group » vaut social, loans, sales, family ou moderation ; « push » est un booléen.');
        }
        $me = $this->current->get();
        $repo = $this->em->getRepository(NotificationPreference::class);
        foreach (self::GROUPS[$group] as $type) {
            $pref = $repo->findOneBy(['profile' => $me, 'type' => $type]);
            if (null === $pref) {
                $this->em->persist(new NotificationPreference($me, $type, $body['push']));
            } else {
                $pref->update($body['push'], $pref->isEmailEnabled());
            }
        }
        $this->em->flush();

        return $this->preferences();
    }

    private function account(): Account
    {
        $account = $this->getUser();
        \assert($account instanceof Account);

        return $account;
    }
}
