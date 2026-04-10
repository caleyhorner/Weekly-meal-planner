import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Recipe } from '../models/types';

interface Props {
  recipe: Recipe;
  onPress: () => void;
  selected?: boolean;
}

export default function RecipeCard({ recipe, onPress, selected }: Props) {
  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {recipe.imageUri ? (
        <Image source={{ uri: recipe.imageUri }} style={styles.image} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imagePlaceholderText}>🍽️</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {recipe.title}
        </Text>
        {recipe.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {recipe.description}
          </Text>
        ) : null}
        <Text style={styles.meta}>{recipe.ingredients.length} ingredients</Text>
      </View>
      {selected && (
        <View style={styles.checkBadge}>
          <Text style={styles.checkText}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  image: {
    width: 90,
    height: 90,
  },
  imagePlaceholder: {
    width: 90,
    height: 90,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: 32,
  },
  info: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  meta: {
    fontSize: 12,
    color: '#aaa',
  },
  checkBadge: {
    width: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
  },
  checkText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
