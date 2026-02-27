// src/utils/categories.ts

// Define the structure for our grouped categories
export interface CategoryGroup {
  parent: string;
  items: string[];
}

// The complete, categorized inventory list requested by the client
export const POS_CATEGORIES: CategoryGroup[] = [
  {
    parent: "🏪 Food & Beverage",
    items: [
      "Beverages",
      "Ice Cream",
      "Bakery",
      "Biscuits & Snacks",
      "Candy & Confectionery"
    ]
  },
  {
    parent: "🥫 Groceries & Cooking",
    items: [
      "Grocery (Dry Food)",
      "Rice & Flour",
      "Cooking Essentials",
      "Canned Food",
      "Instant Food",
      "Spices & Seasoning",
      "Sauces & Condiments",
      "Breakfast & Hot Drinks"
    ]
  },
  {
    parent: "❄️ Fresh & Frozen",
    items: [
      "Frozen Meat",
      "Frozen Fish & Seafood",
      "Frozen Ready Food",
      "Fresh Produce",
      "Dairy Products"
    ]
  },
  {
    parent: "💊 Health, Beauty & Baby",
    items: [
      "Personal Care",
      "Body Care",
      "Skin Care & Beauty",
      "Baby Care",
      "Medicine"
    ]
  },
  {
    parent: "🏠 Home & Living",
    items: [
      "Household Cleaning",
      "Laundry",
      "Tissue & Paper",
      "Kitchenware",
      "Hardware & Tools",
      "Electrical & Battery",
      "Stationery",
      "Toys & General Items",
      "Pet Food"
    ]
  },
  {
    parent: "🚬 Tobacco",
    items: [
      "Cigarette & Tobacco"
    ]
  }
];