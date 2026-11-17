import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { confirmDelete, DetailActions, DetailHero, DetailTitle, InfoRow, Section, soon } from '@/components/inventory/Detail';
import { PossessionLoans, useLoanAction } from '@/components/loans/PossessionLoans';
import { MoveHistory } from '@/components/inventory/MoveHistory';
import { BackButton } from '@/components/ui/BackButton';
import { artOf, AVAILABILITY, CONDITION_LABEL, deletePossession, locationOf, usePossession } from '@/lib/possessions';
import { openMove } from '@/lib/moves';
import { useItemCategories, useLocations } from '@/lib/reference';

/**
 * Fiche d'un objet (Figma « Objet — Fiche · Disponible », 135:2216) :
 * photo, nom et statut, emplacement, détails, notes, actions.
 *
 * Données réelles de l'API. « Prêter » ouvre le parcours de prêt ; un ami
 * qui voit l'objet peut demander à l'emprunter. En attente de leurs
 * routes : « Partager », « Vendre » (une alerte le dit) ; les
 * collections, absentes plutôt que remplies d'exemples. Modifier et
 * supprimer : seulement pour le propriétaire (access ADMIN).
 */
export default function ItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = usePossession('item', id);
  const categories = useItemCategories();
  const locations = useLocations();
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);
  const loanAction = useLoanAction(item.data, 'item', item.data?.access === 'ADMIN');

  if (!item.data) {
    return (
      <SafeAreaView className="flex-1 gap-6 bg-bg px-5 pt-5 dark:bg-bg-night">
        <BackButton close />
        {item.isError ? <Text className="font-luciole text-body text-error dark:text-error-night">{item.error.message}</Text> : <ActivityIndicator />}
      </SafeAreaView>
    );
  }

  const p = item.data;
  const owner = p.access === 'ADMIN';
  const category = categories.data?.find((c) => c.iri === p.category)?.name ?? null;
  const where = locationOf(locations.data, p);
  const edit = () => router.push({ pathname: '/modifier', params: { kind: 'item', id: p.id } });
  const remove = () =>
    confirmDelete('cet objet', p.name, async () => {
      setDeleting(true);
      try {
        await deletePossession(queryClient, 'item', p.id);
        router.back();
      } catch (e) {
        setDeleting(false);
        Alert.alert('Suppression impossible', e instanceof Error ? e.message : '');
      }
    });

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-bg dark:bg-bg-night">
      <ScrollView contentContainerClassName="gap-6 pb-10">
        <SafeAreaView edges={['top']} className="bg-ink/[0.04] dark:bg-ink-night/[0.06]">
          <DetailHero photo={p.photos?.[0]} art={artOf('item', p, categories.data)} height={300} scale={190 / 44.1} close />
        </SafeAreaView>
        <DetailTitle name={p.name} meta={category ?? ''} status={AVAILABILITY[p.availability]} />

        <View className="gap-3 px-5">
          <PossessionLoans possession={p} owner={owner} />
          {p.room && (
            <Section title="Localisation" link={owner ? { label: "Déplacer l'objet", onPress: () => openMove('item', p.id, p.name, where) } : undefined}>
              <Text className="font-luciole-bold text-body text-ink dark:text-ink-night">{where ?? '…'}</Text>
            </Section>
          )}
          <MoveHistory iri={p['@id']} enabled={Boolean(p.room)} />
          {(category || p.condition) && (
            <Section title="Détails" gap="gap-3">
              {category && <InfoRow label="Catégorie" value={category} />}
              {p.condition && <InfoRow label="État" value={CONDITION_LABEL[p.condition]} />}
            </Section>
          )}
          {p.description && (
            <Section title="Description">
              <Text className="font-luciole text-body text-ink dark:text-ink-night">{p.description}</Text>
            </Section>
          )}
          {owner && (
            <Section title="Notes et souvenir" link={{ label: p.notes ? 'Modifier la note' : 'Ajouter une note', onPress: edit }}>
              <Text className={`font-luciole text-body ${p.notes ? 'text-ink dark:text-ink-night' : 'text-muted dark:text-muted-night'}`}>
                {p.notes || 'Rien pour l’instant. Les notes ne sont visibles que par toi.'}
              </Text>
            </Section>
          )}
        </View>

        {!owner && loanAction.primary && <DetailActions primary={loanAction.primary} note={loanAction.note} secondary={[]} />}
        {owner && (
          <DetailActions
            primary={loanAction.primary}
            note={loanAction.note}
            secondary={[
              { label: 'Modifier', onPress: edit },
              { label: 'Partager', onPress: () => soon('Partager') },
              { label: 'Vendre', onPress: () => soon('Vendre') },
            ]}
            deleteLabel="Supprimer cet objet"
            onDelete={remove}
            deleting={deleting}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
