import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text } from 'react-native';

import WeekPlannerScreen from '../screens/WeekPlannerScreen';
import RecipeLibraryScreen, { RecipePickerScreen } from '../screens/RecipeLibraryScreen';
import AddRecipeScreen from '../screens/AddRecipeScreen';
import RecipeDetailScreen from '../screens/RecipeDetailScreen';
import ShoppingListScreen from '../screens/ShoppingListScreen';

// ─── Type definitions ────────────────────────────────────────────────────────

export type RootStackParamList = {
  // Tabs
  PlannerTab: undefined;
  LibraryTab: undefined;

  // Planner stack
  Planner: undefined;
  RecipePicker: { onSelect: (id: string) => void };
  ShoppingList: { weekPlanId: string };

  // Library stack
  Library: undefined;
  AddRecipe: Record<string, never>;
  RecipeDetail: { recipeId: string };
};

const Tab = createBottomTabNavigator();
const PlannerStack = createStackNavigator<RootStackParamList>();
const LibraryStack = createStackNavigator<RootStackParamList>();

function PlannerStackNav() {
  return (
    <PlannerStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontWeight: '700' },
        headerTintColor: '#FF6B6B',
      }}
    >
      <PlannerStack.Screen
        name="Planner"
        component={WeekPlannerScreen}
        options={{ headerShown: false }}
      />
      <PlannerStack.Screen
        name="RecipePicker"
        component={RecipePickerScreen}
        options={{ title: 'Choose a Recipe', presentation: 'modal' }}
      />
      <PlannerStack.Screen
        name="ShoppingList"
        component={ShoppingListScreen}
        options={{ title: 'Shopping List' }}
      />
    </PlannerStack.Navigator>
  );
}

function LibraryStackNav() {
  return (
    <LibraryStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontWeight: '700' },
        headerTintColor: '#FF6B6B',
      }}
    >
      <LibraryStack.Screen
        name="Library"
        component={RecipeLibraryScreen}
        options={{ title: 'Recipe Library' }}
      />
      <LibraryStack.Screen
        name="AddRecipe"
        component={AddRecipeScreen}
        options={{ title: 'Add Recipe' }}
      />
      <LibraryStack.Screen
        name="RecipeDetail"
        component={RecipeDetailScreen}
        options={{ title: '' }}
      />
    </LibraryStack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#FF6B6B',
          tabBarInactiveTintColor: '#aaa',
          tabBarStyle: {
            backgroundColor: '#fff',
            borderTopColor: '#eee',
          },
          tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        }}
      >
        <Tab.Screen
          name="PlannerTab"
          component={PlannerStackNav}
          options={{
            tabBarLabel: 'This Week',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📅</Text>,
          }}
        />
        <Tab.Screen
          name="LibraryTab"
          component={LibraryStackNav}
          options={{
            tabBarLabel: 'Recipes',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📖</Text>,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
