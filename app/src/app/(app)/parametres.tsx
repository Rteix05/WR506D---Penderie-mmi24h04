import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { FlowScreen } from '@/components/add/FlowScreen';
import { LanguagePicker } from '@/components/profiles/LanguagePicker';
import { BackButton } from '@/components/ui/BackButton';
import { ScreenTitle } from '@/components/ui/ScreenTitle';

/**
 * Paramètres (entrée « Paramètres » du panneau Profil) : pour l'instant, la
 * langue de l'app. Par défaut, celle du téléphone ; un choix ici est gardé
 * sur le téléphone (src/i18n).
 */
export default function SettingsScreen() {
  const { t } = useTranslation('profiles');

  return (
    <FlowScreen>
      <View className="flex-row px-5">
        <BackButton />
      </View>
      <View className="px-5">
        <ScreenTitle title={t('settings.title')} legend={t('settings.legend')} />
      </View>
      <View className="gap-2 px-5">
        <LanguagePicker />
        <Text className="font-luciole text-legend text-muted dark:text-muted-night">{t('settings.languageHint')}</Text>
      </View>
    </FlowScreen>
  );
}
