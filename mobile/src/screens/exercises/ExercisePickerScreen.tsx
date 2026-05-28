import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronDown, ChevronLeft, Search, SlidersHorizontal, X } from 'lucide-react-native';
import { colors, radii, shadows, spacing } from '../../theme';
import {
  Button,
  IconButton,
  Input,
  Screen,
  Text,
} from '../../components/ui';
import { ScreenHeader } from '../../components/layout';
import { exerciseApi } from '../../api/exerciseApi';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import type {
  ExerciseFacets,
  ExerciseSummary,
  PageResponse,
} from '../../types/exercise';
import { ExerciseRow } from './ExerciseRow';
import type { RootStackParamList } from '../../navigation/types';
import { ALL_VALUE, FilterPickerSheet } from '../../components/filters/FilterPickerSheet';

const PAGE_SIZE = 30;

type Nav = NativeStackNavigationProp<RootStackParamList, 'ExercisePicker'>;
type Route = RouteProp<RootStackParamList, 'ExercisePicker'>;

export function ExercisePickerScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const mode = route.params?.mode ?? 'select';
  const isSelect = mode === 'select';
  const appendToTemplateId = route.params?.appendToTemplateId;
  const appendToLiveSession = route.params?.appendToLiveSession;
  const forTraineeId = route.params?.forTraineeId;

  const handleContinue = useCallback(
    (ids: string[]) => {
      if (appendToLiveSession) {
        navigation.navigate({
          name: 'LiveWorkout',
          params: { pendingExerciseIds: ids } as never,
          merge: true,
        });
      } else if (appendToTemplateId) {
        navigation.navigate({
          name: 'TemplateForm',
          params: {
            mode: 'edit',
            templateId: appendToTemplateId,
            pendingExerciseIds: ids,
          },
          merge: true,
        });
      } else {
        navigation.navigate('TemplateForm', {
          mode: 'create',
          exerciseIds: ids,
          traineeId: forTraineeId,
        });
      }
    },
    [navigation, appendToTemplateId, appendToLiveSession, forTraineeId],
  );

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const toggleSelected = useCallback((id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  }, []);

  const [searchInput, setSearchInput] = useState('');
  const debouncedQuery = useDebouncedValue(searchInput, 300);

  const [category, setCategory] = useState<string>(ALL_VALUE);
  const [muscle, setMuscle] = useState<string>(ALL_VALUE);
  const [facets, setFacets] = useState<ExerciseFacets>({ categories: [], levels: [], muscles: [] });
  const [openPicker, setOpenPicker] = useState<'category' | 'muscle' | null>(null);

  const [items, setItems] = useState<ExerciseSummary[]>([]);
  const [page, setPage] = useState<PageResponse<ExerciseSummary> | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load facets enkrat
  useEffect(() => {
    let cancelled = false;
    exerciseApi
      .facets()
      .then(f => {
        if (!cancelled) setFacets(f);
      })
      .catch(err => {
        console.warn('Failed to load exercise facets', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Zloadamo prvo stran ce se filter spremenij
  const fetchFirstPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await exerciseApi.list({
        page: 0,
        size: PAGE_SIZE,
        category: category === ALL_VALUE ? undefined : category,
        muscle: muscle === ALL_VALUE ? undefined : muscle,
        q: debouncedQuery.trim() || undefined,
      });
      setItems(result.content);
      setPage(result);
    } catch (err) {
      setError(extractMessage(err));
      setItems([]);
      setPage(null);
    } finally {
      setLoading(false);
    }
  }, [category, muscle, debouncedQuery]);

  useEffect(() => {
    fetchFirstPage();
  }, [fetchFirstPage]);

  const onLoadMore = useCallback(async () => {
    if (!page || page.last || loadingMore || loading) return;
    setLoadingMore(true);
    try {
      const next = await exerciseApi.list({
        page: page.page + 1,
        size: PAGE_SIZE,
        category: category === ALL_VALUE ? undefined : category,
        muscle: muscle === ALL_VALUE ? undefined : muscle,
        q: debouncedQuery.trim() || undefined,
      });
      setItems(prev => prev.concat(next.content));
      setPage(next);
    } catch (err) {
      setError(extractMessage(err));
    } finally {
      setLoadingMore(false);
    }
  }, [page, category, muscle, debouncedQuery, loading, loadingMore]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchFirstPage();
    } finally {
      setRefreshing(false);
    }
  }, [fetchFirstPage]);

  const categoryOptions = useMemo(
    () => [
      { value: ALL_VALUE, label: 'All categories' },
      ...facets.categories.map(c => ({ value: c, label: titleCase(c) })),
    ],
    [facets.categories],
  );
  const muscleOptions = useMemo(
    () => [
      { value: ALL_VALUE, label: 'All muscles' },
      ...facets.muscles.map(m => ({ value: m, label: titleCase(m) })),
    ],
    [facets.muscles],
  );

  const categoryLabel =
    category === ALL_VALUE ? 'Category' : (categoryOptions.find(o => o.value === category)?.label ?? 'Category');
  const muscleLabel =
    muscle === ALL_VALUE ? 'Muscle' : (muscleOptions.find(o => o.value === muscle)?.label ?? 'Muscle');

  const activeCount = (category !== ALL_VALUE ? 1 : 0) + (muscle !== ALL_VALUE ? 1 : 0);
  const onClearAll = useCallback(() => {
    setCategory(ALL_VALUE);
    setMuscle(ALL_VALUE);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: ExerciseSummary }) => (
      <ExerciseRow
        exercise={item}
        selectable={isSelect}
        selected={isSelect && selectedIds.includes(item.id)}
        onPress={() => {
          if (isSelect) toggleSelected(item.id);
        }}
        onInfoPress={() => navigation.navigate('ExerciseDetail', { exerciseId: item.id })}
      />
    ),
    [isSelect, selectedIds, toggleSelected, navigation],
  );

  return (
    <Screen edges={['top']}>
      <ScreenHeader
        title="Exercise library"
        eyebrow={page ? `${page.totalElements} exercises` : undefined}
        left={
          <IconButton variant="surface" withBorder onPress={() => navigation.goBack()}>
            <ChevronLeft size={18} color={colors.inkPrimary} strokeWidth={2.25} />
          </IconButton>
        }
      />

      <View style={styles.searchWrap}>
        <View style={styles.searchRow}>
          <Search size={16} color={colors.inkMuted} strokeWidth={2} />
          <Input
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search by name"
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={Keyboard.dismiss}
            containerStyle={styles.searchInputContainer}
            style={styles.searchInput}
          />
          {searchInput.length > 0 ? (
            <IconButton variant="ghost" size="sm" onPress={() => setSearchInput('')}>
              <X size={14} color={colors.inkMuted} strokeWidth={2} />
            </IconButton>
          ) : null}
        </View>
      </View>

      <View style={styles.filterBar}>
        <View style={styles.filterPillsRow}>
          <FilterPill
            icon={<SlidersHorizontal size={14} color={colors.inkSecondary} strokeWidth={2.25} />}
            label={categoryLabel}
            active={category !== ALL_VALUE}
            onPress={() => setOpenPicker('category')}
          />
          <FilterPill
            label={muscleLabel}
            active={muscle !== ALL_VALUE}
            onPress={() => setOpenPicker('muscle')}
          />
          {activeCount > 0 ? (
            <Pressable
              onPress={onClearAll}
              hitSlop={6}
              style={({ pressed }) => [styles.clearAllBtn, pressed && { opacity: 0.5 }]}
              accessibilityLabel="Clear all filters"
            >
              <Text variant="micro" weight="700" color="secondary">
                Clear
              </Text>
            </Pressable>
          ) : null}
        </View>

        {activeCount > 0 ? (
          <View style={styles.activeChipsRow}>
            {category !== ALL_VALUE ? (
              <ActiveChip
                label={categoryLabel}
                onRemove={() => setCategory(ALL_VALUE)}
              />
            ) : null}
            {muscle !== ALL_VALUE ? (
              <ActiveChip
                label={muscleLabel}
                onRemove={() => setMuscle(ALL_VALUE)}
              />
            ) : null}
          </View>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text variant="bodyLarge" color="danger" weight="600" align="center">
            Could not load exercises
          </Text>
          <Text variant="bodySmall" color="secondary" align="center" style={styles.errorDetail}>
            {error}
          </Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Text variant="bodyLarge" weight="600" align="center">
            No matches
          </Text>
          <Text variant="bodySmall" color="secondary" align="center" style={styles.errorDetail}>
            Try a different category or search term.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={e => e.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={Separator}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footer}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : page?.last && items.length > 0 ? (
              <View style={styles.footer}>
                <Text variant="micro" color="muted">
                  End of list
                </Text>
              </View>
            ) : null
          }
          keyboardShouldPersistTaps="handled"
        />
      )}

      {isSelect && selectedIds.length > 0 ? (
        <View style={[styles.ctaBar, shadows.modal]}>
          <View style={styles.ctaInfo}>
            <Text variant="caption" color="muted">
              Selected
            </Text>
            <Text variant="bodyLarge" weight="700">
              {selectedIds.length} {selectedIds.length === 1 ? 'exercise' : 'exercises'}
            </Text>
          </View>
          <Button
            label="Continue"
            variant="primary"
            size="lg"
            onPress={() => handleContinue(selectedIds)}
          />
        </View>
      ) : null}

      <FilterPickerSheet
        visible={openPicker === 'category'}
        title="Category"
        subtitle="Filter exercises by type"
        options={categoryOptions}
        value={category}
        onSelect={next => {
          setCategory(next);
          setOpenPicker(null);
        }}
        onCancel={() => setOpenPicker(null)}
      />

      <FilterPickerSheet
        visible={openPicker === 'muscle'}
        title="Muscle group"
        subtitle="Filter by primary muscle worked"
        options={muscleOptions}
        value={muscle}
        searchable
        onSelect={next => {
          setMuscle(next);
          setOpenPicker(null);
        }}
        onCancel={() => setOpenPicker(null)}
      />
    </Screen>
  );
}

