import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useMealPlan } from '../hooks/useMealPlan';
import { useRecipes } from '../hooks/useRecipes';
import DayCard from '../components/DayCard';
import { DayPlan } from '../models/types';
import { RootStackParamList } from '../navigation/AppNavigator';
import { formatShortDate } from '../utils/dates';

type Nav = StackNavigationProp<RootStackParamList>;

export default function WeekPlannerScreen() {
  const nav = useNavigation<Nav>();
  const { plan, loading: planLoading, loadPlan, setDayRecipe, toggleSkip, clearDay, plannedCount } =
    useMealPlan();
  const { recipes, loadRecipes } = useRecipes();

  useFocusEffect(
    useCallback(() => {
      loadPlan();
      loadRecipes();
    }, [loadPlan, loadRecipes])
  );

  const recipeMap = new Map(recipes.map((r) => [r.id, r]));
  const days = plan ? Object.values(plan.days).sort((a, b) => a.date.localeCompare(b.date)) : [];

  const handleSelectRecipe = (date: string) => {
    nav.navigate('RecipePicker', { onSelect: (id: string) => setDayRecipe(date, id) });
  };

  const handleShoppingList = () => {
    if (!plan) return;
    nav.navigate('ShoppingList', { weekPlanId: plan.id });
  };

  if (planLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  const weekLabel = plan ? `Week of ${formatShortDate(plan.weekStartDate)}` : '';

  return (
    <View style={styles.container}>
      <FlatList
        data={days}
        keyExtractor={(item) => item.date}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <Text style={styles.title}>Dinner Planner</Text>
            <Text style={styles.subtitle}>{weekLabel}</Text>
          </View>
        }
        renderItem={({ item }: { item: DayPlan }) => (
          <DayCard
            dayPlan={item}
            recipe={item.recipeId ? (recipeMap.get(item.recipeId) ?? null) : null}
            onPress={() => handleSelectRecipe(item.date)}
            onToggleSkip={() => toggleSkip(item.date)}
            onClear={() => clearDay(item.date)}
          />
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.shoppingBtn, plannedCount === 0 && styles.shoppingBtnDisabled]}
              onPress={handleShoppingList}
              disabled={plannedCount === 0}
            >
              <Text style={styles.shoppingBtnText}>
                Generate Shopping List ({plannedCount} meals)
              </Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingBottom: 32 },
  headerBlock: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  shoppingBtn: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  shoppingBtnDisabled: {
    backgroundColor: '#ddd',
  },
  shoppingBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
