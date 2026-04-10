import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
} from 'react-native';
import { DayPlan, Recipe } from '../models/types';
import { formatDayName, formatShortDate } from '../utils/dates';

interface Props {
  dayPlan: DayPlan;
  recipe: Recipe | null;
  onPress: () => void;
  onToggleSkip: () => void;
  onClear: () => void;
}

export default function DayCard({ dayPlan, recipe, onPress, onToggleSkip, onClear }: Props) {
  const isSkip = dayPlan.status === 'skip';

  return (
    <View style={[styles.card, isSkip && styles.cardSkip]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.dayName}>{formatDayName(dayPlan.date)}</Text>
          <Text style={styles.date}>{formatShortDate(dayPlan.date)}</Text>
        </View>
        <View style={styles.skipRow}>
          <Text style={styles.skipLabel}>Skip</Text>
          <Switch
            value={isSkip}
            onValueChange={onToggleSkip}
            trackColor={{ false: '#ddd', true: '#aaa' }}
            thumbColor={isSkip ? '#666' : '#FF6B6B'}
          />
        </View>
      </View>

      {!isSkip && (
        <TouchableOpacity
          style={[styles.mealSlot, recipe && styles.mealSlotFilled]}
          onPress={onPress}
          activeOpacity={0.7}
        >
          {recipe ? (
            <View style={styles.recipeRow}>
              <Text style={styles.recipeTitle} numberOfLines={1}>
                {recipe.title}
              </Text>
              <TouchableOpacity onPress={onClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.clearBtn}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.placeholder}>+ Tap to select a recipe</Text>
          )}
        </TouchableOpacity>
      )}

      {isSkip && (
        <View style={styles.skipBadge}>
          <Text style={styles.skipBadgeText}>Eating out / Leftovers / Takeaway</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardSkip: {
    backgroundColor: '#f5f5f5',
    opacity: 0.8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dayName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  date: {
    fontSize: 12,
    color: '#888',
    marginTop: 1,
  },
  skipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  skipLabel: {
    fontSize: 13,
    color: '#666',
  },
  mealSlot: {
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  mealSlotFilled: {
    borderStyle: 'solid',
    borderColor: '#FF6B6B',
    backgroundColor: '#fff5f5',
  },
  placeholder: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
  },
  recipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recipeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  clearBtn: {
    fontSize: 16,
    color: '#aaa',
    paddingLeft: 8,
  },
  skipBadge: {
    backgroundColor: '#e8e8e8',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  skipBadgeText: {
    color: '#777',
    fontSize: 13,
  },
});