interface FilterPillProps {
  label: string;
  active: boolean;
  onPress: () => void;
  icon?: React.ReactNode;
}

function FilterPill({ label, active, onPress, icon }: FilterPillProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.pill,
        active && styles.pillActive,
        pressed && { opacity: 0.7 },
      ]}
    >
      {icon}
      <Text
        variant="bodySmall"
        weight="600"
        style={[styles.pillLabel, active && { color: colors.primary }]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <ChevronDown
        size={14}
        color={active ? colors.primary : colors.inkMuted}
        strokeWidth={2.25}
      />
    </Pressable>
  );
}

function ActiveChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <Pressable
      onPress={onRemove}
      hitSlop={4}
      accessibilityLabel={`Remove ${label} filter`}
      style={({ pressed }) => [styles.activeChip, pressed && { opacity: 0.7 }]}
    >
      <Text variant="micro" weight="700" style={{ color: colors.primary }}>
        {label}
      </Text>
      <X size={12} color={colors.primary} strokeWidth={2.5} />
    </Pressable>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

function titleCase(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function extractMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const resp = (err as { response?: { data?: { message?: string } } }).response;
    if (resp?.data?.message) return resp.data.message;
  }
  if (err instanceof Error) return err.message;
  return 'Unknown error';
}

const styles = StyleSheet.create({
  searchWrap: { paddingHorizontal: spacing.xxl, marginBottom: spacing.lg },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchInputContainer: { flex: 1 },
  searchInput: { paddingLeft: spacing.lg },

  filterBar: {
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  filterPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    maxWidth: 180,
  },
  pillActive: {
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
  },
  pillLabel: { flexShrink: 1 },
  clearAllBtn: {
    marginLeft: 'auto',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  activeChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoftStrong,
  },

  listContent: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.huge + 80,
    gap: spacing.md,
  },
  ctaBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  ctaInfo: { flex: 1 },
  separator: { height: spacing.md },

  footer: { paddingVertical: spacing.xl, alignItems: 'center' },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.md,
  },
  errorDetail: { paddingHorizontal: spacing.xl },
});
