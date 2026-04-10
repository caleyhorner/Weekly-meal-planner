import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { getWeekPlan } from '../services/database';
import { getAllRecipes } from '../services/database';
import {
  buildShoppingList,
  formatShoppingListText,
  exportShoppingList,
  ShoppingCategory,
} from '../services/shoppingList';
import { WeekPlan, Recipe } from '../models/types';
import ShoppingCategorySection from '../components/ShoppingCategory';
import { RootStackParamList } from '../navigation/AppNavigator';

type RouteT = RouteProp<RootStackParamList, 'ShoppingList'>;

export default function ShoppingListScreen() {
  const route = useRoute<RouteT>();
  const { weekPlanId } = route.params;

  const [categories, setCategories] = useState<ShoppingCategory[]>([]);
  const [plan, setPlan] = useState<WeekPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [allPlans, recipes] = await Promise.all([
          getAllPlansAndFind(weekPlanId),
          getAllRecipes(),
        ]);
        if (allPlans) {
          setPlan(allPlans);
          setCategories(buildShoppingList(allPlans, recipes));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [weekPlanId]);

  const toggleItem = (key: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleExport = async () => {
    if (!plan) return;
    setExporting(true);
    try {
      const text = formatShoppingListText(categories, plan.weekStartDate);
      await exportShoppingList(text);
    } catch {
      Alert.alert('Export failed', 'Could not open the share sheet. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const totalItems = categories.reduce((sum, c) => sum + c.items.length, 0);
  const checkedCount = checked.size;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  if (categories.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>🛒</Text>
        <Text style={styles.emptyTitle}>No ingredients yet</Text>
        <Text style={styles.emptySubtitle}>Select meals in the planner to generate your list.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={categories}
        keyExtractor={(c) => c.category}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.progress}>
              {checkedCount} of {totalItems} items checked
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <ShoppingCategorySection
            category={item}
            checked={checked}
            onToggle={toggleItem}
          />
        )}
        contentContainerStyle={styles.list}
      />

      <View style={styles.exportBar}>
        <TouchableOpacity
          style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
          onPress={handleExport}
          disabled={exporting}
        >
          {exporting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.exportBtnText}>Share to Notes / Reminders</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Helper: we stored the weekPlanId as the plan's id, but we fetch by weekStartDate.
// So we load all and find by id.
async function getAllPlansAndFind(id: string): Promise<WeekPlan | null> {
  // We stored the id in the plan; re-fetch by trying common week start dates
  // Simpler: store weekStartDate in route params instead.
  // For now we load recent weeks by brute-force (stored as YYYY-MM-DD Saturday dates).
  const today = new Date();
  for (let offset = -4; offset <= 1; offset++) {
    const sat = new Date(today);
    const day = today.getDay();
    const diff = day === 6 ? 0 : -(day + 1);
    sat.setDate(today.getDate() + diff + offset * 7);
    const iso = `${sat.getFullYear()}-${String(sat.getMonth() + 1).padStart(2, '0')}-${String(sat.getDate()).padStart(2, '0')}`;
    const plan = await import('../services/database').then((db) => db.getWeekPlan(iso));
    if (plan && plan.id === id) return plan;
  }
  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: '#888', textAlign: 'center' },
  listHeader: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  progress: { fontSize: 13, color: '#888' },
  list: { paddingBottom: 100 },
  exportBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fafafa',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    padding: 16,
  },
  exportBtn: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  exportBtnDisabled: { opacity: 0.6 },
  exportBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
