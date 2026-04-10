import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { parseRecipeFromUrl, parseIngredientString } from '../services/recipeParser';
import { useRecipes } from '../hooks/useRecipes';
import { Recipe, Ingredient } from '../models/types';
import { RootStackParamList } from '../navigation/AppNavigator';
import uuid from '../utils/uuid';
import { categoriseIngredient } from '../utils/ingredientCategories';

type Nav = StackNavigationProp<RootStackParamList>;
type RouteT = RouteProp<RootStackParamList, 'AddRecipe'>;

type Mode = 'choose' | 'url' | 'photo' | 'manual';

export default function AddRecipeScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<RouteT>();
  const { addRecipe } = useRecipes();

  const [mode, setMode] = useState<Mode>('choose');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  // Manual / confirmed recipe state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | undefined>();
  const [sourceUrl, setSourceUrl] = useState<string | undefined>();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [instructions, setInstructions] = useState<string[]>([]);
  const [newIngredientText, setNewIngredientText] = useState('');
  const [newInstructionText, setNewInstructionText] = useState('');
  const [saving, setSaving] = useState(false);

  // ─── URL flow ───────────────────────────────────────────────────────────────

  const handleFetchUrl = async () => {
    if (!url.trim()) return;
    setLoading(true);
    try {
      const parsed = await parseRecipeFromUrl(url.trim());
      setTitle(parsed.title);
      setDescription(parsed.description);
      setImageUri(parsed.imageUri);
      setSourceUrl(url.trim());
      setIngredients(parsed.ingredients);
      setInstructions(parsed.instructions);
      setMode('manual');
    } catch (err) {
      Alert.alert(
        'Could not parse recipe',
        'Try copying and pasting the ingredients manually instead.',
        [{ text: 'OK', onPress: () => setMode('manual') }]
      );
    } finally {
      setLoading(false);
    }
  };

  // ─── Photo flow ─────────────────────────────────────────────────────────────

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setMode('manual');
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera permission needed', 'Please allow camera access in Settings.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setMode('manual');
    }
  };

  // ─── Save ────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Recipe needs a title', 'Please enter a title before saving.');
      return;
    }
    setSaving(true);
    try {
      const recipe: Recipe = {
        id: uuid(),
        title: title.trim(),
        description: description.trim(),
        imageUri,
        sourceUrl,
        ingredients,
        instructions,
        tags: [],
        dateAdded: new Date().toISOString(),
      };
      await addRecipe(recipe);
      nav.goBack();
    } finally {
      setSaving(false);
    }
  };

  // ─── Ingredient helpers ──────────────────────────────────────────────────────

  const addIngredient = () => {
    const text = newIngredientText.trim();
    if (!text) return;
    const ing = parseIngredientString(text);
    setIngredients((prev) => [...prev, ing]);
    setNewIngredientText('');
  };

  const removeIngredient = (id: string) => {
    setIngredients((prev) => prev.filter((i) => i.id !== id));
  };

  const addInstruction = () => {
    const text = newInstructionText.trim();
    if (!text) return;
    setInstructions((prev) => [...prev, text]);
    setNewInstructionText('');
  };

  const removeInstruction = (idx: number) => {
    setInstructions((prev) => prev.filter((_, i) => i !== idx));
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (mode === 'choose') {
    return (
      <View style={styles.chooseContainer}>
        <Text style={styles.chooseTitle}>Add a Recipe</Text>
        <Text style={styles.chooseSubtitle}>How would you like to add it?</Text>

        <TouchableOpacity style={styles.chooseBtn} onPress={() => setMode('url')}>
          <Text style={styles.chooseBtnIcon}>🔗</Text>
          <View>
            <Text style={styles.chooseBtnTitle}>Add from URL</Text>
            <Text style={styles.chooseBtnSub}>Paste a link and we'll parse the recipe</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.chooseBtn} onPress={() => setMode('photo')}>
          <Text style={styles.chooseBtnIcon}>📸</Text>
          <View>
            <Text style={styles.chooseBtnTitle}>Add from Photo</Text>
            <Text style={styles.chooseBtnSub}>Take or upload a photo of a recipe card</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.chooseBtn} onPress={() => setMode('manual')}>
          <Text style={styles.chooseBtnIcon}>✏️</Text>
          <View>
            <Text style={styles.chooseBtnTitle}>Enter Manually</Text>
            <Text style={styles.chooseBtnSub}>Type in the recipe details yourself</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  if (mode === 'url') {
    return (
      <View style={styles.urlContainer}>
        <Text style={styles.urlTitle}>Paste a recipe URL</Text>
        <TextInput
          style={styles.urlInput}
          placeholder="https://..."
          placeholderTextColor="#aaa"
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          keyboardType="url"
          autoFocus
        />
        {loading ? (
          <ActivityIndicator size="large" color="#FF6B6B" style={{ marginTop: 24 }} />
        ) : (
          <TouchableOpacity
            style={[styles.fetchBtn, !url.trim() && styles.fetchBtnDisabled]}
            onPress={handleFetchUrl}
            disabled={!url.trim()}
          >
            <Text style={styles.fetchBtnText}>Fetch Recipe</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => setMode('choose')} style={styles.backLink}>
          <Text style={styles.backLinkText}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (mode === 'photo') {
    return (
      <View style={styles.photoContainer}>
        <Text style={styles.urlTitle}>Add from Photo</Text>
        <Text style={styles.photoSub}>
          Take a photo of your recipe card, then fill in the details.
        </Text>
        <TouchableOpacity style={styles.photoBtn} onPress={handleTakePhoto}>
          <Text style={styles.photoBtnIcon}>📷</Text>
          <Text style={styles.photoBtnText}>Take a Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.photoBtn} onPress={handlePickPhoto}>
          <Text style={styles.photoBtnIcon}>🖼️</Text>
          <Text style={styles.photoBtnText}>Choose from Library</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setMode('choose')} style={styles.backLink}>
          <Text style={styles.backLinkText}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // manual / confirmed mode
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
        {imageUri && <Image source={{ uri: imageUri }} style={styles.previewImage} />}

        <Text style={styles.fieldLabel}>Title *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Recipe title"
          placeholderTextColor="#aaa"
        />

        <Text style={styles.fieldLabel}>Description</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={description}
          onChangeText={setDescription}
          placeholder="Short description (optional)"
          placeholderTextColor="#aaa"
          multiline
          numberOfLines={3}
        />

        <Text style={styles.fieldLabel}>Ingredients ({ingredients.length})</Text>
        {ingredients.map((ing) => (
          <View key={ing.id} style={styles.listItem}>
            <Text style={styles.listItemText} numberOfLines={1}>
              {[ing.amount, ing.unit, ing.name].filter(Boolean).join(' ')}
            </Text>
            <TouchableOpacity onPress={() => removeIngredient(ing.id)}>
              <Text style={styles.removeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
        <View style={styles.addRow}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            value={newIngredientText}
            onChangeText={setNewIngredientText}
            placeholder="e.g. 2 cloves garlic"
            placeholderTextColor="#aaa"
            onSubmitEditing={addIngredient}
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.addBtn} onPress={addIngredient}>
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.fieldLabel}>Instructions ({instructions.length} steps)</Text>
        {instructions.map((step, idx) => (
          <View key={idx} style={styles.listItem}>
            <Text style={styles.stepNum}>{idx + 1}.</Text>
            <Text style={styles.listItemText} numberOfLines={3}>
              {step}
            </Text>
            <TouchableOpacity onPress={() => removeInstruction(idx)}>
              <Text style={styles.removeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
        <View style={styles.addRow}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            value={newInstructionText}
            onChangeText={setNewInstructionText}
            placeholder="Add a step..."
            placeholderTextColor="#aaa"
            multiline
          />
          <TouchableOpacity style={styles.addBtn} onPress={addInstruction}>
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save Recipe</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  chooseContainer: {
    flex: 1,
    backgroundColor: '#fafafa',
    padding: 24,
    paddingTop: 40,
  },
  chooseTitle: { fontSize: 26, fontWeight: '800', color: '#1a1a1a', marginBottom: 6 },
  chooseSubtitle: { fontSize: 14, color: '#888', marginBottom: 32 },
  chooseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 14,
  },
  chooseBtnIcon: { fontSize: 28 },
  chooseBtnTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 2 },
  chooseBtnSub: { fontSize: 13, color: '#888' },

  urlContainer: {
    flex: 1,
    backgroundColor: '#fafafa',
    padding: 24,
    paddingTop: 40,
  },
  urlTitle: { fontSize: 22, fontWeight: '800', color: '#1a1a1a', marginBottom: 16 },
  urlInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  fetchBtn: {
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  fetchBtnDisabled: { backgroundColor: '#ddd' },
  fetchBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  backLink: { marginTop: 20, alignItems: 'center' },
  backLinkText: { color: '#FF6B6B', fontSize: 15 },

  photoContainer: {
    flex: 1,
    backgroundColor: '#fafafa',
    padding: 24,
    paddingTop: 40,
  },
  photoSub: { fontSize: 14, color: '#666', marginBottom: 28 },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  photoBtnIcon: { fontSize: 28 },
  photoBtnText: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },

  form: { flex: 1, backgroundColor: '#fafafa' },
  formContent: { padding: 16, paddingBottom: 40 },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 16,
    resizeMode: 'cover',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#555',
    marginTop: 16,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 4,
  },
  inputMultiline: { minHeight: 70, textAlignVertical: 'top' },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#eee',
    gap: 8,
  },
  stepNum: { fontSize: 13, fontWeight: '700', color: '#FF6B6B', minWidth: 20 },
  listItemText: { flex: 1, fontSize: 14, color: '#333' },
  removeBtn: { fontSize: 15, color: '#ccc', paddingLeft: 4 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 22, lineHeight: 26 },
  saveBtn: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
