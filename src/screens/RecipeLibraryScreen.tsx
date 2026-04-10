import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useRecipes } from '../hooks/useRecipes';
import RecipeCard from '../components/RecipeCard';
import { RootStackParamList } from '../navigation/AppNavigator';

type Nav = StackNavigationProp<RootStackParamList>;
type RouteT = RouteProp<RootStackParamList, 'RecipePicker'>;

interface Props {
  pickerMode?: boolean;
}

export default function RecipeLibraryScreen({ pickerMode }: Props) {
  const nav = useNavigation<Nav>();
  const route = useRoute<RouteT>();
  const { recipes, loading, loadRecipes } = useRecipes();
  const [search, setSearch] = useState('');

  // In picker mode the route has onSelect callback
  const onSelect = pickerMode ? route.params?.onSelect : undefined;

  useFocusEffect(
    useCallback(() => {
      loadRecipes();
    }, [loadRecipes])
  );

  const filtered = recipes.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase())
  );

  const handlePress = (id: string) => {
    if (pickerMode && onSelect) {
      onSelect(id);
      nav.goBack();
    } else {
      nav.navigate('RecipeDetail', { recipeId: id });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search recipes..."
          placeholderTextColor="#aaa"
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF6B6B" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🍳</Text>
          <Text style={styles.emptyTitle}>No recipes yet</Text>
          <Text style={styles.emptySubtitle}>
            Add a recipe by tapping the + button
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => (
            <RecipeCard recipe={item} onPress={() => handlePress(item.id)} />
          )}
          contentContainerStyle={styles.list}
        />
      )}

      {!pickerMode && (
        <TouchableOpacity style={styles.fab} onPress={() => nav.navigate('AddRecipe', {})}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function RecipePickerScreen() {
  return <RecipeLibraryScreen pickerMode />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  searchBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 15,
    color: '#1a1a1a',
  },
  list: { paddingVertical: 8, paddingBottom: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: '#888', textAlign: 'center' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B6B',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 30, lineHeight: 34 },
});
