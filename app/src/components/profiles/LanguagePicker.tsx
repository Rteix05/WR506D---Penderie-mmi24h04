import { useTranslation } from 'react-i18next';

import { Chips } from '@/components/form/Chips';
import { LANGUAGES, setLanguage, type Language } from '@/i18n';

/**
 * Le choix de la langue de l'app (Mon profil) : français, anglais,
 * japonais, chacune écrite dans sa propre langue. Par défaut, l'app suit la
 * langue du téléphone ; un choix ici est gardé sur le téléphone.
 */
export function LanguagePicker() {
  const { t, i18n } = useTranslation('profiles');

  return (
    <Chips<Language>
      label={t('language.label')}
      options={LANGUAGES.map((l) => ({ value: l.code, label: l.label }))}
      selected={[i18n.language as Language]}
      onToggle={(code) => setLanguage(code)}
    />
  );
}
