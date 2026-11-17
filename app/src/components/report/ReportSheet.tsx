import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { E1 } from '@/components/ui/elevation';
import { REPORT_REASONS, reportContent, type ReportReason, type ReportTarget } from '@/lib/report';

/**
 * « Signaler » : un lien discret qui ouvre le panneau de signalement. Le
 * panneau demande une raison, une précision facultative (obligatoire pour
 * « Autre »), puis confirme l'envoi. La personne signalée ne sait pas qui
 * l'a signalée.
 */
export function ReportLink({ targetType, targetId, label, className = '' }: { targetType: ReportTarget; targetId: string; label?: string; className?: string }) {
  const { t } = useTranslation('social');
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable accessibilityRole="button" onPress={() => setOpen(true)} hitSlop={8} className={`active:opacity-70 ${className}`}>
        <Text className="font-luciole text-legend text-muted dark:text-muted-night">{label ?? t('report.link')}</Text>
      </Pressable>
      {open && <ReportSheet targetType={targetType} targetId={targetId} onClose={() => setOpen(false)} />}
    </>
  );
}

export function ReportSheet({ targetType, targetId, onClose }: { targetType: ReportTarget; targetId: string; onClose: () => void }) {
  const { t } = useTranslation('social');
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const needsText = reason === 'OTHER';

  const send = async () => {
    if (!reason) return;
    setSending(true);
    setError(null);
    try {
      await reportContent(targetType, targetId, reason, text);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('report.error'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityLabel={t('report.cancel')} onPress={onClose} className="flex-1 bg-ink/40" />
      <View className="max-h-[85%] rounded-t-lg bg-bg pb-8 pt-5 dark:bg-bg-night">
        <ScrollView contentContainerClassName="gap-4 px-5" keyboardShouldPersistTaps="handled">
          <Text accessibilityRole="header" className="font-luciole-bold text-body text-ink dark:text-ink-night">
            {t(`report.title.${targetType}`)}
          </Text>

          {sent ? (
            <>
              <Text className="font-luciole text-body text-ink dark:text-ink-night">{t('report.sent')}</Text>
              <Button label={t('report.close')} variant="secondary" onPress={onClose} />
            </>
          ) : (
            <>
              <Text className="font-luciole text-legend text-muted dark:text-muted-night">{t('report.question')}</Text>
              <View accessibilityRole="radiogroup" className="gap-2">
                {REPORT_REASONS.map((r) => {
                  const on = r === reason;

                  return (
                    <Pressable
                      key={r}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      onPress={() => setReason(r)}
                      style={E1}
                      className={`flex-row items-center gap-3 rounded-md bg-surface px-4 py-3 active:opacity-80 dark:bg-surface-night ${on ? 'border-2 border-primary' : 'border-2 border-transparent'}`}>
                      <View className={`h-5 w-5 items-center justify-center rounded-full border-2 ${on ? 'border-primary' : 'border-muted'}`}>
                        {on && <View className="h-2.5 w-2.5 rounded-full bg-primary" />}
                      </View>
                      <View className="flex-1">
                        <Text className="font-luciole-bold text-body text-ink dark:text-ink-night">{t(`report.reason.${r}.title`)}</Text>
                        <Text className="font-luciole text-legend text-muted dark:text-muted-night">{t(`report.reason.${r}.hint`)}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <View className="gap-1">
                <Text className="font-luciole-bold text-legend text-muted dark:text-muted-night">{needsText ? t('report.detailsRequired') : t('report.details')}</Text>
                <TextInput
                  accessibilityLabel={needsText ? t('report.detailsRequired') : t('report.details')}
                  value={text}
                  onChangeText={setText}
                  placeholder={t('report.placeholder')}
                  placeholderTextColor="#94A3B8"
                  multiline
                  maxLength={1000}
                  textAlignVertical="top"
                  style={E1}
                  className="min-h-[80px] rounded-md bg-surface px-4 py-3 font-luciole text-body text-ink dark:bg-surface-night dark:text-ink-night"
                />
              </View>

              {error && (
                <Text accessibilityRole="alert" className="font-luciole text-legend text-error dark:text-error-night">
                  {error}
                </Text>
              )}
              <Button label={t('report.send')} onPress={send} loading={sending} disabled={!reason || (needsText && text.trim() === '')} />
              <Button label={t('report.cancel')} variant="ghost" onPress={onClose} />
              <Text className="text-center font-luciole text-legend text-muted dark:text-muted-night">{t('report.note')}</Text>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
