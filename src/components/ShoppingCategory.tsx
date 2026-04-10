import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ShoppingCategory as SCType } from '../services/shoppingList';
import { Ingredient } from '../models/types';

const CATEGORY_EMOJI: Record<string, string> = {
  Produce: '🥦',
  'Meat & Seafood': '🥩',
  'Dairy & Eggs': '🥛',
  Pantry: '🥫',
  Frozen: '❄️',
  Bakery: '🍞',
  Beverages: '🥤',
  Condiments: '🫙',
  'Spices & Herbs': '🌿',
  Other: '🛍️',
};

interface Props {
  category: SCType;
  checked: Set<string>;
  onToggle: (key: string) => void;
}

export default function ShoppingCategorySection({ category, checked, onToggle }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const emoji = CATEGORY_EMOJI[category.category] ?? '🛍️';
  const doneCount = category.items.filter((i) => checked.has(itemKey(i))).length;

  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setCollapsed((c) => !c)}
        activeOpacity={0.7}
      >
        <Text style={styles.headerEmoji}>{emoji}</Text>
        <Text style={styles.headerTitle}>{category.category}</Text>
        <Text style={styles.headerCount}>
          {doneCount}/{category.items.length}
        </Text>
        <Text style={styles.chevron}>{collapsed ? '▶' : '▼'}</Text>
      </TouchableOpacity>

      {!collapsed &&
        category.items.map((ing) => {
          const key = itemKey(ing);
          const done = checked.has(key);
          return (
            <TouchableOpacity
              key={key}
              style={styles.item}
              onPress={() => onToggle(key)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, done && styles.checkboxDone]}>
                {done && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={[styles.itemText, done && styles.itemTextDone]}>
                {[ing.amount, ing.unit, ing.name].filter(Boolean).join(' ')}
              </Text>
            </TouchableOpacity>
          );
        })}
    </View>
  );
}

function itemKey(ing: Ingredient): string {
  return `${ing.name}__${ing.amount}__${ing.unit}`;
}

const styles = StyleSheet.create({
  section: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerEmoji: { fontSize: 20 },
  headerTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  headerCount: { fontSize: 13, color: '#aaa' },
  chevron: { fontSize: 11, color: '#bbb', marginLeft: 4 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#f9f9f9',
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxDone: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FF6B6B',
  },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  itemText: { flex: 1, fontSize: 14, color: '#333' },
  itemTextDone: { color: '#bbb', textDecorationLine: 'line-through' },
});
