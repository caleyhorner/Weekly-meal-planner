import { IngredientCategory } from '../models/types';

const CATEGORY_KEYWORDS: Record<IngredientCategory, string[]> = {
  Produce: [
    'apple', 'apples', 'banana', 'bananas', 'berry', 'berries', 'broccoli', 'cabbage',
    'capsicum', 'carrot', 'carrots', 'celery', 'cherry', 'cherries', 'chilli', 'chili',
    'coriander', 'corn', 'cucumber', 'eggplant', 'fennel', 'garlic', 'ginger', 'grape',
    'grapes', 'herbs', 'kale', 'leek', 'lemon', 'lemons', 'lettuce', 'lime', 'limes',
    'mango', 'mushroom', 'mushrooms', 'onion', 'onions', 'orange', 'oranges', 'parsley',
    'parsnip', 'pea', 'peas', 'pepper', 'peppers', 'potato', 'potatoes', 'pumpkin',
    'radish', 'shallot', 'shallots', 'silverbeet', 'spinach', 'spring onion', 'squash',
    'strawberry', 'strawberries', 'sweet potato', 'tomato', 'tomatoes', 'zucchini',
    'avocado', 'beetroot', 'bok choy', 'broccolini', 'cauliflower', 'courgette',
    'kiwi', 'lemons', 'lime', 'mint', 'basil', 'thyme', 'rosemary', 'sage', 'dill',
    'chives', 'cilantro', 'jalapeño',
  ],
  'Meat & Seafood': [
    'bacon', 'beef', 'chicken', 'chorizo', 'cod', 'crab', 'duck', 'fish', 'ham',
    'lamb', 'mince', 'mussels', 'pork', 'prawn', 'prawns', 'salmon', 'sausage',
    'sausages', 'scallops', 'shrimp', 'snapper', 'steak', 'tuna', 'turkey', 'veal',
    'venison', 'anchovy', 'anchovies', 'sardines', 'trout', 'bream', 'barramundi',
    'meatballs', 'salami', 'prosciutto', 'pancetta', 'ribs',
  ],
  'Dairy & Eggs': [
    'butter', 'brie', 'camembert', 'cheddar', 'cheese', 'cream', 'cream cheese',
    'egg', 'eggs', 'feta', 'ghee', 'gouda', 'greek yoghurt', 'halloumi', 'milk',
    'mozzarella', 'parmesan', 'ricotta', 'sour cream', 'yoghurt', 'yogurt',
    'double cream', 'mascarpone', 'cottage cheese', 'whipping cream', 'crème fraîche',
  ],
  Pantry: [
    'almond', 'almonds', 'arborio', 'barley', 'bean', 'beans', 'bread crumbs',
    'breadcrumbs', 'brown sugar', 'cannellini', 'cashew', 'cashews', 'chickpea',
    'chickpeas', 'chocolate', 'cocoa', 'coconut milk', 'couscous', 'flour',
    'honey', 'lentil', 'lentils', 'maple syrup', 'noodle', 'noodles', 'oat',
    'oats', 'oil', 'olive oil', 'pasta', 'peanut', 'peanuts', 'pearl barley',
    'pine nuts', 'polenta', 'quinoa', 'rice', 'semolina', 'sesame', 'stock',
    'sugar', 'sunflower seeds', 'tinned tomatoes', 'canned tomatoes', 'tomato paste',
    'vinegar', 'walnut', 'walnuts', 'yeast', 'baking powder', 'baking soda',
    'bicarbonate', 'caster sugar', 'icing sugar', 'vanilla', 'cornstarch',
    'cornflour', 'rolled oats',
  ],
  Frozen: [
    'frozen', 'ice cream', 'frozen peas', 'frozen corn', 'frozen berries',
    'frozen fish', 'frozen chips',
  ],
  Bakery: [
    'baguette', 'bread', 'brioche', 'ciabatta', 'crumpet', 'focaccia', 'loaf',
    'naan', 'pita', 'pitta', 'roll', 'rolls', 'sourdough', 'tortilla', 'tortillas',
    'wrap', 'wraps', 'croissant', 'bagel',
  ],
  Beverages: [
    'beer', 'broth', 'cider', 'coconut water', 'coffee', 'juice', 'kombucha',
    'milk', 'sparkling water', 'stock', 'tea', 'water', 'wine', 'red wine',
    'white wine', 'vegetable stock', 'chicken stock', 'beef stock',
  ],
  Condiments: [
    'bbq sauce', 'chutney', 'fish sauce', 'hoisin', 'hot sauce', 'ketchup',
    'mayo', 'mayonnaise', 'mustard', 'oyster sauce', 'relish', 'sambal',
    'soy sauce', 'sriracha', 'tahini', 'tamari', 'teriyaki', 'tomato sauce',
    'worcestershire', 'dijon', 'aioli', 'pesto', 'harissa',
  ],
  'Spices & Herbs': [
    'allspice', 'bay leaf', 'bay leaves', 'black pepper', 'cardamom', 'cayenne',
    'cinnamon', 'cloves', 'cumin', 'curry powder', 'fennel seeds', 'five spice',
    'garlic powder', 'garam masala', 'ground coriander', 'ground cumin', 'mixed spice',
    'nutmeg', 'onion powder', 'oregano', 'paprika', 'salt', 'star anise',
    'sumac', 'turmeric', 'white pepper', 'smoked paprika', 'chilli flakes',
    'dried chilli', 'dried herbs', 'za\'atar',
  ],
  Other: [],
};

export function categoriseIngredient(name: string): IngredientCategory {
  const lower = name.toLowerCase();

  // Beverages check before Pantry (stock/milk appear in both)
  // Frozen first because "frozen peas" should be Frozen not Produce
  for (const category of [
    'Frozen',
    'Meat & Seafood',
    'Dairy & Eggs',
    'Bakery',
    'Produce',
    'Condiments',
    'Spices & Herbs',
    'Beverages',
    'Pantry',
  ] as IngredientCategory[]) {
    const keywords = CATEGORY_KEYWORDS[category];
    if (keywords.some((kw) => lower.includes(kw))) {
      return category;
    }
  }

  return 'Other';
}
