import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { getRecipeById } from '../services/database';
import { useRecipes } from '../hooks/useRecipes';
import { Recipe } from '../models/types';
import { RootStackParamList } from '../navigation/AppNavigator';

type Nav = StackNavigationProp<RootStackParamList>;
type RouteT = RouteProp<RootStackParamList, 'RecipeDetail'>;

export default function RecipeDetailScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<RouteT>();
  const { recipeId } = route.params;
  const { removeRecipe } = useRecipes();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRecipeById(recipeId).then((r) => {
      setRecipe(r);
      setLoading(false);
    });
  }, [recipeId]);

  useEffect(() => {
    if (recipe) {
      nav.setOptions({
        title: recipe.title,
        headerRight: () => (
          <TouchableOpacity
            onPress={handleDelete}
            style={{ paddingRight: 16 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={{ color: '#FF3B30', fontSize: 15 }}>Delete</Text>
          </TouchableOpacity>
        ),
      });
    }
  }, [recipe]);

  const handleDelete = () => {
    Alert.alert('Delete Recipe', 'Are you sure you want to delete this recipe?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await removeRecipe(recipeId);
          nav.goBack();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  if (!recipe) {
    return (
      <View style={styles.center}>
        <Text>Recipe not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {recipe.imageUri ? (
        <Image source={{ uri: recipe.imageUri }} style={styles.hero} />
      ) : (
        <View style={styles.heroPlaceholder}>
          <Text style={styles.heroEmoji}>🍽️</Text>
        </View>
      )}

      <View style={styles.body}>
        <Text style={styles.title}>{recipe.title}</Text>

        {recipe.description ? (
          <Text style={styles.description}>{recipe.description}</Text>
        ) : null}

        {recipe.sourceUrl ? (
          <TouchableOpacity onPress={() => Linking.openURL(recipe.sourceUrl!)}>
            <Text style={styles.link}>View original recipe ↗</Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ingredients ({recipe.ingredients.length})</Text>
          {recipe.ingredients.map((ing) => (
            <View key={ing.id} style={styles.ingredientRow}>
              <View style={styles.bullet} />
              <Text style={styles.ingredientText}>
                {[ing.amount, ing.unit, ing.name].filter(Boolean).join(' ')}
              </Text>
              <Text style={styles.categoryTag}>{ing.category}</Text>
            </View>
          ))}
        </View>

        {recipe.instructions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Instructions</Text>
            {recipe.instructions.map((step, idx) => (
              <View key={idx} style={styles.stepRow}>
                <Text style={styles.stepNum}>{idx + 1}</Text>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { paddingBottom: 40 },
  hero: { width: '100%', height: 220, resizeMode: 'cover' },
  heroPlaceholder: {
    width: '100%',
    height: 160,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroEmoji: { fontSize: 64 },
  body: { padding: 16 },
  title: { fontSize: 24, fontWeight: '800', color: '#1a1a1a', marginBottom: 8 },
  description: { fontSize: 15, color: '#555', lineHeight: 22, marginBottom: 10 },
  link: { color: '#FF6B6B', fontSize: 14, marginBottom: 16 },
  section: { marginTop: 24 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 10,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF6B6B',
  },
  ingredientText: { flex: 1, fontSize: 14, color: '#333' },
  categoryTag: {
    fontSize: 11,
    color: '#aaa',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: 14,
    gap: 12,
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF6B6B',
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 24,
  },
  stepText: { flex: 1, fontSize: 14, color: '#333', lineHeight: 21 },
});
