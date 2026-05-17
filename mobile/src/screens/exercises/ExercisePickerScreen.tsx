import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, Search, X } from 'lucide-react-native';
import { colors, shadows, spacing } from '../../theme';
import {
  Button,
  Chip,
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

const PAGE_SIZE = 30;
const ALL = 'All';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ExercisePicker'>;
type Route = RouteProp<RootStackParamList, 'ExercisePicker'>;

export function ExercisePickerScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const mode = route.params?.mode ?? 'select';
  const isSelect = mode === 'select';

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const toggleSelected = useCallback((id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  }, []);

  const [searchInput, setSearchInput] = useState('');
  const debouncedQuery = useDebouncedValue(searchInput, 300);

  const [category, setCategory] = useState<string>(ALL);
  const [facets, setFacets] = useState<ExerciseFacets>({ categories: [], levels: [] });

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
        category: category === ALL ? undefined : category,
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
  }, [category, debouncedQuery]);

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
        category: category === ALL ? undefined : category,
        q: debouncedQuery.trim() || undefined,
      });
      setItems(prev => prev.concat(next.content));
      setPage(next);
    } catch (err) {
      setError(extractMessage(err));
    } finally {
      setLoadingMore(false);
    }
  }, [page, category, debouncedQuery, loading, loadingMore]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchFirstPage();
    } finally {
      setRefreshing(false);
    }
  }, [fetchFirstPage]);

  const categoryOptions = useMemo(() => [ALL, ...facets.categories], [facets.categories]);

  const renderItem = useCallback(
    ({ item }: { item: ExerciseSummary }) => (
      <ExerciseRow
        exercise={item}
        selectable={isSelect}
        selected={isSelect && selectedIds.includes(item.id)}
        onPress={() => {
          if (isSelect) toggleSelected(item.id);
        }}
      />
    ),
    [isSelect, selectedIds, toggleSelected],
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

      <FlatList
        horizontal
        data={categoryOptions}
        keyExtractor={c => c}
        renderItem={({ item }) => (
          <Chip
            label={titleCase(item)}
            selected={item === category}
            onPress={() => setCategory(item)}
          />
        )}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        style={styles.chipsList}
      />

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
            onPress={() => navigation.navigate('CreateTemplate', { exerciseIds: selectedIds })}
          />
        </View>
      ) : null}
    </Screen>
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

  chipsList: { flexGrow: 0, marginBottom: spacing.xl },
  chipsRow: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xs,
    gap: spacing.md,
    alignItems: 'center',
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
