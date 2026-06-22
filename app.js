/* ============================================================
   FitTrack — gym + calorie tracker PWA
   All data lives in localStorage on this device only.
============================================================ */

const STORE_KEY = "fittrack_v1";

const DEFAULT_DATA = {
  goals: {
    calories: 1800, protein: 120, carbs: 180, fat: 60, weight: 75,
    startWeight: 75, targetWeight: 65, weeklyRate: 0.5, startDate: "",
    cardioGoal: 175, stepsGoal: 9000, strengthGoal: 3, stepKcalPer1000: 39, waterGoal: 3000,
  },
  days: {},     // { "2026-06-01": { workouts: [], meals: [], cardio: [] } }
  weights: [],  // [{ date: "2026-06-01", kg: 75 }]
  expenses: [], // [{ id, date: "2026-06-01", amount, category, sub, note }]
  trips: [],    // [{ id, name, startDate, endDate, note, items: [{ id, date, amount, category, note }] }]
  customFoods: [], // foods the user typed that weren't in the list: [{ n, unit, base, cal, p, c, f }]
  favorites: [],   // pinned foods for quick logging: [{ n, unit, base, cal, p, c, f }]
  currency: "₹",
};

const EXPENSE_CATEGORIES = ["Travel", "Randoms", "Sports"];
const TRAVEL_SUBS = ["Metro", "Bus", "Auto", "Other"];
const TRIP_CATEGORIES = ["Travel", "Stay", "Food", "Activities", "Shopping", "Other"];

/* cardio activities + MET values for calorie estimation */
const CARDIO_OPTIONS = [
  { name: "Walking (brisk)", met: 4.3 },
  { name: "Jogging", met: 7.0 },
  { name: "Running", met: 9.8 },
  { name: "Cycling", met: 7.5 },
  { name: "Swimming", met: 7.0 },
  { name: "Rowing", met: 7.0 },
  { name: "Elliptical", met: 5.0 },
  { name: "Stair climber", met: 8.0 },
  { name: "HIIT", met: 8.0 },
  { name: "Jump rope", met: 11.0 },
  { name: "Dancing", met: 5.0 },
  { name: "Yoga", met: 3.0 },
  { name: "Pilates", met: 3.0 },
  // sports & games
  { name: "Pickleball", met: 5.5 },
  { name: "Cricket", met: 5.0 },
  { name: "Bowling", met: 3.8 },
  { name: "Tennis", met: 7.3 },
  { name: "Badminton", met: 5.5 },
  { name: "Table tennis", met: 4.0 },
  { name: "Squash", met: 7.3 },
  { name: "Basketball", met: 6.5 },
  { name: "Football (soccer)", met: 7.0 },
  { name: "Volleyball", met: 4.0 },
  { name: "Frisbee / throwball", met: 3.0 },
  { name: "Golf (walking)", met: 4.8 },
  { name: "Skating", met: 7.0 },
  { name: "Hiking / trekking", met: 6.0 },
  { name: "Boxing (bag/pads)", met: 7.8 },
  { name: "Martial arts", met: 10.0 },
  { name: "Rock climbing", met: 8.0 },
  { name: "Skiing", met: 7.0 },
];

/* exercises grouped by workout type — the picker prioritises the chosen day's moves */
const EXERCISES_BY_TYPE = {
  Push: [
    "Bench press", "Incline bench press", "Dumbbell press", "Incline dumbbell press",
    "Chest fly", "Cable crossover", "Push-up", "Dips (chest)",
    "Overhead press", "Dumbbell shoulder press", "Arnold press", "Lateral raise",
    "Front raise", "Tricep pushdown", "Tricep extension", "Skull crusher", "Dips (triceps)",
  ],
  Pull: [
    "Deadlift", "Pull-up", "Chin-up", "Lat pulldown", "Barbell row", "Dumbbell row",
    "Seated cable row", "T-bar row", "Face pull", "Rear delt fly", "Shrug", "Upright row",
    "Bicep curl", "Hammer curl", "Preacher curl", "Concentration curl",
  ],
  Legs: [
    "Squat", "Front squat", "Leg press", "Lunge", "Bulgarian split squat",
    "Leg extension", "Leg curl", "Calf raise", "Hip thrust", "Goblet squat", "Romanian deadlift",
  ],
  Functional: [
    "Burpee", "Kettlebell swing", "Box jump", "Battle ropes", "Farmer's carry",
    "Clean and press", "Thruster", "Wall ball", "Jump squat", "Jumping jacks", "Mountain climber",
  ],
  Abs: [
    "Plank", "Side plank", "Plank shoulder taps", "Plank jacks", "Hollow hold", "Wall sit",
    "Crunch", "Reverse crunch", "Oblique crunch", "Bicycle crunch", "Cable crunch",
    "Sit-up", "Decline sit-up", "V-up", "Jackknife", "Toe touches",
    "Leg raise", "Hanging leg raise", "Hanging knee raise", "Captain's chair knee raise",
    "Flutter kicks", "Scissor kicks", "Heel taps", "Russian twist", "Windshield wipers",
    "Mountain climber", "Dead bug", "Bird dog", "Boat pose", "Cable woodchopper",
    "Ab rollout", "Ab wheel", "Toes to bar", "Dragon flag", "L-sit",
  ],
};
// full flat list (every exercise, de-duplicated) — used for "Full body" and as fallback
const EXERCISES = [...new Set([].concat(...Object.values(EXERCISES_BY_TYPE)))];

/* ============================================================
   FOOD DATABASE (offline)
   Each entry: nutrition for `base` amount of `unit`.
   unit "g"/"ml" use base 100; everything else uses base 1 (a count).
   cal/p/c/f = kcal, protein g, carbs g, fat g for that base amount.
============================================================ */
const FOODS = [
  // proteins (vegetarian)
  { n: "Paneer", unit: "g", base: 100, cal: 265, p: 18, c: 1.2, f: 21 },
  { n: "Tofu (firm)", unit: "g", base: 100, cal: 144, p: 15, c: 3, f: 9 },
  { n: "Soya chunks (cooked)", unit: "g", base: 100, cal: 145, p: 14, c: 9, f: 0.5 },
  { n: "Tempeh", unit: "g", base: 100, cal: 192, p: 20, c: 8, f: 11 },
  { n: "Greek yogurt (non-fat)", unit: "g", base: 100, cal: 59, p: 10, c: 3.6, f: 0.4 },
  { n: "Cottage cheese (low-fat)", unit: "g", base: 100, cal: 72, p: 12, c: 3, f: 1 },
  { n: "Whey protein", unit: "scoop (30g)", base: 1, cal: 120, p: 24, c: 3, f: 1.5 },
  { n: "Lentils (cooked)", unit: "g", base: 100, cal: 116, p: 9, c: 20, f: 0.4 },
  { n: "Chickpeas (cooked)", unit: "g", base: 100, cal: 164, p: 9, c: 27, f: 2.6 },
  { n: "Black beans (cooked)", unit: "g", base: 100, cal: 132, p: 9, c: 24, f: 0.5 },
  { n: "Kidney beans (cooked)", unit: "g", base: 100, cal: 127, p: 9, c: 22, f: 0.5 },
  { n: "Edamame", unit: "g", base: 100, cal: 121, p: 12, c: 9, f: 5 },
  // grains / carbs
  { n: "White rice (cooked)", unit: "g", base: 100, cal: 130, p: 2.7, c: 28, f: 0.3 },
  { n: "Brown rice (cooked)", unit: "g", base: 100, cal: 123, p: 2.7, c: 26, f: 1 },
  { n: "Pasta (cooked)", unit: "g", base: 100, cal: 158, p: 6, c: 31, f: 0.9 },
  { n: "Quinoa (cooked)", unit: "g", base: 100, cal: 120, p: 4.4, c: 21, f: 1.9 },
  { n: "Couscous (cooked)", unit: "g", base: 100, cal: 112, p: 3.8, c: 23, f: 0.2 },
  { n: "Oats (dry)", unit: "g", base: 100, cal: 389, p: 17, c: 66, f: 7 },
  { n: "Potato (boiled)", unit: "g", base: 100, cal: 87, p: 2, c: 20, f: 0.1 },
  { n: "Sweet potato (cooked)", unit: "g", base: 100, cal: 90, p: 2, c: 21, f: 0.1 },
  { n: "Bread (slice)", unit: "slice", base: 1, cal: 80, p: 4, c: 14, f: 1 },
  { n: "Tortilla / wrap", unit: "tortilla", base: 1, cal: 150, p: 4, c: 24, f: 3.5 },
  { n: "Bagel", unit: "bagel", base: 1, cal: 250, p: 10, c: 49, f: 1.5 },
  { n: "Cornflakes", unit: "g", base: 100, cal: 357, p: 7, c: 84, f: 0.9 },
  // everyday meals & basics (per serving — no weighing needed)
  { n: "Avocado toast", unit: "toast", base: 1, cal: 200, p: 5, c: 20, f: 12 },
  { n: "Peanut butter toast", unit: "toast", base: 1, cal: 190, p: 7, c: 19, f: 10 },
  { n: "Oatmeal bowl", unit: "bowl", base: 1, cal: 160, p: 6, c: 27, f: 3.5 },
  { n: "Oats with milk (~50g + 250ml)", unit: "bowl", base: 1, cal: 320, p: 14, c: 45, f: 9 },
  { n: "Greek yogurt & fruit bowl", unit: "bowl", base: 1, cal: 180, p: 12, c: 24, f: 3 },
  { n: "Fruit smoothie", unit: "glass", base: 1, cal: 180, p: 4, c: 38, f: 2 },
  { n: "Banana smoothie", unit: "glass", base: 1, cal: 220, p: 6, c: 40, f: 4 },
  { n: "Oats & milk smoothie (~50g + 250ml)", unit: "glass", base: 1, cal: 330, p: 15, c: 46, f: 10 },
  { n: "Smoothie (no banana)", unit: "glass", base: 1, cal: 160, p: 5, c: 28, f: 3 },
  { n: "Veggie sandwich", unit: "sandwich", base: 1, cal: 250, p: 9, c: 35, f: 8 },
  { n: "Salad bowl", unit: "bowl", base: 1, cal: 120, p: 4, c: 12, f: 6 },
  { n: "Roti / chapati", unit: "roti", base: 1, cal: 100, p: 3, c: 18, f: 3 },
  { n: "Naan", unit: "naan", base: 1, cal: 260, p: 9, c: 48, f: 5 },
  { n: "Plain rice bowl", unit: "bowl", base: 1, cal: 200, p: 4, c: 44, f: 0.5 },
  { n: "Veg pulao / fried rice", unit: "bowl", base: 1, cal: 290, p: 6, c: 45, f: 9 },
  { n: "Dal (lentil curry)", unit: "bowl", base: 1, cal: 180, p: 9, c: 22, f: 6 },
  { n: "Rajma (kidney beans)", unit: "bowl", base: 1, cal: 220, p: 10, c: 30, f: 6 },
  { n: "Chole (chickpeas)", unit: "bowl", base: 1, cal: 260, p: 11, c: 33, f: 9 },
  { n: "Paneer butter masala", unit: "bowl", base: 1, cal: 340, p: 14, c: 12, f: 27 },
  { n: "Mixed vegetable curry", unit: "bowl", base: 1, cal: 180, p: 5, c: 15, f: 11 },
  { n: "Idli", unit: "idli", base: 1, cal: 40, p: 1.6, c: 8, f: 0.2 },
  { n: "Plain dosa", unit: "dosa", base: 1, cal: 135, p: 3, c: 22, f: 3.5 },
  { n: "Masala dosa", unit: "dosa", base: 1, cal: 250, p: 5, c: 35, f: 10 },
  { n: "Benne dosa (butter)", unit: "dosa", base: 1, cal: 220, p: 4, c: 28, f: 10 },
  { n: "Butter sada dosa", unit: "dosa", base: 1, cal: 200, p: 3, c: 26, f: 9 },
  { n: "Mysore masala dosa", unit: "dosa", base: 1, cal: 280, p: 6, c: 38, f: 12 },
  { n: "Set dosa", unit: "plate (3)", base: 1, cal: 250, p: 6, c: 40, f: 7 },
  { n: "Onion dosa", unit: "dosa", base: 1, cal: 180, p: 4, c: 28, f: 6 },
  { n: "Paper dosa", unit: "dosa", base: 1, cal: 160, p: 3, c: 26, f: 5 },
  { n: "Ghee roast dosa", unit: "dosa", base: 1, cal: 250, p: 4, c: 34, f: 11 },
  { n: "Cheese dosa", unit: "dosa", base: 1, cal: 300, p: 9, c: 36, f: 13 },
  { n: "Paneer dosa", unit: "dosa", base: 1, cal: 290, p: 12, c: 34, f: 12 },
  { n: "Podi dosa", unit: "dosa", base: 1, cal: 200, p: 4, c: 30, f: 7 },
  { n: "Benne podi dosa", unit: "dosa", base: 1, cal: 250, p: 5, c: 30, f: 12 },
  { n: "Benne podi masala dosa", unit: "dosa", base: 1, cal: 320, p: 6, c: 40, f: 15 },
  { n: "Podi idli", unit: "plate (4)", base: 1, cal: 180, p: 5, c: 28, f: 6 },
  { n: "Poha", unit: "bowl", base: 1, cal: 250, p: 5, c: 40, f: 8 },
  { n: "Upma", unit: "bowl", base: 1, cal: 250, p: 6, c: 38, f: 9 },
  { n: "Samosa", unit: "samosa", base: 1, cal: 260, p: 4, c: 30, f: 14 },
  // chaat & street food (veg)
  { n: "Sev puri", unit: "plate", base: 1, cal: 250, p: 5, c: 35, f: 10 },
  { n: "Bhel puri", unit: "plate", base: 1, cal: 220, p: 5, c: 33, f: 8 },
  { n: "Sukha bhel", unit: "plate", base: 1, cal: 180, p: 4, c: 28, f: 6 },
  { n: "Pani puri / golgappa", unit: "plate (6)", base: 1, cal: 150, p: 3, c: 28, f: 3 },
  { n: "Dahi puri", unit: "plate", base: 1, cal: 230, p: 6, c: 30, f: 9 },
  { n: "Chana chaat (chole chaat)", unit: "bowl", base: 1, cal: 230, p: 10, c: 32, f: 7 },
  { n: "Chana chor garam", unit: "cup (50g)", base: 1, cal: 190, p: 8, c: 28, f: 5 },
  { n: "Ragda pattice", unit: "plate", base: 1, cal: 350, p: 9, c: 50, f: 12 },
  { n: "Aloo tikki", unit: "piece", base: 1, cal: 150, p: 3, c: 20, f: 7 },
  { n: "Vada pav", unit: "piece", base: 1, cal: 290, p: 7, c: 40, f: 11 },
  { n: "Batata vada (no pav)", unit: "piece", base: 1, cal: 150, p: 3, c: 18, f: 8 },
  { n: "Pav bhaji", unit: "plate", base: 1, cal: 400, p: 9, c: 50, f: 18 },
  { n: "Dhokla", unit: "piece", base: 1, cal: 40, p: 1.5, c: 6, f: 1 },
  { n: "Spring roll (veg)", unit: "roll", base: 1, cal: 120, p: 2, c: 15, f: 6 },
  // wholesome meals (veg)
  { n: "Veg thali", unit: "plate", base: 1, cal: 600, p: 18, c: 85, f: 20 },
  { n: "Dal rice", unit: "plate", base: 1, cal: 400, p: 12, c: 70, f: 7 },
  { n: "Rajma rice", unit: "plate", base: 1, cal: 450, p: 14, c: 75, f: 9 },
  { n: "Chole rice", unit: "plate", base: 1, cal: 480, p: 14, c: 78, f: 12 },
  { n: "Curd rice", unit: "bowl", base: 1, cal: 250, p: 7, c: 40, f: 6 },
  { n: "Khichdi", unit: "bowl", base: 1, cal: 250, p: 9, c: 42, f: 5 },
  { n: "Veg biryani", unit: "plate", base: 1, cal: 400, p: 9, c: 60, f: 13 },
  { n: "Idli sambar", unit: "plate (2)", base: 1, cal: 200, p: 7, c: 38, f: 3 },
  { n: "Sambar rice", unit: "bowl", base: 1, cal: 300, p: 9, c: 52, f: 6 },
  { n: "Roti + sabzi", unit: "plate", base: 1, cal: 350, p: 10, c: 50, f: 12 },
  { n: "Aloo paratha", unit: "paratha", base: 1, cal: 250, p: 6, c: 36, f: 9 },
  { n: "Paneer wrap", unit: "wrap", base: 1, cal: 350, p: 15, c: 38, f: 15 },
  { n: "Veg frankie / roll", unit: "roll", base: 1, cal: 300, p: 7, c: 40, f: 12 },
  { n: "Paneer frankie", unit: "roll", base: 1, cal: 360, p: 14, c: 40, f: 16 },
  { n: "Cheese frankie", unit: "roll", base: 1, cal: 380, p: 12, c: 42, f: 18 },
  { n: "Aloo frankie", unit: "roll", base: 1, cal: 320, p: 6, c: 46, f: 12 },
  { n: "Grain / Buddha bowl", unit: "bowl", base: 1, cal: 450, p: 18, c: 55, f: 16 },
  // sushi (veg) — roll = 6 pieces unless noted
  { n: "Cucumber roll (kappa maki, 6 pcs)", unit: "roll", base: 1, cal: 140, p: 4, c: 30, f: 0.5 },
  { n: "Avocado roll (6 pcs)", unit: "roll", base: 1, cal: 210, p: 4, c: 30, f: 7 },
  { n: "Avocado-cucumber roll (6 pcs)", unit: "roll", base: 1, cal: 200, p: 4, c: 32, f: 6 },
  { n: "Veg maki roll (6 pcs)", unit: "roll", base: 1, cal: 200, p: 5, c: 35, f: 4 },
  { n: "Veg California roll (8 pcs)", unit: "roll", base: 1, cal: 255, p: 5, c: 40, f: 7 },
  { n: "Sweet potato tempura roll (8 pcs)", unit: "roll", base: 1, cal: 340, p: 6, c: 60, f: 8 },
  { n: "Paneer / tofu roll (6 pcs)", unit: "roll", base: 1, cal: 240, p: 9, c: 32, f: 8 },
  { n: "Inari sushi (sweet tofu pocket)", unit: "piece", base: 1, cal: 70, p: 2, c: 12, f: 1.5 },
  { n: "Avocado nigiri", unit: "piece", base: 1, cal: 50, p: 1, c: 8, f: 1.5 },
  { n: "Edamame (side)", unit: "bowl", base: 1, cal: 150, p: 13, c: 12, f: 6 },
  // Indian hot meals & sabzis (veg)
  { n: "Misal pav", unit: "plate", base: 1, cal: 400, p: 12, c: 55, f: 14 },
  { n: "Misal (bowl)", unit: "bowl", base: 1, cal: 250, p: 10, c: 30, f: 10 },
  { n: "Pithla bhakri", unit: "plate", base: 1, cal: 350, p: 10, c: 45, f: 14 },
  { n: "Sabudana khichdi", unit: "bowl", base: 1, cal: 300, p: 5, c: 45, f: 11 },
  { n: "Thalipeeth", unit: "piece", base: 1, cal: 180, p: 5, c: 28, f: 6 },
  { n: "Dal makhani", unit: "bowl", base: 1, cal: 330, p: 12, c: 30, f: 18 },
  { n: "Palak paneer", unit: "bowl", base: 1, cal: 280, p: 14, c: 12, f: 20 },
  { n: "Aloo gobi", unit: "bowl", base: 1, cal: 200, p: 5, c: 22, f: 11 },
  { n: "Bhindi masala", unit: "bowl", base: 1, cal: 180, p: 4, c: 14, f: 12 },
  { n: "Baingan bharta", unit: "bowl", base: 1, cal: 190, p: 4, c: 16, f: 12 },
  { n: "Kadhi", unit: "bowl", base: 1, cal: 180, p: 6, c: 18, f: 9 },
  { n: "Chole bhature", unit: "plate", base: 1, cal: 450, p: 13, c: 55, f: 20 },
  { n: "Puri bhaji", unit: "plate", base: 1, cal: 400, p: 8, c: 50, f: 18 },
  { n: "Uttapam", unit: "piece", base: 1, cal: 180, p: 5, c: 30, f: 5 },
  { n: "Medu vada", unit: "piece", base: 1, cal: 85, p: 2, c: 10, f: 4 },
  { n: "Rava idli", unit: "piece", base: 1, cal: 60, p: 2, c: 10, f: 1.5 },
  { n: "Pongal", unit: "bowl", base: 1, cal: 280, p: 7, c: 45, f: 8 },
  { n: "Lemon rice", unit: "bowl", base: 1, cal: 250, p: 5, c: 42, f: 7 },
  { n: "Gobi / paneer paratha", unit: "paratha", base: 1, cal: 250, p: 8, c: 32, f: 10 },
  { n: "Plain paratha", unit: "paratha", base: 1, cal: 150, p: 3, c: 20, f: 6 },
  { n: "Cheese paratha", unit: "paratha", base: 1, cal: 320, p: 11, c: 34, f: 16 },
  { n: "Veg manchurian", unit: "plate", base: 1, cal: 300, p: 7, c: 35, f: 15 },
  { n: "Veg hakka noodles", unit: "plate", base: 1, cal: 350, p: 8, c: 55, f: 11 },
  { n: "Curd / dahi", unit: "bowl", base: 1, cal: 100, p: 6, c: 8, f: 5 },
  { n: "Moong (boiled, tadka)", unit: "bowl", base: 1, cal: 180, p: 12, c: 25, f: 3 },
  { n: "Sprouts salad", unit: "bowl", base: 1, cal: 150, p: 9, c: 20, f: 3 },
  { n: "Dal fry", unit: "bowl", base: 1, cal: 200, p: 9, c: 22, f: 8 },
  { n: "Moong dal tadka", unit: "bowl", base: 1, cal: 180, p: 10, c: 24, f: 5 },
  { n: "Dal tadka", unit: "bowl", base: 1, cal: 210, p: 9, c: 24, f: 9 },
  { n: "Yellow dal (toor)", unit: "bowl", base: 1, cal: 190, p: 9, c: 25, f: 6 },
  { n: "Sweet corn / corn chaat", unit: "bowl", base: 1, cal: 120, p: 3, c: 22, f: 2 },
  { n: "Buttermilk (chaas)", unit: "glass", base: 1, cal: 40, p: 2, c: 4, f: 1.5 },
  { n: "Lassi (sweet)", unit: "glass", base: 1, cal: 180, p: 5, c: 30, f: 4 },
  { n: "Banana shake", unit: "glass", base: 1, cal: 250, p: 7, c: 40, f: 6 },
  { n: "Mango shake", unit: "glass", base: 1, cal: 220, p: 5, c: 40, f: 4 },
  // shakes — no added sugar (fruit + milk only)
  { n: "Banana shake (no sugar)", unit: "glass", base: 1, cal: 200, p: 8, c: 30, f: 5 },
  { n: "Mango shake (no sugar)", unit: "glass", base: 1, cal: 190, p: 7, c: 30, f: 5 },
  { n: "Strawberry shake (no sugar)", unit: "glass", base: 1, cal: 170, p: 7, c: 22, f: 5 },
  { n: "Chikoo (sapota) shake (no sugar)", unit: "glass", base: 1, cal: 210, p: 7, c: 34, f: 5 },
  { n: "Apple shake (no sugar)", unit: "glass", base: 1, cal: 180, p: 7, c: 28, f: 5 },
  { n: "Papaya shake (no sugar)", unit: "glass", base: 1, cal: 160, p: 7, c: 24, f: 5 },
  { n: "Mixed fruit shake (no sugar)", unit: "glass", base: 1, cal: 200, p: 7, c: 30, f: 5 },
  { n: "Dates shake (no sugar)", unit: "glass", base: 1, cal: 230, p: 8, c: 36, f: 6 },
  { n: "Dry fruit shake (no sugar)", unit: "glass", base: 1, cal: 280, p: 9, c: 30, f: 13 },
  { n: "Avocado shake (no sugar)", unit: "glass", base: 1, cal: 250, p: 7, c: 20, f: 16 },
  { n: "Masala milk", unit: "glass", base: 1, cal: 200, p: 8, c: 26, f: 7 },
  { n: "Badam milk", unit: "glass", base: 1, cal: 220, p: 8, c: 28, f: 8 },
  // sandwiches (veg)
  { n: "Grilled cheese sandwich", unit: "sandwich", base: 1, cal: 300, p: 10, c: 30, f: 15 },
  { n: "Bombay masala sandwich", unit: "sandwich", base: 1, cal: 250, p: 7, c: 35, f: 9 },
  { n: "Paneer sandwich", unit: "sandwich", base: 1, cal: 320, p: 14, c: 34, f: 14 },
  { n: "Corn cheese sandwich", unit: "sandwich", base: 1, cal: 330, p: 11, c: 36, f: 15 },
  { n: "Aloo sandwich", unit: "sandwich", base: 1, cal: 260, p: 6, c: 38, f: 9 },
  { n: "Chutney sandwich", unit: "sandwich", base: 1, cal: 180, p: 5, c: 28, f: 5 },
  { n: "Club sandwich (veg)", unit: "sandwich", base: 1, cal: 400, p: 12, c: 45, f: 18 },
  // Subway (veg) — 6-inch on wheat unless noted
  { n: "Subway Paneer Tikka (6-inch)", unit: "sub", base: 1, cal: 380, p: 17, c: 46, f: 14 },
  { n: "Subway Paneer Tikka (footlong)", unit: "sub", base: 1, cal: 760, p: 34, c: 92, f: 28 },
  { n: "Subway Aloo Patty (6-inch)", unit: "sub", base: 1, cal: 360, p: 11, c: 50, f: 12 },
  { n: "Subway Veggie Delite (6-inch)", unit: "sub", base: 1, cal: 230, p: 9, c: 44, f: 3 },
  { n: "Subway Veg Shammi (6-inch)", unit: "sub", base: 1, cal: 370, p: 13, c: 48, f: 13 },
  { n: "Subway Corn & Peas (6-inch)", unit: "sub", base: 1, cal: 320, p: 11, c: 50, f: 7 },
  { n: "Subway Mexican Patty (6-inch)", unit: "sub", base: 1, cal: 350, p: 11, c: 49, f: 11 },
  { n: "Subway Hara Bhara Kabab (6-inch)", unit: "sub", base: 1, cal: 340, p: 11, c: 50, f: 9 },
  { n: "Subway Cheese & Veggies (6-inch)", unit: "sub", base: 1, cal: 300, p: 12, c: 44, f: 8 },
  { n: "Subway Italian (veg, 6-inch)", unit: "sub", base: 1, cal: 270, p: 10, c: 44, f: 6 },
  { n: "Subway Tandoori Aloo (6-inch)", unit: "sub", base: 1, cal: 350, p: 10, c: 50, f: 11 },
  { n: "Subway Paneer Tikka wrap", unit: "wrap", base: 1, cal: 420, p: 18, c: 44, f: 18 },
  { n: "Subway Aloo wrap", unit: "wrap", base: 1, cal: 380, p: 9, c: 48, f: 16 },
  { n: "Subway Veg salad bowl", unit: "bowl", base: 1, cal: 140, p: 6, c: 18, f: 4 },
  { n: "Subway cookie", unit: "cookie", base: 1, cal: 200, p: 2, c: 30, f: 9 },
  // Subway sauces (per serving on a 6-inch)
  { n: "Subway sauce – Chipotle Southwest", unit: "serving", base: 1, cal: 100, p: 0, c: 1, f: 11 },
  { n: "Subway sauce – Sweet Onion", unit: "serving", base: 1, cal: 40, p: 0, c: 9, f: 0 },
  { n: "Subway sauce – Barbeque", unit: "serving", base: 1, cal: 35, p: 0, c: 8, f: 0 },
  { n: "Subway sauce – Mint Mayonnaise", unit: "serving", base: 1, cal: 90, p: 0, c: 1, f: 10 },
  { n: "Subway sauce – Peri Peri", unit: "serving", base: 1, cal: 30, p: 0, c: 5, f: 1 },
  // more sabzis & curries (veg)
  { n: "Matar paneer", unit: "bowl", base: 1, cal: 300, p: 13, c: 16, f: 20 },
  { n: "Paneer bhurji", unit: "bowl", base: 1, cal: 280, p: 16, c: 8, f: 20 },
  { n: "Malai kofta", unit: "bowl", base: 1, cal: 380, p: 10, c: 22, f: 28 },
  { n: "Aloo matar", unit: "bowl", base: 1, cal: 200, p: 6, c: 26, f: 8 },
  { n: "Jeera aloo", unit: "bowl", base: 1, cal: 180, p: 3, c: 24, f: 8 },
  { n: "Dum aloo", unit: "bowl", base: 1, cal: 250, p: 5, c: 28, f: 13 },
  { n: "Veg korma", unit: "bowl", base: 1, cal: 300, p: 7, c: 20, f: 20 },
  { n: "Stuffed capsicum", unit: "piece", base: 1, cal: 180, p: 5, c: 14, f: 11 },
  { n: "Thepla", unit: "piece", base: 1, cal: 110, p: 3, c: 15, f: 4 },
  // more South Indian (veg)
  { n: "Rava dosa", unit: "dosa", base: 1, cal: 150, p: 3, c: 24, f: 4 },
  { n: "Onion uttapam", unit: "piece", base: 1, cal: 200, p: 5, c: 32, f: 6 },
  { n: "Appam", unit: "piece", base: 1, cal: 120, p: 2, c: 22, f: 2 },
  { n: "Rasam", unit: "bowl", base: 1, cal: 80, p: 3, c: 12, f: 2 },
  { n: "Sambar", unit: "bowl", base: 1, cal: 120, p: 6, c: 16, f: 3 },
  { n: "Bisi bele bath", unit: "bowl", base: 1, cal: 320, p: 9, c: 50, f: 9 },
  { n: "Dahi vada", unit: "plate (2)", base: 1, cal: 200, p: 6, c: 24, f: 9 },
  { n: "Dahi boondi", unit: "bowl", base: 1, cal: 180, p: 5, c: 20, f: 8 },
  // more rice / breads / snacks (veg)
  { n: "Jeera rice", unit: "bowl", base: 1, cal: 220, p: 4, c: 42, f: 4 },
  { n: "Tomato rice", unit: "bowl", base: 1, cal: 250, p: 5, c: 44, f: 6 },
  { n: "Schezwan fried rice", unit: "plate", base: 1, cal: 350, p: 7, c: 55, f: 12 },
  { n: "Tandoori roti", unit: "roti", base: 1, cal: 120, p: 4, c: 22, f: 2 },
  { n: "Butter naan", unit: "naan", base: 1, cal: 280, p: 8, c: 45, f: 8 },
  { n: "Garlic naan", unit: "naan", base: 1, cal: 300, p: 9, c: 46, f: 9 },
  { n: "Kachori", unit: "piece", base: 1, cal: 180, p: 3, c: 18, f: 11 },
  { n: "Dahi kachori (chaat)", unit: "plate", base: 1, cal: 280, p: 7, c: 34, f: 13 },
  { n: "Bread pakora", unit: "piece", base: 1, cal: 180, p: 4, c: 20, f: 9 },
  { n: "Onion / veg pakora", unit: "plate", base: 1, cal: 250, p: 5, c: 25, f: 14 },
  { n: "Veg cutlet", unit: "piece", base: 1, cal: 130, p: 3, c: 16, f: 6 },
  { n: "Hara bhara kabab", unit: "plate (2)", base: 1, cal: 160, p: 5, c: 18, f: 7 },
  { n: "Paneer tikka", unit: "plate", base: 1, cal: 300, p: 20, c: 8, f: 20 },
  // paneer starters (veg) — per plate (starter portion)
  { n: "Tandoori paneer tikka", unit: "plate", base: 1, cal: 310, p: 21, c: 9, f: 21 },
  { n: "Malai paneer tikka", unit: "plate", base: 1, cal: 360, p: 19, c: 8, f: 27 },
  { n: "Achari paneer tikka", unit: "plate", base: 1, cal: 320, p: 20, c: 9, f: 22 },
  { n: "Paneer pahadi tikka", unit: "plate", base: 1, cal: 320, p: 20, c: 8, f: 23 },
  { n: "Paneer shashlik", unit: "plate", base: 1, cal: 340, p: 20, c: 14, f: 22 },
  { n: "Peri peri paneer", unit: "plate", base: 1, cal: 360, p: 20, c: 14, f: 24 },
  { n: "Paneer pakora", unit: "plate", base: 1, cal: 380, p: 16, c: 18, f: 27 },
  { n: "Paneer 65", unit: "plate", base: 1, cal: 420, p: 19, c: 22, f: 28 },
  { n: "Crispy paneer / paneer fingers", unit: "plate", base: 1, cal: 400, p: 18, c: 24, f: 26 },
  { n: "Paneer manchurian (dry)", unit: "plate", base: 1, cal: 390, p: 18, c: 26, f: 23 },
  { n: "Paneer satay", unit: "plate", base: 1, cal: 350, p: 20, c: 12, f: 24 },
  { n: "Veg momos", unit: "plate (6)", base: 1, cal: 220, p: 6, c: 38, f: 5 },
  { n: "Maggi / instant noodles", unit: "pack", base: 1, cal: 350, p: 7, c: 50, f: 13 },
  { n: "White sauce pasta", unit: "plate", base: 1, cal: 400, p: 11, c: 45, f: 18 },
  { n: "Red sauce pasta", unit: "plate", base: 1, cal: 350, p: 10, c: 55, f: 10 },
  // sweets & desserts (veg)
  { n: "Fruit custard", unit: "bowl", base: 1, cal: 200, p: 4, c: 32, f: 6 },
  { n: "Fruit salad", unit: "bowl", base: 1, cal: 120, p: 2, c: 28, f: 1 },
  { n: "Kheer / payasam", unit: "bowl", base: 1, cal: 250, p: 6, c: 40, f: 8 },
  { n: "Gulab jamun", unit: "piece", base: 1, cal: 150, p: 2, c: 25, f: 6 },
  { n: "Rabdi", unit: "bowl", base: 1, cal: 280, p: 7, c: 32, f: 14 },
  { n: "Rabdi gulab jamun", unit: "bowl (2 + rabdi)", base: 1, cal: 450, p: 8, c: 58, f: 20 },
  { n: "Jalebi", unit: "piece", base: 1, cal: 150, p: 1, c: 28, f: 5 },
  { n: "Jalebi with rabdi", unit: "plate", base: 1, cal: 420, p: 6, c: 60, f: 18 },
  { n: "Rasgulla", unit: "piece", base: 1, cal: 125, p: 2, c: 27, f: 1 },
  { n: "Rasmalai", unit: "piece", base: 1, cal: 185, p: 5, c: 22, f: 8 },
  // Bengali sweets (veg)
  { n: "Sandesh", unit: "piece", base: 1, cal: 100, p: 4, c: 12, f: 4 },
  { n: "Nolen gur sandesh", unit: "piece", base: 1, cal: 110, p: 4, c: 14, f: 4 },
  { n: "Cham cham", unit: "piece", base: 1, cal: 150, p: 3, c: 25, f: 4 },
  { n: "Kalakand", unit: "piece", base: 1, cal: 120, p: 4, c: 14, f: 6 },
  { n: "Mishti doi (sweet yogurt)", unit: "bowl", base: 1, cal: 180, p: 5, c: 30, f: 4 },
  { n: "Rajbhog", unit: "piece", base: 1, cal: 200, p: 4, c: 30, f: 7 },
  { n: "Chhena poda", unit: "slice", base: 1, cal: 250, p: 7, c: 30, f: 11 },
  { n: "Pantua", unit: "piece", base: 1, cal: 160, p: 3, c: 24, f: 6 },
  { n: "Langcha", unit: "piece", base: 1, cal: 180, p: 2, c: 28, f: 7 },
  { n: "Mihidana", unit: "bowl", base: 1, cal: 200, p: 3, c: 34, f: 6 },
  { n: "Gajar ka halwa", unit: "bowl", base: 1, cal: 350, p: 5, c: 42, f: 18 },
  { n: "Moong dal halwa", unit: "bowl", base: 1, cal: 400, p: 7, c: 44, f: 22 },
  { n: "Kaju katli", unit: "piece", base: 1, cal: 70, p: 1.5, c: 8, f: 4 },
  { n: "Besan ladoo", unit: "piece", base: 1, cal: 180, p: 3, c: 20, f: 10 },
  { n: "Motichoor ladoo", unit: "piece", base: 1, cal: 175, p: 2, c: 24, f: 8 },
  { n: "Soan papdi", unit: "piece", base: 1, cal: 110, p: 1.5, c: 16, f: 5 },
  { n: "Kulfi", unit: "piece", base: 1, cal: 200, p: 5, c: 22, f: 10 },
  { n: "Gajar halwa with rabdi", unit: "bowl", base: 1, cal: 480, p: 8, c: 52, f: 26 },
  { n: "Halwa", unit: "bowl", base: 1, cal: 300, p: 4, c: 40, f: 14 },
  // cakes & pastries (veg / eggless) — per slice unless noted
  { n: "Chocolate cake (slice)", unit: "slice", base: 1, cal: 350, p: 5, c: 50, f: 16 },
  { n: "Black forest cake (slice)", unit: "slice", base: 1, cal: 340, p: 5, c: 42, f: 17 },
  { n: "Vanilla sponge cake (slice)", unit: "slice", base: 1, cal: 300, p: 4, c: 45, f: 12 },
  { n: "Red velvet cake (slice)", unit: "slice", base: 1, cal: 370, p: 4, c: 48, f: 18 },
  { n: "Pineapple cake (slice)", unit: "slice", base: 1, cal: 290, p: 4, c: 44, f: 11 },
  { n: "Butterscotch cake (slice)", unit: "slice", base: 1, cal: 330, p: 4, c: 46, f: 15 },
  { n: "Chocolate truffle pastry", unit: "piece", base: 1, cal: 330, p: 4, c: 38, f: 18 },
  { n: "Cheesecake (slice)", unit: "slice", base: 1, cal: 400, p: 7, c: 38, f: 25 },
  { n: "Plum cake (slice)", unit: "slice", base: 1, cal: 320, p: 4, c: 50, f: 11 },
  { n: "Cupcake (frosted)", unit: "cupcake", base: 1, cal: 290, p: 3, c: 40, f: 13 },
  { n: "Brownie", unit: "piece", base: 1, cal: 250, p: 3, c: 34, f: 12 },
  { n: "Walnut brownie", unit: "piece", base: 1, cal: 290, p: 4, c: 33, f: 16 },
  { n: "Brownie with ice cream", unit: "plate", base: 1, cal: 450, p: 6, c: 56, f: 22 },
  // fruit
  { n: "Banana", unit: "medium banana", base: 1, cal: 105, p: 1.3, c: 27, f: 0.4 },
  { n: "Apple", unit: "medium apple", base: 1, cal: 95, p: 0.5, c: 25, f: 0.3 },
  { n: "Orange", unit: "medium orange", base: 1, cal: 62, p: 1.2, c: 15, f: 0.2 },
  { n: "Avocado", unit: "avocado", base: 1, cal: 240, p: 3, c: 12, f: 22 },
  { n: "Strawberries", unit: "g", base: 100, cal: 32, p: 0.7, c: 7.7, f: 0.3 },
  { n: "Blueberries", unit: "g", base: 100, cal: 57, p: 0.7, c: 14, f: 0.3 },
  { n: "Grapes", unit: "g", base: 100, cal: 69, p: 0.7, c: 18, f: 0.2 },
  { n: "Cherries", unit: "g", base: 100, cal: 63, p: 1.1, c: 16, f: 0.2 },
  { n: "Mango", unit: "g", base: 100, cal: 60, p: 0.8, c: 15, f: 0.4 },
  { n: "Pineapple", unit: "g", base: 100, cal: 50, p: 0.5, c: 13, f: 0.1 },
  { n: "Papaya", unit: "g", base: 100, cal: 43, p: 0.5, c: 11, f: 0.3 },
  { n: "Watermelon", unit: "g", base: 100, cal: 30, p: 0.6, c: 8, f: 0.2 },
  { n: "Muskmelon", unit: "g", base: 100, cal: 34, p: 0.8, c: 8, f: 0.2 },
  { n: "Guava", unit: "g", base: 100, cal: 68, p: 2.6, c: 14, f: 1 },
  { n: "Pomegranate", unit: "g", base: 100, cal: 83, p: 1.7, c: 19, f: 1.2 },
  { n: "Pear", unit: "medium pear", base: 1, cal: 100, p: 0.6, c: 27, f: 0.2 },
  { n: "Kiwi", unit: "kiwi", base: 1, cal: 42, p: 0.8, c: 10, f: 0.4 },
  { n: "Chikoo (sapota)", unit: "g", base: 100, cal: 83, p: 0.4, c: 20, f: 1.1 },
  { n: "Custard apple", unit: "g", base: 100, cal: 94, p: 2.1, c: 24, f: 0.3 },
  { n: "Litchi", unit: "g", base: 100, cal: 66, p: 0.8, c: 17, f: 0.4 },
  { n: "Dates", unit: "piece", base: 1, cal: 20, p: 0.2, c: 5, f: 0 },
  // veg
  { n: "Broccoli (cooked)", unit: "g", base: 100, cal: 35, p: 2.4, c: 7, f: 0.4 },
  { n: "Spinach", unit: "g", base: 100, cal: 23, p: 2.9, c: 3.6, f: 0.4 },
  { n: "Mixed salad", unit: "g", base: 100, cal: 15, p: 1, c: 3, f: 0.2 },
  { n: "Carrot", unit: "g", base: 100, cal: 41, p: 0.9, c: 10, f: 0.2 },
  { n: "Tomato", unit: "g", base: 100, cal: 18, p: 0.9, c: 3.9, f: 0.2 },
  { n: "Bell pepper", unit: "g", base: 100, cal: 31, p: 1, c: 6, f: 0.3 },
  { n: "Green beans (cooked)", unit: "g", base: 100, cal: 35, p: 2, c: 8, f: 0.1 },
  { n: "Corn", unit: "g", base: 100, cal: 96, p: 3.4, c: 21, f: 1.5 },
  { n: "Peas (cooked)", unit: "g", base: 100, cal: 84, p: 5, c: 16, f: 0.4 },
  // dairy / fats / nuts
  { n: "Milk (whole)", unit: "ml", base: 100, cal: 61, p: 3.2, c: 4.8, f: 3.3 },
  { n: "Milk (skim)", unit: "ml", base: 100, cal: 34, p: 3.4, c: 5, f: 0.1 },
  { n: "Cheddar cheese", unit: "g", base: 100, cal: 403, p: 25, c: 1.3, f: 33 },
  { n: "Mozzarella", unit: "g", base: 100, cal: 280, p: 28, c: 3, f: 17 },
  { n: "Butter", unit: "g", base: 100, cal: 717, p: 0.9, c: 0.1, f: 81 },
  { n: "Ghee", unit: "tbsp", base: 1, cal: 112, p: 0, c: 0, f: 12.7 },
  { n: "Olive oil", unit: "tbsp", base: 1, cal: 119, p: 0, c: 0, f: 13.5 },
  { n: "Peanut butter", unit: "tbsp", base: 1, cal: 94, p: 4, c: 3, f: 8 },
  { n: "Almonds", unit: "handful (28g)", base: 1, cal: 164, p: 6, c: 6, f: 14 },
  { n: "Walnuts", unit: "handful (28g)", base: 1, cal: 185, p: 4.3, c: 3.9, f: 18.5 },
  { n: "Cashews", unit: "handful (28g)", base: 1, cal: 157, p: 5, c: 9, f: 12 },
  { n: "Peanuts (roasted)", unit: "handful (28g)", base: 1, cal: 166, p: 7, c: 6, f: 14 },
  { n: "Peanuts (raw)", unit: "handful (28g)", base: 1, cal: 161, p: 7, c: 4.6, f: 14 },
  { n: "Roasted chana (bhuna chana)", unit: "handful (30g)", base: 1, cal: 110, p: 6, c: 16, f: 2 },
  { n: "Chana (boiled, snack)", unit: "bowl", base: 1, cal: 180, p: 10, c: 27, f: 3 },
  { n: "Makhana (roasted fox nuts)", unit: "cup (25g)", base: 1, cal: 90, p: 3, c: 18, f: 0.5 },
  { n: "Pistachios", unit: "handful (28g)", base: 1, cal: 159, p: 6, c: 8, f: 13 },
  { n: "Mixed nuts", unit: "handful (28g)", base: 1, cal: 170, p: 5, c: 7, f: 15 },
  { n: "Trail mix", unit: "handful (30g)", base: 1, cal: 140, p: 4, c: 13, f: 9 },
  { n: "Sunflower seeds", unit: "tbsp", base: 1, cal: 52, p: 2, c: 2, f: 4.5 },
  { n: "Pumpkin seeds", unit: "tbsp", base: 1, cal: 56, p: 3, c: 1.5, f: 4.7 },
  { n: "Murmura (puffed rice)", unit: "bowl", base: 1, cal: 100, p: 2, c: 22, f: 0.3 },
  // common meals / snacks / drinks
  { n: "Protein bar", unit: "bar", base: 1, cal: 220, p: 20, c: 22, f: 7 },
  { n: "Pizza (veg)", unit: "slice", base: 1, cal: 250, p: 10, c: 32, f: 9 },
  { n: "Cheese pizza", unit: "slice", base: 1, cal: 280, p: 12, c: 33, f: 11 },
  { n: "Margherita pizza", unit: "slice", base: 1, cal: 240, p: 10, c: 32, f: 8 },
  { n: "Paneer pizza", unit: "slice", base: 1, cal: 290, p: 13, c: 32, f: 12 },
  { n: "Veg loaded pizza", unit: "slice", base: 1, cal: 270, p: 11, c: 33, f: 10 },
  { n: "Street-style tawa pizza", unit: "piece", base: 1, cal: 300, p: 9, c: 38, f: 12 },
  // café 10-inch pizzas (veg) — whole pizza; use quantity 0.5 for half
  { n: "Margherita pizza (10\")", unit: "pizza", base: 1, cal: 1100, p: 44, c: 140, f: 38 },
  { n: "Cheese pizza (10\")", unit: "pizza", base: 1, cal: 1250, p: 52, c: 145, f: 48 },
  { n: "Paneer tikka pizza (10\")", unit: "pizza", base: 1, cal: 1300, p: 55, c: 140, f: 52 },
  { n: "Veg farmhouse pizza (10\")", unit: "pizza", base: 1, cal: 1200, p: 46, c: 145, f: 44 },
  { n: "Corn & cheese pizza (10\")", unit: "pizza", base: 1, cal: 1250, p: 48, c: 150, f: 46 },
  { n: "Mushroom pizza (10\")", unit: "pizza", base: 1, cal: 1150, p: 46, c: 142, f: 40 },
  { n: "Mexican / veg exotica pizza (10\")", unit: "pizza", base: 1, cal: 1220, p: 46, c: 148, f: 45 },
  { n: "Margherita pesto / basil pizza (10\")", unit: "pizza", base: 1, cal: 1150, p: 44, c: 138, f: 42 },
  { n: "Garlic bread (cheese)", unit: "piece", base: 1, cal: 150, p: 4, c: 18, f: 7 },
  { n: "Veggie burger", unit: "burger", base: 1, cal: 295, p: 12, c: 35, f: 12 },
  // café burgers (veg)
  { n: "Aloo tikki burger", unit: "burger", base: 1, cal: 320, p: 8, c: 48, f: 11 },
  { n: "Paneer burger", unit: "burger", base: 1, cal: 420, p: 18, c: 42, f: 20 },
  { n: "Paneer cheese burger", unit: "burger", base: 1, cal: 480, p: 22, c: 44, f: 24 },
  { n: "Veg cheese burger", unit: "burger", base: 1, cal: 400, p: 14, c: 44, f: 18 },
  { n: "Crispy veg burger", unit: "burger", base: 1, cal: 380, p: 10, c: 46, f: 16 },
  { n: "Mushroom burger", unit: "burger", base: 1, cal: 360, p: 12, c: 42, f: 15 },
  { n: "Double patty veg burger", unit: "burger", base: 1, cal: 520, p: 18, c: 50, f: 26 },
  { n: "Spicy bean burger", unit: "burger", base: 1, cal: 400, p: 14, c: 50, f: 15 },
  // McDonald's (veg)
  { n: "McDonald's McAloo Tikki", unit: "burger", base: 1, cal: 330, p: 8, c: 50, f: 11 },
  { n: "McDonald's McVeggie", unit: "burger", base: 1, cal: 400, p: 11, c: 53, f: 16 },
  { n: "McDonald's McSpicy Paneer", unit: "burger", base: 1, cal: 650, p: 18, c: 60, f: 37 },
  { n: "McDonald's McSpicy Paneer (protein)", unit: "burger", base: 1, cal: 700, p: 30, c: 55, f: 38 },
  { n: "McDonald's Veg Maharaja Mac", unit: "burger", base: 1, cal: 510, p: 14, c: 56, f: 25 },
  { n: "McDonald's McSpicy Premium Veg", unit: "burger", base: 1, cal: 530, p: 13, c: 58, f: 27 },
  { n: "McDonald's Pizza McPuff", unit: "piece", base: 1, cal: 230, p: 5, c: 27, f: 11 },
  { n: "McDonald's Veg Surprise", unit: "burger", base: 1, cal: 280, p: 7, c: 40, f: 10 },
  { n: "McDonald's Paneer Wrap", unit: "wrap", base: 1, cal: 450, p: 14, c: 48, f: 22 },
  { n: "McDonald's fries (medium)", unit: "serving", base: 1, cal: 340, p: 4, c: 44, f: 16 },
  { n: "McDonald's fries (small)", unit: "serving", base: 1, cal: 230, p: 3, c: 30, f: 11 },
  // Domino's (veg) — per slice unless noted; medium pizza ≈ 8 slices
  { n: "Domino's Margherita (slice, medium)", unit: "slice", base: 1, cal: 170, p: 7, c: 22, f: 6 },
  { n: "Domino's Cheese & Corn (slice, medium)", unit: "slice", base: 1, cal: 200, p: 8, c: 24, f: 8 },
  { n: "Domino's Farmhouse (slice, medium)", unit: "slice", base: 1, cal: 190, p: 8, c: 24, f: 7 },
  { n: "Domino's Peppy Paneer (slice, medium)", unit: "slice", base: 1, cal: 210, p: 9, c: 24, f: 9 },
  { n: "Domino's Veg Extravaganza (slice, medium)", unit: "slice", base: 1, cal: 220, p: 9, c: 25, f: 9 },
  { n: "Domino's Mexican Green Wave (slice, medium)", unit: "slice", base: 1, cal: 200, p: 8, c: 24, f: 8 },
  { n: "Domino's Margherita (medium, whole)", unit: "pizza", base: 1, cal: 1360, p: 56, c: 176, f: 48 },
  { n: "Domino's Garlic Breadsticks", unit: "plate (4)", base: 1, cal: 380, p: 9, c: 50, f: 15 },
  { n: "Domino's Stuffed Garlic Bread", unit: "plate (4)", base: 1, cal: 440, p: 12, c: 54, f: 19 },
  { n: "Domino's Cheese Dip", unit: "serving", base: 1, cal: 80, p: 2, c: 3, f: 7 },
  { n: "Domino's Choco Lava Cake", unit: "cake", base: 1, cal: 240, p: 3, c: 35, f: 10 },
  { n: "Domino's Taco Mexicana (veg)", unit: "piece", base: 1, cal: 280, p: 8, c: 36, f: 11 },
  { n: "Domino's Veg Pasta Italiano (white)", unit: "bowl", base: 1, cal: 380, p: 12, c: 44, f: 17 },
  // Pizza Hut (veg)
  { n: "Pizza Hut Margherita (slice, medium)", unit: "slice", base: 1, cal: 180, p: 7, c: 23, f: 6 },
  { n: "Pizza Hut Paneer Makhani (slice, medium)", unit: "slice", base: 1, cal: 220, p: 9, c: 25, f: 9 },
  { n: "Pizza Hut Veggie Supreme (slice, medium)", unit: "slice", base: 1, cal: 210, p: 8, c: 25, f: 8 },
  { n: "Pizza Hut Garlic Bread", unit: "plate (4)", base: 1, cal: 360, p: 9, c: 48, f: 14 },
  // Sbarro (veg) — NY-style slices are large
  { n: "Sbarro Cheese Pizza (slice, NY XL)", unit: "slice", base: 1, cal: 460, p: 19, c: 56, f: 18 },
  { n: "Sbarro Margherita (slice, NY XL)", unit: "slice", base: 1, cal: 450, p: 18, c: 55, f: 17 },
  { n: "Sbarro Fresh Tomato & Basil (slice)", unit: "slice", base: 1, cal: 470, p: 18, c: 58, f: 18 },
  { n: "Sbarro Spinach & Broccoli (slice)", unit: "slice", base: 1, cal: 500, p: 21, c: 52, f: 23 },
  { n: "Sbarro Veggie Supremo (slice)", unit: "slice", base: 1, cal: 490, p: 19, c: 57, f: 20 },
  { n: "Sbarro Paneer Pizza (slice, NY XL)", unit: "slice", base: 1, cal: 510, p: 23, c: 55, f: 22 },
  { n: "Sbarro Paneer Pizza (large, whole)", unit: "pizza", base: 1, cal: 4080, p: 184, c: 440, f: 176 },
  { n: "Sbarro Stromboli (veg)", unit: "piece", base: 1, cal: 620, p: 26, c: 60, f: 30 },
  { n: "Sbarro Baked Ziti", unit: "plate", base: 1, cal: 640, p: 26, c: 66, f: 28 },
  { n: "Sbarro Penne Alla Vodka", unit: "plate", base: 1, cal: 560, p: 18, c: 72, f: 22 },
  { n: "Sbarro Garlic Bread", unit: "piece", base: 1, cal: 210, p: 5, c: 26, f: 9 },
  { n: "Sbarro Cheesecake", unit: "slice", base: 1, cal: 450, p: 7, c: 40, f: 29 },
  // Taco Bell (veg — India menu)
  { n: "Taco Bell Crunchy Taco (veg)", unit: "taco", base: 1, cal: 170, p: 5, c: 20, f: 8 },
  { n: "Taco Bell Crunchy Taco Supreme (veg)", unit: "taco", base: 1, cal: 210, p: 6, c: 22, f: 11 },
  { n: "Taco Bell Soft Taco (veg)", unit: "taco", base: 1, cal: 200, p: 6, c: 26, f: 8 },
  { n: "Taco Bell 7-Layer Burrito (veg)", unit: "burrito", base: 1, cal: 430, p: 14, c: 60, f: 15 },
  { n: "Taco Bell Bean Burrito", unit: "burrito", base: 1, cal: 380, p: 13, c: 55, f: 11 },
  { n: "Taco Bell Potato & Paneer Burrito", unit: "burrito", base: 1, cal: 470, p: 15, c: 60, f: 19 },
  { n: "Taco Bell Crunchwrap (veg)", unit: "piece", base: 1, cal: 530, p: 15, c: 68, f: 22 },
  { n: "Taco Bell Quesadilla (veg)", unit: "piece", base: 1, cal: 470, p: 17, c: 42, f: 26 },
  { n: "Taco Bell Cheesy Nachos", unit: "serving", base: 1, cal: 320, p: 6, c: 36, f: 17 },
  { n: "Taco Bell Nachos Supreme (veg)", unit: "serving", base: 1, cal: 440, p: 11, c: 48, f: 23 },
  { n: "Taco Bell Cinnamon Twists", unit: "serving", base: 1, cal: 170, p: 1, c: 27, f: 6 },
  { n: "Taco Bell Choco Lava (veg)", unit: "piece", base: 1, cal: 230, p: 3, c: 34, f: 9 },
  // Subway desserts & cookies (veg)
  { n: "Subway Cookie – Choco Chip", unit: "cookie", base: 1, cal: 210, p: 2, c: 30, f: 10 },
  { n: "Subway Cookie – Double Choc", unit: "cookie", base: 1, cal: 210, p: 2, c: 30, f: 10 },
  { n: "Subway Cookie – Oatmeal Raisin", unit: "cookie", base: 1, cal: 200, p: 3, c: 30, f: 8 },
  { n: "Subway Cookie – White Choc Macadamia", unit: "cookie", base: 1, cal: 220, p: 2, c: 28, f: 11 },
  { n: "Subway Choco Chip Muffin", unit: "muffin", base: 1, cal: 320, p: 5, c: 44, f: 14 },
  { n: "Subway Brownie", unit: "piece", base: 1, cal: 240, p: 3, c: 36, f: 10 },
  // Mexican (veg)
  { n: "Veg burrito", unit: "burrito", base: 1, cal: 420, p: 14, c: 60, f: 13 },
  { n: "Bean & cheese burrito", unit: "burrito", base: 1, cal: 450, p: 16, c: 58, f: 16 },
  { n: "Burrito bowl (veg)", unit: "bowl", base: 1, cal: 480, p: 16, c: 62, f: 16 },
  { n: "Veg quesadilla", unit: "piece", base: 1, cal: 430, p: 16, c: 40, f: 23 },
  { n: "Veg taco (soft)", unit: "taco", base: 1, cal: 190, p: 6, c: 24, f: 8 },
  { n: "Veg taco (crunchy)", unit: "taco", base: 1, cal: 170, p: 5, c: 18, f: 9 },
  { n: "Nachos with cheese (veg)", unit: "plate", base: 1, cal: 480, p: 11, c: 46, f: 28 },
  { n: "Loaded nachos (veg)", unit: "plate", base: 1, cal: 620, p: 16, c: 56, f: 36 },
  { n: "Veg enchiladas", unit: "plate (2)", base: 1, cal: 420, p: 15, c: 44, f: 20 },
  { n: "Veg fajitas", unit: "plate", base: 1, cal: 360, p: 12, c: 42, f: 15 },
  { n: "Guacamole", unit: "bowl", base: 1, cal: 230, p: 3, c: 13, f: 21 },
  { n: "Salsa", unit: "serving", base: 1, cal: 30, p: 1, c: 7, f: 0 },
  { n: "Sour cream", unit: "serving", base: 1, cal: 60, p: 1, c: 1.5, f: 6 },
  { n: "Refried beans", unit: "bowl", base: 1, cal: 220, p: 12, c: 32, f: 5 },
  { n: "Mexican rice", unit: "bowl", base: 1, cal: 240, p: 5, c: 45, f: 5 },
  { n: "Chips & salsa", unit: "serving", base: 1, cal: 290, p: 4, c: 38, f: 14 },
  { n: "Churros", unit: "plate (3)", base: 1, cal: 330, p: 4, c: 42, f: 16 },
  // Italian (veg)
  { n: "Margherita pizza (whole, small)", unit: "pizza", base: 1, cal: 800, p: 32, c: 100, f: 30 },
  { n: "Pasta Alfredo (veg)", unit: "plate", base: 1, cal: 540, p: 16, c: 56, f: 27 },
  { n: "Pasta Arrabbiata", unit: "plate", base: 1, cal: 400, p: 12, c: 62, f: 11 },
  { n: "Pasta Pesto", unit: "plate", base: 1, cal: 480, p: 14, c: 56, f: 22 },
  { n: "Mac & cheese", unit: "bowl", base: 1, cal: 580, p: 20, c: 56, f: 30 },
  { n: "Pasta pink sauce (veg)", unit: "plate", base: 1, cal: 500, p: 14, c: 58, f: 22 },
  // Indo-Chinese / café starters (veg)
  { n: "Honey chilli potato", unit: "plate", base: 1, cal: 400, p: 5, c: 55, f: 17 },
  { n: "Chilli paneer (dry)", unit: "plate", base: 1, cal: 400, p: 20, c: 24, f: 24 },
  { n: "Chilli potato", unit: "plate", base: 1, cal: 380, p: 5, c: 52, f: 16 },
  { n: "Crispy corn (fried)", unit: "plate", base: 1, cal: 320, p: 6, c: 38, f: 16 },
  { n: "Veg manchurian (dry)", unit: "plate", base: 1, cal: 350, p: 8, c: 42, f: 16 },
  { n: "Paneer chilli (gravy)", unit: "plate", base: 1, cal: 430, p: 20, c: 26, f: 27 },
  { n: "Masala fries", unit: "serving", base: 1, cal: 420, p: 5, c: 52, f: 21 },
  { n: "Loaded cheese fries", unit: "serving", base: 1, cal: 560, p: 14, c: 50, f: 34 },
  { n: "Bruschetta (veg)", unit: "plate (2)", base: 1, cal: 260, p: 7, c: 34, f: 10 },
  { n: "Jalapeño poppers (plate 6)", unit: "plate (6)", base: 1, cal: 420, p: 9, c: 38, f: 26 },
  { n: "Jalapeño popper (piece)", unit: "piece", base: 1, cal: 70, p: 1.5, c: 6, f: 4.3 },
  { n: "Penne Alla Vodka", unit: "plate", base: 1, cal: 520, p: 15, c: 64, f: 22 },
  { n: "Spaghetti Aglio e Olio", unit: "plate", base: 1, cal: 420, p: 11, c: 60, f: 15 },
  { n: "Mac & cheese", unit: "bowl", base: 1, cal: 500, p: 18, c: 50, f: 25 },
  { n: "Veg lasagna", unit: "piece", base: 1, cal: 450, p: 18, c: 42, f: 23 },
  { n: "Risotto (mushroom)", unit: "plate", base: 1, cal: 440, p: 11, c: 58, f: 17 },
  { n: "Veg au gratin", unit: "plate", base: 1, cal: 420, p: 14, c: 38, f: 24 },
  { n: "Hummus with pita", unit: "plate", base: 1, cal: 350, p: 11, c: 42, f: 16 },
  { n: "Falafel (plate 5)", unit: "plate", base: 1, cal: 330, p: 12, c: 32, f: 17 },
  { n: "Falafel wrap", unit: "wrap", base: 1, cal: 420, p: 14, c: 50, f: 17 },
  { n: "Mezze platter (veg)", unit: "platter", base: 1, cal: 520, p: 16, c: 52, f: 28 },
  // café sweet plates & drinks
  { n: "Belgian waffle (with toppings)", unit: "waffle", base: 1, cal: 400, p: 8, c: 55, f: 16 },
  { n: "Chocolate waffle", unit: "waffle", base: 1, cal: 450, p: 8, c: 60, f: 20 },
  { n: "Pancakes (stack with syrup)", unit: "stack (3)", base: 1, cal: 430, p: 9, c: 65, f: 14 },
  { n: "Smoothie bowl", unit: "bowl", base: 1, cal: 320, p: 8, c: 55, f: 8 },
  { n: "Choco lava cake", unit: "cake", base: 1, cal: 310, p: 4, c: 42, f: 14 },
  { n: "Gnocchi (tomato/butter)", unit: "plate", base: 1, cal: 420, p: 11, c: 64, f: 13 },
  { n: "Margherita panini", unit: "panini", base: 1, cal: 380, p: 15, c: 42, f: 16 },
  { n: "Bruschetta", unit: "plate (4)", base: 1, cal: 260, p: 7, c: 36, f: 10 },
  { n: "Garlic bread with cheese", unit: "plate (2)", base: 1, cal: 330, p: 9, c: 38, f: 15 },
  { n: "Melted cheese garlic bread", unit: "plate (2)", base: 1, cal: 440, p: 14, c: 40, f: 24 },
  { n: "Melted cheese garlic bread (piece)", unit: "piece", base: 1, cal: 220, p: 7, c: 20, f: 12 },
  { n: "Minestrone soup", unit: "bowl", base: 1, cal: 150, p: 6, c: 24, f: 3 },
  { n: "Caprese salad", unit: "plate", base: 1, cal: 280, p: 14, c: 8, f: 22 },
  { n: "Margherita calzone (veg)", unit: "piece", base: 1, cal: 580, p: 24, c: 62, f: 26 },
  { n: "Ravioli (cheese/spinach)", unit: "plate", base: 1, cal: 460, p: 18, c: 52, f: 19 },
  { n: "Tiramisu", unit: "piece", base: 1, cal: 350, p: 6, c: 36, f: 20 },
  { n: "Panna cotta", unit: "piece", base: 1, cal: 290, p: 5, c: 28, f: 18 },
  { n: "Gelato", unit: "scoop", base: 1, cal: 160, p: 3, c: 22, f: 7 },
  { n: "French fries", unit: "g", base: 100, cal: 312, p: 3.4, c: 41, f: 15 },
  { n: "Cheese fries", unit: "serving", base: 1, cal: 480, p: 12, c: 48, f: 26 },
  { n: "Peri peri fries", unit: "serving", base: 1, cal: 400, p: 5, c: 50, f: 19 },
  { n: "Peri peri cheese fries", unit: "serving", base: 1, cal: 510, p: 13, c: 49, f: 28 },
  { n: "Honey Chilli Potato puffs (packet 55g)", unit: "packet (55g)", base: 1, cal: 78, p: 1, c: 10, f: 3.9 },
  { n: "Chocolate", unit: "g", base: 100, cal: 535, p: 7.6, c: 59, f: 30 },
  // Amul dark chocolate — per piece (~12.5 g square); set quantity to how many pieces
  { n: "Amul Dark Chocolate 55% (piece)", unit: "piece", base: 1, cal: 66, p: 1, c: 6.5, f: 4.2 },
  { n: "Amul Dark Chocolate 75% (piece)", unit: "piece", base: 1, cal: 68, p: 1.1, c: 5, f: 5 },
  { n: "Amul Dark Chocolate 90% (piece)", unit: "piece", base: 1, cal: 70, p: 1.3, c: 3.5, f: 5.6 },
  { n: "Amul Tropical Orange Dark (piece)", unit: "piece", base: 1, cal: 64, p: 0.9, c: 6.8, f: 4 },
  { n: "Amul Fruit & Nut Dark (piece)", unit: "piece", base: 1, cal: 68, p: 1.3, c: 6, f: 4.4 },
  { n: "Ice cream", unit: "g", base: 100, cal: 207, p: 3.5, c: 24, f: 11 },
  // Naturals ice cream (veg) — per scoop (~100 ml)
  { n: "Naturals Tender Coconut (scoop)", unit: "scoop", base: 1, cal: 140, p: 3, c: 18, f: 6 },
  { n: "Naturals Alphonso Mango (scoop)", unit: "scoop", base: 1, cal: 135, p: 2.5, c: 20, f: 5 },
  { n: "Naturals Sitaphal / Custard Apple (scoop)", unit: "scoop", base: 1, cal: 150, p: 3, c: 21, f: 6 },
  { n: "Naturals Chocolate (scoop)", unit: "scoop", base: 1, cal: 175, p: 3, c: 22, f: 9 },
  { n: "Naturals Kaju Draksh (scoop)", unit: "scoop", base: 1, cal: 185, p: 4, c: 22, f: 9 },
  { n: "Naturals Anjeer / Fig (scoop)", unit: "scoop", base: 1, cal: 175, p: 4, c: 23, f: 8 },
  { n: "Naturals Roasted Almond (scoop)", unit: "scoop", base: 1, cal: 180, p: 4, c: 21, f: 9 },
  { n: "Naturals Strawberry (scoop)", unit: "scoop", base: 1, cal: 140, p: 2.5, c: 20, f: 5 },
  { n: "Latte", unit: "cup (240ml)", base: 1, cal: 120, p: 8, c: 12, f: 4.5 },
  { n: "Masala chai", unit: "cup", base: 1, cal: 90, p: 2, c: 12, f: 3 },
  { n: "Black coffee (no sugar)", unit: "cup", base: 1, cal: 2, p: 0.3, c: 0, f: 0 },
  { n: "Black coffee + sugar", unit: "cup", base: 1, cal: 20, p: 0.3, c: 5, f: 0 },
  { n: "Coffee w/ milk, no sugar", unit: "cup", base: 1, cal: 35, p: 2, c: 3, f: 1.5 },
  { n: "Coffee w/ milk + sugar", unit: "cup", base: 1, cal: 90, p: 3, c: 12, f: 3 },
  { n: "Filter coffee", unit: "cup", base: 1, cal: 90, p: 3, c: 12, f: 3 },
  { n: "Cappuccino", unit: "cup", base: 1, cal: 80, p: 4, c: 8, f: 4 },
  { n: "Cold coffee", unit: "glass", base: 1, cal: 180, p: 6, c: 28, f: 5 },
  { n: "Oat milk coffee (no sugar)", unit: "cup", base: 1, cal: 50, p: 1, c: 8, f: 1.5 },
  { n: "Green tea", unit: "cup", base: 1, cal: 2, p: 0, c: 0, f: 0 },
  { n: "Lemon tea", unit: "cup", base: 1, cal: 20, p: 0, c: 5, f: 0 },
  { n: "Ginger tea", unit: "cup", base: 1, cal: 70, p: 1.5, c: 10, f: 2.5 },
  { n: "Herbal / black tea (plain)", unit: "cup", base: 1, cal: 5, p: 0, c: 1, f: 0 },
  { n: "Iced tea", unit: "glass", base: 1, cal: 90, p: 0, c: 22, f: 0 },
  // iced teas, lemonades, mocktails & coolers (per glass ~300 ml)
  { n: "Lemon iced tea", unit: "glass", base: 1, cal: 100, p: 0, c: 25, f: 0 },
  { n: "Peach iced tea", unit: "glass", base: 1, cal: 110, p: 0, c: 27, f: 0 },
  { n: "Green apple iced tea", unit: "glass", base: 1, cal: 110, p: 0, c: 27, f: 0 },
  { n: "Lemonade / nimbu pani (sweet)", unit: "glass", base: 1, cal: 100, p: 0, c: 25, f: 0 },
  { n: "Fresh lime soda (sweet)", unit: "glass", base: 1, cal: 90, p: 0, c: 22, f: 0 },
  { n: "Fresh lime soda (salted)", unit: "glass", base: 1, cal: 25, p: 0, c: 6, f: 0 },
  { n: "Virgin mojito", unit: "glass", base: 1, cal: 120, p: 0, c: 30, f: 0 },
  { n: "Strawberry mojito", unit: "glass", base: 1, cal: 130, p: 0, c: 32, f: 0 },
  { n: "Watermelon cooler", unit: "glass", base: 1, cal: 110, p: 1, c: 27, f: 0 },
  { n: "Cucumber mint cooler", unit: "glass", base: 1, cal: 70, p: 0, c: 17, f: 0 },
  { n: "Blue lagoon mocktail", unit: "glass", base: 1, cal: 140, p: 0, c: 35, f: 0 },
  { n: "Green apple mocktail", unit: "glass", base: 1, cal: 130, p: 0, c: 33, f: 0 },
  { n: "Cranberry mocktail", unit: "glass", base: 1, cal: 130, p: 0, c: 32, f: 0 },
  { n: "Summer punch (mixed fruit)", unit: "glass", base: 1, cal: 140, p: 1, c: 34, f: 0 },
  { n: "Fruit punch", unit: "glass", base: 1, cal: 150, p: 1, c: 36, f: 0 },
  { n: "Virgin piña colada", unit: "glass", base: 1, cal: 220, p: 1, c: 38, f: 6 },
  { n: "Cold coffee / frappe", unit: "glass", base: 1, cal: 250, p: 5, c: 35, f: 9 },
  { n: "Chocolate milkshake", unit: "glass", base: 1, cal: 320, p: 8, c: 45, f: 12 },
  { n: "Oreo shake", unit: "glass", base: 1, cal: 380, p: 8, c: 52, f: 15 },
  { n: "Energy drink (Red Bull etc.)", unit: "can (250ml)", base: 1, cal: 115, p: 0, c: 28, f: 0 },
  { n: "Coconut water", unit: "ml", base: 100, cal: 19, p: 0.7, c: 3.7, f: 0.2 },
  { n: "Orange juice", unit: "ml", base: 100, cal: 47, p: 0.7, c: 11, f: 0.2 },
  // fresh fruit juices — no added sugar (per glass ≈ 250 ml)
  { n: "Fresh orange juice (no sugar)", unit: "glass", base: 1, cal: 110, p: 2, c: 25, f: 0.5 },
  { n: "Mosambi (sweet lime) juice (no sugar)", unit: "glass", base: 1, cal: 100, p: 1.5, c: 23, f: 0.3 },
  { n: "Watermelon juice (no sugar)", unit: "glass", base: 1, cal: 90, p: 2, c: 21, f: 0.4 },
  { n: "Pomegranate juice (no sugar)", unit: "glass", base: 1, cal: 135, p: 2, c: 33, f: 1 },
  { n: "Pineapple juice (no sugar)", unit: "glass", base: 1, cal: 130, p: 1, c: 32, f: 0.3 },
  { n: "Apple juice (no sugar)", unit: "glass", base: 1, cal: 115, p: 0.5, c: 28, f: 0.3 },
  { n: "Grape juice (no sugar)", unit: "glass", base: 1, cal: 150, p: 1, c: 37, f: 0.4 },
  { n: "Carrot juice (no sugar)", unit: "glass", base: 1, cal: 95, p: 2, c: 22, f: 0.5 },
  { n: "Beetroot juice (no sugar)", unit: "glass", base: 1, cal: 110, p: 3, c: 25, f: 0.3 },
  { n: "ABC juice (apple-beet-carrot, no sugar)", unit: "glass", base: 1, cal: 120, p: 2, c: 27, f: 0.5 },
  { n: "Mixed fruit juice (no sugar)", unit: "glass", base: 1, cal: 120, p: 1.5, c: 28, f: 0.5 },
  { n: "Cola", unit: "ml", base: 100, cal: 42, p: 0, c: 11, f: 0 },
  { n: "Diet Coke (can, 330 ml)", unit: "can", base: 1, cal: 1, p: 0, c: 0, f: 0 },
  { n: "Pepsi Zero Sugar (can, 330 ml)", unit: "can", base: 1, cal: 0, p: 0, c: 0, f: 0 },
  { n: "Beer", unit: "ml", base: 100, cal: 43, p: 0.5, c: 3.6, f: 0 },
  { n: "Wine", unit: "ml", base: 100, cal: 83, p: 0.1, c: 2.7, f: 0 },
  { n: "Honey", unit: "tbsp", base: 1, cal: 64, p: 0, c: 17, f: 0 },
  { n: "Sugar", unit: "tsp", base: 1, cal: 16, p: 0, c: 4, f: 0 },
];

/* ---------- storage ---------- */
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return structuredClone(DEFAULT_DATA);
    const parsed = JSON.parse(raw);
    const data = { ...structuredClone(DEFAULT_DATA), ...parsed,
             goals: { ...DEFAULT_DATA.goals, ...(parsed.goals || {}) },
             weights: Array.isArray(parsed.weights) ? parsed.weights : [],
             expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
             trips: Array.isArray(parsed.trips) ? parsed.trips : [],
             customFoods: Array.isArray(parsed.customFoods) ? parsed.customFoods : [],
             favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
             currency: parsed.currency || "₹" };
    migrateGoals(data.goals);
    return data;
  } catch { return structuredClone(DEFAULT_DATA); }
}
// one-time tidy-ups for older saved data
function migrateGoals(g) {
  if (g && g.waterGoal === 2500) g.waterGoal = 3000; // bump the old 2.5 L default to 3 L
}
function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify(DATA));
  if (typeof cloudOnSave === "function") cloudOnSave();
}

let DATA = load();

/* ---------- date helpers ---------- */
let viewDate = new Date();
const pad = (n) => String(n).padStart(2, "0");
function keyOf(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function isToday(d) { return keyOf(d) === keyOf(new Date()); }
function dayData() {
  const k = keyOf(viewDate);
  if (!DATA.days[k]) DATA.days[k] = { workouts: [], meals: [], cardio: [] };
  const dd = DATA.days[k];
  if (!dd.cardio) dd.cardio = [];
  if (!dd.activity) dd.activity = [];
  if (dd.water == null) dd.water = 0;
  return dd;
}
function uid() { return Math.random().toString(36).slice(2, 10); }

/* ---------- totals ---------- */
function totals() {
  const d = dayData();
  const eaten = d.meals.reduce((s, m) => s + (+m.calories || 0), 0);
  const protein = d.meals.reduce((s, m) => s + (+m.protein || 0), 0);
  const carbs = d.meals.reduce((s, m) => s + (+m.carbs || 0), 0);
  const fat = d.meals.reduce((s, m) => s + (+m.fat || 0), 0);
  const burned = d.workouts.reduce((s, w) => s + (+w.burned || 0), 0)
               + d.cardio.reduce((s, c) => s + (+c.burned || 0), 0)
               + d.activity.reduce((s, a) => s + (+a.kcal || 0), 0);
  const steps = d.activity.reduce((s, a) => s + (+a.steps || 0), 0)
              + d.cardio.reduce((s, c) => s + (+c.steps || 0), 0);
  return { eaten, protein, carbs, fat, burned, steps };
}

/* ---------- weight / plan helpers ---------- */
function latestWeight() {
  if (!DATA.weights.length) return null;
  const sorted = [...DATA.weights].sort((a, b) => (a.date < b.date ? -1 : 1));
  return sorted[sorted.length - 1].kg;
}

function estimateCardioKcal(met, minutes) {
  const kg = +DATA.goals.weight || latestWeight() || +DATA.goals.startWeight || 75;
  return Math.round((met * 3.5 * kg / 200) * minutes * 0.85); // 0.85 = keep it conservative
}

function estimateStepKcal(steps) {
  const per1000 = +DATA.goals.stepKcalPer1000 || 39; // tunable in Goals to match your fitness app
  return Math.round((steps * per1000) / 1000);
}

// the day the plan began — used to anchor the (fixed) target date
function planStartDate() {
  const g = DATA.goals;
  if (g.startDate) return new Date(g.startDate + "T12:00:00");
  if (DATA.weights.length) {
    const earliest = [...DATA.weights].sort((a, b) => (a.date < b.date ? -1 : 1))[0].date;
    return new Date(earliest + "T12:00:00");
  }
  const keys = Object.keys(DATA.days).sort();
  if (keys.length) return new Date(keys[0] + "T12:00:00");
  return new Date();
}

function planInfo() {
  const g = DATA.goals;
  const start = +g.startWeight || +g.weight || 0;
  const target = +g.targetWeight || 0;
  const cur = latestWeight() ?? (+g.weight || start);
  const rate = +g.weeklyRate || 0.5;
  const toLose = Math.max(cur - target, 0);
  // target date is FIXED: anchored to the start date + the full plan duration
  // (start weight → target at the planned rate), so it doesn't drift day to day
  const startDate = planStartDate();
  const totalWeeks = rate > 0 ? Math.ceil(Math.max(start - target, 0) / rate) : 0;
  const eta = new Date(startDate); eta.setDate(eta.getDate() + totalWeeks * 7);
  // weeks remaining counts down from today toward that fixed date
  const weeks = Math.max(0, Math.ceil((eta - new Date()) / (7 * 86400000)));
  const pct = start > target ? Math.min(Math.max((start - cur) / (start - target), 0), 1) : 0;
  return { start, target, cur, rate, weeks, eta, pct, toLose, startDate, totalWeeks };
}

function suggestedCalories(kg, rate) {
  const w = kg || latestWeight() || +DATA.goals.weight || 75;
  const r = rate || +DATA.goals.weeklyRate || 0.5;
  const maintenance = w * 31;          // rough, moderately active
  const deficit = (r * 7700) / 7;      // ~7700 kcal per kg
  return Math.max(1200, Math.round((maintenance - deficit) / 10) * 10);
}

function milestones() {
  const { start, target, rate, startDate } = planInfo();
  const cur = latestWeight() ?? start;
  if (start <= target || rate <= 0) return [];
  const out = [];
  let w = start, wk = 0;
  while (w > target + 0.0001 && wk < 104) {
    wk++; w = Math.max(start - rate * wk, target);
    // milestone dates anchored to the start date, not today (so they stay put)
    const date = new Date(startDate); date.setDate(date.getDate() + wk * 7);
    out.push({ week: wk, weight: Math.round(w * 10) / 10, date, achieved: cur <= w + 0.0001 });
  }
  return out;
}

/* ---------- weekly aggregation (Mon–Sun) ---------- */
function weekRange(ref = new Date()) {
  const d = new Date(ref); const dow = (d.getDay() + 6) % 7; // Mon = 0
  const mon = new Date(d); mon.setDate(d.getDate() - dow); mon.setHours(0, 0, 0, 0);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23, 59, 59, 999);
  return { mon, sun };
}
function weekLabel(ref = new Date()) {
  const { mon, sun } = weekRange(ref);
  const f = (d) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${f(mon)} – ${f(sun)}`;
}
function weekStats(ref = new Date()) {
  const { mon, sun } = weekRange(ref);
  let cardioMin = 0, strength = 0, cardioKcal = 0, calSum = 0, calDays = 0, steps = 0;
  Object.entries(DATA.days).forEach(([k, dd]) => {
    const dt = new Date(k + "T12:00:00");
    if (dt < mon || dt > sun) return;
    (dd.cardio || []).forEach((c) => { cardioMin += +c.minutes || 0; cardioKcal += +c.burned || 0; steps += +c.steps || 0; });
    (dd.activity || []).forEach((a) => { steps += +a.steps || 0; });
    // Functional & Abs are conditioning, not strength — don't count them toward the strength goal
    strength += (dd.workouts || []).filter((w) => !["Functional", "Abs"].includes(w.name)).length;
    const eaten = (dd.meals || []).reduce((s, m) => s + (+m.calories || 0), 0);
    if (eaten > 0) { calSum += eaten; calDays++; }
  });
  return { cardioMin, strength, cardioKcal, steps, avgCal: calDays ? Math.round(calSum / calDays) : 0 };
}

/* ---------- strength analytics (volume + personal bests) ---------- */
const setVolume = (st) => (+st.reps || 0) * (+st.weight || 0);
const exVolume = (e) => (e.sets || []).reduce((s, st) => s + setVolume(st), 0);
// total reps×weight lifted across the given week
function weekVolume(ref = new Date()) {
  const { mon, sun } = weekRange(ref); let vol = 0;
  Object.entries(DATA.days).forEach(([k, dd]) => {
    const dt = new Date(k + "T12:00:00"); if (dt < mon || dt > sun) return;
    (dd.workouts || []).forEach((w) => (w.exercises || []).forEach((e) => { vol += exVolume(e); }));
  });
  return vol;
}
// heaviest set per exercise across all history, sorted by weight desc
function personalBests() {
  const best = {};
  Object.values(DATA.days).forEach((dd) => (dd.workouts || []).forEach((w) => (w.exercises || []).forEach((e) => {
    const name = (e.name || "").trim(); if (!name) return;
    (e.sets || []).forEach((st) => {
      const wt = +st.weight || 0; if (wt <= 0) return;
      if (!best[name] || wt > best[name].weight) best[name] = { weight: wt, reps: +st.reps || 0 };
    });
  })));
  return Object.entries(best).map(([name, b]) => ({ name, ...b })).sort((a, b) => b.weight - a.weight);
}
// name -> best weight, recomputed each render for the 🏆 badge
let pbMap = {};

/* ---------- insights (trends, streaks, projection) ---------- */
// average daily calories over the last N days, counting only days with food logged
function avgCalories(nDays) {
  const today = new Date(); let sum = 0, cnt = 0;
  for (let i = 0; i < nDays; i++) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    const dd = DATA.days[keyOf(d)]; if (!dd) continue;
    const eaten = (dd.meals || []).reduce((s, m) => s + (+m.calories || 0), 0);
    if (eaten > 0) { sum += eaten; cnt++; }
  }
  return cnt ? Math.round(sum / cnt) : 0;
}
// consecutive days (ending today) with any meal/workout/cardio logged; today may still be empty
function loggingStreak() {
  let streak = 0; const today = new Date();
  for (let i = 0; i < 730; i++) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    const dd = DATA.days[keyOf(d)];
    const logged = dd && ((dd.meals || []).length || (dd.workouts || []).length || (dd.cardio || []).length);
    if (logged) streak++;
    else if (i === 0) continue;       // today not logged yet — don't break the streak
    else break;
  }
  return streak;
}
// least-squares slope (kg/week) over the most recent weigh-ins, and projected goal date
function weightProjection() {
  const ws = [...DATA.weights].sort((a, b) => (a.date < b.date ? -1 : 1)).slice(-6);
  if (ws.length < 2) return null;
  const t0 = new Date(ws[0].date + "T12:00:00").getTime();
  const xs = ws.map((w) => (new Date(w.date + "T12:00:00").getTime() - t0) / (86400000 * 7));
  const ys = ws.map((w) => w.kg);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2; }
  if (den === 0) return null;
  return { slope: num / den }; // negative = losing
}

/* ============================================================
   RENDER
============================================================ */
const $ = (sel) => document.querySelector(sel);
const el = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };

// swipe a list row left to delete (taps and buttons still work; vertical scroll unaffected)
function enableSwipeDelete(node, onDelete) {
  let down = false, startX = 0, startY = 0, dx = 0, mode = 0; // mode: 0 undecided, 1 horizontal, 2 vertical
  node.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button")) return;
    down = true; startX = e.clientX; startY = e.clientY; dx = 0; mode = 0;
    node.style.transition = "none";
  });
  node.addEventListener("pointermove", (e) => {
    if (!down) return;
    const ddx = e.clientX - startX, ddy = e.clientY - startY;
    if (mode === 0) {
      if (Math.abs(ddx) < 8 && Math.abs(ddy) < 8) return;
      mode = Math.abs(ddx) > Math.abs(ddy) + 4 ? 1 : 2;
      if (mode === 1) { try { node.setPointerCapture(e.pointerId); } catch {} }
    }
    if (mode !== 1) return;
    dx = Math.min(0, ddx);
    node.style.transform = `translateX(${dx}px)`;
    node.classList.toggle("swipe-armed", dx < -80);
  });
  const finish = () => {
    if (!down) return; down = false;
    if (mode === 1) {
      node.style.transition = "transform .2s ease";
      if (dx < -80) { node.style.transform = "translateX(-110%)"; node.addEventListener("transitionend", onDelete, { once: true }); }
      else node.style.transform = "translateX(0)";
    } else node.style.transform = "";
    node.classList.remove("swipe-armed");
    mode = 0;
  };
  node.addEventListener("pointerup", finish);
  node.addEventListener("pointercancel", finish);
}

function renderDate() {
  const lbl = isToday(viewDate)
    ? "Today"
    : viewDate.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const dl = $("#date-label");
  dl.textContent = lbl + " ▾";          // caret hints it opens the day picker
  const past = !isToday(viewDate);
  dl.classList.toggle("jumpable", past); // accent colour when viewing a past day
  dl.title = "Pick a day";
  // don't allow future days
  $("#date-next").style.visibility = past ? "visible" : "hidden";
}

function renderDashboard() {
  const t = totals();
  const g = DATA.goals;
  const remaining = g.calories - t.eaten; // food only — exercise is not added back
  const over = remaining < 0;
  const remEl = $("#cal-remaining");
  remEl.textContent = Math.round(Math.abs(remaining));
  remEl.classList.toggle("over", over);
  if (remEl.nextElementSibling) remEl.nextElementSibling.textContent = over ? "kcal over" : "kcal left";
  $("#cal-goal").textContent = g.calories;
  $("#cal-eaten").textContent = Math.round(t.eaten);
  $("#cal-burned").textContent = Math.round(t.burned);

  // ring: fraction of goal eaten (0..1+)
  const frac = g.calories > 0 ? Math.min(t.eaten / g.calories, 1) : 0;
  const C = 327; // 2*pi*52
  $("#cal-ring").style.strokeDashoffset = C - C * frac;
  $("#cal-ring").style.stroke = t.eaten > g.calories ? "var(--danger)" : "var(--accent)";

  const setMacro = (id, val, goal) => {
    $(id).textContent = goal > 0 ? `${Math.round(val)}/${goal}g` : `${Math.round(val)}g`;
    const bar = $(id).parentElement.querySelector(".macro-bar span");
    bar.style.width = Math.min(goal > 0 ? (val / goal) * 100 : 0, 100) + "%";
    $(id).parentElement.classList.toggle("over", goal > 0 && val > goal);
  };
  setMacro("#m-protein", t.protein, g.protein);
  setMacro("#m-carbs", t.carbs, g.carbs);
  setMacro("#m-fat", t.fat, g.fat);

  // protein focus (key macro when cutting)
  const pf = $("#protein-focus");
  if (pf) {
    if (g.protein > 0) {
      pf.classList.remove("hidden");
      const left = Math.max(g.protein - t.protein, 0);
      pf.classList.toggle("done", left <= 0);
      pf.innerHTML = left > 0
        ? `🥩 <b>${Math.round(left)} g protein</b> to go <span class="muted">· ${Math.round(t.protein)}/${g.protein} g</span>`
        : `🥩 <b>Protein goal hit</b> <span class="muted">· ${Math.round(t.protein)}/${g.protein} g</span> ✓`;
    } else pf.classList.add("hidden");
  }

  // daily steps progress (walks + everyday activity)
  const stepsGoal = +g.stepsGoal || 0;
  const sc = $("#steps-card");
  if (sc) {
    if (stepsGoal > 0 || t.steps > 0) {
      sc.classList.remove("hidden");
      const pct = stepsGoal > 0 ? Math.min((t.steps / stepsGoal) * 100, 100) : 0;
      const goalTxt = stepsGoal > 0 ? ` / ${stepsGoal.toLocaleString()}` : "";
      sc.innerHTML = `
        <div class="steps-head">
          <span class="steps-ico">👟</span>
          <div class="grow"><b>${t.steps.toLocaleString()}</b><span class="muted">${goalTxt} steps</span></div>
          ${stepsGoal > 0 ? `<span class="steps-pct${t.steps >= stepsGoal ? " hit" : ""}">${Math.round(pct)}%</span>` : ""}
        </div>
        ${stepsGoal > 0 ? `<div class="steps-bar"><span style="width:${pct}%"></span></div>` : ""}`;
    } else sc.classList.add("hidden");
  }

  renderWaterCard();

  renderWeek();

  // motivational logging streak (only once it's worth showing)
  const streak = loggingStreak();
  const sb = $("#streak-banner");
  if (sb) {
    if (streak >= 2 && isToday(viewDate)) {
      sb.classList.remove("hidden");
      sb.innerHTML = `🔥 <b>${streak}-day streak</b><span>keep it going</span>`;
    } else sb.classList.add("hidden");
  }

  const d = dayData();
  // mini training list (workouts + cardio)
  renderTraining($("#dash-workout"), d, true);

  // mini meals
  const mWrap = $("#dash-meals"); mWrap.innerHTML = "";
  if (!d.meals.length && isToday(viewDate)) {
    const empty = el(`<div class="empty tappable">No food yet — tap to log ${guessMealType().toLowerCase()}</div>`);
    empty.onclick = () => $("#add-meal-btn").click();
    mWrap.appendChild(empty);
  } else if (!d.meals.length) {
    mWrap.appendChild(el(`<div class="empty">No food logged</div>`));
  }
  d.meals.forEach((m) => mWrap.appendChild(mealItem(m, true)));

  renderRecentDays();
}

// recent days as tappable cards (Today + last logged days), shown on dashboard,
// workouts and food so you can jump to any day and add details without the picker
function dayCard(dayDate, i, curKey) {
  const k = keyOf(dayDate);
  const dd = DATA.days[k];
  const eaten = dd ? (dd.meals || []).reduce((s, m) => s + (+m.calories || 0), 0) : 0;
  const acts = dd ? ((dd.workouts || []).length + (dd.cardio || []).length + (dd.activity || []).length) : 0;
  const lbl = i === 0 ? "Today" : i === 1 ? "Yesterday" : dayDate.toLocaleDateString(undefined, { weekday: "long" });
  const sub = dayDate.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const meta = [eaten ? `${Math.round(eaten)} kcal` : "", acts ? `${acts} logged` : ""].filter(Boolean).join(" · ") || "—";
  const row = el(`<div class="item tappable${k === curKey ? " active" : ""}">
    <div class="grow"><div class="title">${lbl} <span class="pill">${sub}</span></div><div class="sub">${meta}</div></div>
    <span class="chev">›</span>
  </div>`);
  row.onclick = () => { viewDate = new Date(dayDate); renderAll(); haptic(); const m = $("#main"); if (m) m.scrollTop = 0; };
  return row;
}

function fillRecentDays(wrap) {
  if (!wrap) return;
  wrap.innerHTML = "";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const curKey = keyOf(viewDate);
  let shown = 0;
  for (let i = 0; i <= 60 && shown < 12; i++) {
    const dayDate = new Date(today); dayDate.setDate(dayDate.getDate() - i);
    const k = keyOf(dayDate);
    const dd = DATA.days[k];
    const has = dd && ((dd.meals || []).length || (dd.workouts || []).length || (dd.cardio || []).length || (dd.activity || []).length);
    // always keep Today and the day currently being viewed; otherwise only logged days
    if (i !== 0 && !has && k !== curKey) continue;
    wrap.appendChild(dayCard(dayDate, i, curKey));
    shown++;
  }
}

function renderRecentDays() {
  // shown on Workouts & Food (to add details to past days), not on the home page
  fillRecentDays($("#wo-recent"));
  fillRecentDays($("#nut-recent"));
}

// water card: tap +250/−250, or type the exact total you drank
function renderWaterCard() {
  const wc = $("#water-card"); if (!wc) return;
  const goal = +DATA.goals.waterGoal || 0;
  const water = +dayData().water || 0;
  const glasses = Math.round(water / 250);
  const pct = goal > 0 ? Math.min((water / goal) * 100, 100) : 0;
  wc.innerHTML = `
    <div class="water-head">
      <span class="water-ico">💧</span>
      <input type="number" id="water-input" class="water-input" inputmode="numeric" value="${water}">
      <span class="water-unit">ml</span>
      <button class="water-btn" id="water-minus" type="button" aria-label="Remove a glass">−</button>
      <button class="water-btn add" id="water-plus" type="button">+250</button>
    </div>
    <div class="water-bar"><span style="width:${pct}%"></span></div>
    <div class="water-sub muted">${goal ? `${water.toLocaleString()} / ${goal.toLocaleString()} ml` : `${water.toLocaleString()} ml`} · ${glasses} glass${glasses === 1 ? "" : "es"}</div>`;
  const input = $("#water-input");
  const set = (val, syncInput) => { dayData().water = Math.max(0, Math.round(val) || 0); save(); refreshWaterUI(syncInput); };
  input.addEventListener("input", () => set(+input.value || 0, false));  // type exact amount
  $("#water-plus").onclick = () => { set((+dayData().water || 0) + 250, true); haptic(); };
  $("#water-minus").onclick = () => { set((+dayData().water || 0) - 250, true); haptic(); };
}
// refresh only the bar + label (and optionally the input) so typing isn't interrupted
function refreshWaterUI(syncInput) {
  const goal = +DATA.goals.waterGoal || 0;
  const water = +dayData().water || 0;
  const glasses = Math.round(water / 250);
  const pct = goal > 0 ? Math.min((water / goal) * 100, 100) : 0;
  const bar = document.querySelector("#water-card .water-bar span"); if (bar) bar.style.width = pct + "%";
  const sub = document.querySelector("#water-card .water-sub");
  if (sub) sub.textContent = `${goal ? `${water.toLocaleString()} / ${goal.toLocaleString()} ml` : `${water.toLocaleString()} ml`} · ${glasses} glass${glasses === 1 ? "" : "es"}`;
  const input = $("#water-input"); if (syncInput && input) input.value = water;
}

function renderTraining(wrap, d, mini) {
  wrap.innerHTML = "";
  if (!d.workouts.length && !d.cardio.length && !d.activity.length) {
    wrap.appendChild(el(`<div class="empty">${mini ? "No activity logged" : "Nothing yet. Log a workout, exercise or activity below."}</div>`));
    return;
  }
  d.workouts.forEach((w) => wrap.appendChild(workoutItem(w, mini)));
  d.cardio.forEach((c) => wrap.appendChild(cardioItem(c, mini)));
  d.activity.forEach((a) => wrap.appendChild(activityItem(a, mini)));
}

function activityItem(a, mini) {
  const sub = a.steps ? `${(+a.steps).toLocaleString()} steps` : "Everyday activity";
  const node = el(`
    <div class="item">
      <div class="grow">
        <div class="title">🚶 ${escapeHtml(a.label || "Activity")} <span class="pill">move</span></div>
        <div class="sub">${sub}</div>
      </div>
      ${a.kcal ? `<span class="kcal">−${Math.round(a.kcal)}</span>` : ""}
      ${mini ? "" : `<button class="del" aria-label="Delete">✕</button>`}
    </div>`);
  if (!mini) { node.querySelector(".del").onclick = () => removeActivity(a.id); enableSwipeDelete(node, () => removeActivity(a.id)); }
  return node;
}

function cardioItem(c, mini) {
  const node = el(`
    <div class="item">
      <div class="grow">
        <div class="title">${escapeHtml(c.type || "Cardio")} <span class="pill">cardio</span></div>
        <div class="sub">${(+c.minutes ? `${+c.minutes} min` : (+c.steps ? `${(+c.steps).toLocaleString()} steps` : "—"))}</div>
      </div>
      ${c.burned ? `<span class="kcal">−${Math.round(c.burned)}</span>` : ""}
      ${mini ? "" : `<div class="item-actions"><button class="edit" aria-label="Edit">✎</button><button class="del" aria-label="Delete">✕</button></div>`}
    </div>`);
  if (!mini) {
    node.querySelector(".del").onclick = () => removeCardio(c.id);
    node.querySelector(".edit").onclick = () => openCardioEdit(c);
    const g = node.querySelector(".grow");
    g.classList.add("tappable");
    g.onclick = () => openCardioEdit(c);
    enableSwipeDelete(node, () => removeCardio(c.id));
  }
  return node;
}

const compactK = (n) => n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k" : String(Math.round(n));
function stepsTile(val, goal) {
  const pct = goal > 0 ? Math.min((val / goal) * 100, 100) : 0;
  return `<div class="wtile">
    <div class="wt-num">${compactK(val)}${goal > 0 ? `<small>/${compactK(goal)}</small>` : ""}</div>
    <div class="wt-bar steps"><span style="width:${pct}%"></span></div>
    <div class="wt-lbl">Steps</div>
  </div>`;
}
function weekTile(val, goal, lbl) {
  const pct = goal > 0 ? Math.min((val / goal) * 100, 100) : 0;
  return `<div class="wtile">
    <div class="wt-num">${Math.round(val)}<small>/${goal || 0}</small></div>
    <div class="wt-bar"><span style="width:${pct}%"></span></div>
    <div class="wt-lbl">${lbl}</div>
  </div>`;
}

function renderWeek() {
  const w = weekStats(); const p = planInfo(); const g = DATA.goals;
  const toGo = p.cur && p.target ? Math.max(p.cur - p.target, 0) : 0;
  $("#week-card").innerHTML = `
    <div class="week-head"><b>This week</b><span class="muted">${weekLabel()}</span></div>
    <div class="week-tiles">
      ${weekTile(w.cardioMin, g.cardioGoal, "Cardio min")}
      ${weekTile(w.strength, g.strengthGoal, "Strength")}
      <div class="wtile"><div class="wt-num">${toGo.toFixed(1)}<small>kg</small></div><div class="wt-bar"></div><div class="wt-lbl">to goal</div></div>
    </div>`;
}

function exSetCount(e) { return Array.isArray(e.sets) ? e.sets.length : (+e.sets || 0); }
// short summary for an exercise: "3×" for sets, or "3×45s" when it's a timed hold
function exSummary(e) {
  const n = exSetCount(e);
  const secs = (e.sets || []).map((s) => +s.seconds || 0).filter(Boolean);
  if (secs.length) {
    const avg = Math.round(secs.reduce((a, b) => a + b, 0) / secs.length);
    return `${e.name} ${n}×${avg}s`;
  }
  return `${e.name}${n ? ` ${n}×` : ""}`;
}

function workoutItem(w, mini) {
  const exCount = w.exercises?.length || 0;
  const sub = exCount
    ? w.exercises.map((e) => exSummary(e)).filter(Boolean).join(", ")
    : "No exercises";
  // 🏆 when this workout holds the all-time best for one of its exercises
  const isPB = (w.exercises || []).some((e) => {
    const mx = pbMap[(e.name || "").trim()];
    return mx > 0 && (e.sets || []).some((st) => (+st.weight || 0) >= mx);
  });
  const node = el(`
    <div class="item">
      <div class="grow">
        <div class="title">${escapeHtml(w.name || "Workout")}${isPB ? ` <span class="pb-badge">🏆 PB</span>` : ""}</div>
        <div class="sub">${escapeHtml(sub)}</div>
      </div>
      ${w.burned ? `<span class="kcal">−${w.burned}</span>` : ""}
      ${mini ? "" : `<div class="item-actions"><button class="edit" aria-label="Edit">✎</button><button class="del" aria-label="Delete">✕</button></div>`}
    </div>`);
  if (!mini) {
    node.querySelector(".del").onclick = () => { removeWorkout(w.id); };
    node.querySelector(".edit").onclick = () => openWorkoutEdit(w);
    const g = node.querySelector(".grow");
    g.classList.add("tappable");
    g.onclick = () => openWorkoutEdit(w);
    enableSwipeDelete(node, () => removeWorkout(w.id));
  }
  return node;
}

// tiny P/C/F split bar (widths by calorie contribution)
function macroMiniBar(m) {
  const pc = (+m.protein || 0) * 4, cc = (+m.carbs || 0) * 4, fc = (+m.fat || 0) * 9;
  const t = pc + cc + fc;
  if (t <= 0) return "";
  const w = (x) => `${((x / t) * 100).toFixed(0)}%`;
  return `<div class="macro-mini">
    <span style="width:${w(pc)};background:var(--protein)"></span>
    <span style="width:${w(cc)};background:var(--carbs)"></span>
    <span style="width:${w(fc)};background:var(--fat)"></span>
  </div>`;
}
function mealItem(m, mini) {
  const macros = [m.protein && `P${m.protein}`, m.carbs && `C${m.carbs}`, m.fat && `F${m.fat}`]
    .filter(Boolean).join(" · ");
  const node = el(`
    <div class="item">
      <div class="grow">
        <div class="title">${escapeHtml(m.name || "Food")} <span class="pill">${m.type || ""}</span></div>
        <div class="sub">${macros || "&nbsp;"}</div>
        ${macroMiniBar(m)}
      </div>
      <span class="kcal">${Math.round(m.calories || 0)}</span>
      ${mini ? "" : `<div class="item-actions"><button class="edit" aria-label="Edit">✎</button><button class="del" aria-label="Delete">✕</button></div>`}
    </div>`);
  if (!mini) {
    node.querySelector(".del").onclick = () => { removeMeal(m.id); };
    node.querySelector(".edit").onclick = () => openMealEdit(m);
    const g = node.querySelector(".grow");
    g.classList.add("tappable");
    g.onclick = () => openMealEdit(m);
    enableSwipeDelete(node, () => removeMeal(m.id));
  }
  return node;
}

// most recent workout from any earlier day (for the repeat shortcut)
function lastWorkout() {
  const keys = Object.keys(DATA.days).sort().reverse();
  for (const k of keys) {
    if (k === keyOf(viewDate)) continue;
    const ws = DATA.days[k].workouts || [];
    if (ws.length) return ws[ws.length - 1];
  }
  return null;
}
function repeatLastWorkout() {
  const w = lastWorkout();
  if (!w) return;
  const copy = { ...w, id: uid(), exercises: (w.exercises || []).map((e) => ({ ...e, sets: (e.sets || []).map((s) => ({ ...s })) })) };
  dayData().workouts.push(copy);
  save(); renderAll(); haptic();
  toast(`Repeated "${w.name}" workout`);
}

function renderWorkouts() {
  const d = dayData();
  renderTraining($("#workout-list"), d, false);
  // when no strength workout is logged yet, offer to repeat the last one
  if (!d.workouts.length) {
    const w = lastWorkout();
    if (w) {
      const b = el(`<button class="ghost-btn" type="button">↻ Repeat last: ${escapeHtml(w.name)}</button>`);
      b.onclick = repeatLastWorkout;
      $("#workout-list").appendChild(b);
    }
  }
}

function weightChartSVG() {
  const ws = [...DATA.weights].sort((a, b) => (a.date < b.date ? -1 : 1));
  if (ws.length < 2) return `<div class="empty">Log your weight a few times to see your trend.</div>`;
  const W = 300, H = 90, P = 8;
  const tgt = +DATA.goals.targetWeight || null;
  const vals = ws.map((x) => x.kg).concat(tgt ? [tgt] : []);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (min === max) { min -= 1; max += 1; }
  const x = (i) => P + (i * (W - 2 * P)) / (ws.length - 1);
  const y = (v) => P + ((max - v) * (H - 2 * P)) / (max - min);
  const pts = ws.map((p, i) => `${x(i).toFixed(1)},${y(p.kg).toFixed(1)}`).join(" ");
  // trailing moving average (smooths daily water-weight noise) — window up to 5
  const ma = ws.map((_, i) => {
    const from = Math.max(0, i - 4);
    const slice = ws.slice(from, i + 1);
    return slice.reduce((s, p) => s + p.kg, 0) / slice.length;
  });
  const maPts = ma.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const tgtY = tgt != null ? y(tgt).toFixed(1) : null;
  return `<svg viewBox="0 0 ${W} ${H}" class="wchart" preserveAspectRatio="none">
    ${tgt != null ? `<line class="tgt-line" x1="0" y1="${tgtY}" x2="${W}" y2="${tgtY}"></line>` : ""}
    <polyline class="wline" points="${pts}"></polyline>
    <polyline class="wline-ma" points="${maPts}"></polyline>
    ${ws.map((p, i) => `<circle class="wdot" cx="${x(i).toFixed(1)}" cy="${y(p.kg).toFixed(1)}" r="2.6"></circle>`).join("")}
  </svg>
  <div class="wchart-legend"><span class="lg-raw">● actual</span><span class="lg-ma">— trend (avg)</span></div>`;
}

let progressWeek = new Date();

// "Insights" card: calorie adherence, streak, and projection from actual weight trend
function insightsCardHTML(cur) {
  const g = DATA.goals;
  const avg7 = avgCalories(7), avg30 = avgCalories(30);
  const goal = +g.calories || 0;
  const diff7 = avg7 && goal ? avg7 - goal : 0;
  const adh = avg7 && goal
    ? `<span class="${diff7 <= 0 ? "good" : "bad"}">${diff7 <= 0 ? "−" : "+"}${Math.abs(diff7)} vs goal</span>`
    : `<span class="muted">log meals to see this</span>`;
  const streak = loggingStreak();

  const proj = weightProjection();
  const target = +g.targetWeight || 0;
  let projText, projClass = "muted";
  if (!proj || !target || !cur) {
    projText = "Log your weight a few times to project a date.";
  } else if (cur <= target) {
    projText = "🎉 You're at or below target.";
  } else if (proj.slope < -0.01) {
    const weeks = (cur - target) / -proj.slope;
    const eta = new Date(); eta.setDate(eta.getDate() + Math.round(weeks * 7));
    projText = `At your real pace (${Math.abs(proj.slope).toFixed(2)} kg/wk) you'll hit ${target} kg around ${eta.toLocaleDateString(undefined, { month: "short", year: "numeric" })}.`;
    projClass = "good";
  } else {
    projText = "No downward trend in recent weigh-ins — pace is flat or rising.";
    projClass = "bad";
  }

  return `
    <div class="card">
      <div class="week-head"><b>Insights</b><span class="muted">last 7 days</span></div>
      <div class="insight-grid">
        <div class="ins"><div class="ins-num">${avg7 || "—"}</div><div class="ins-lbl">avg kcal / day</div><div class="ins-sub">${adh}</div></div>
        <div class="ins"><div class="ins-num">${avg30 || "—"}</div><div class="ins-lbl">30-day avg</div><div class="ins-sub muted">vs ${goal || "—"} goal</div></div>
        <div class="ins"><div class="ins-num">${streak}🔥</div><div class="ins-lbl">day streak</div><div class="ins-sub muted">logged in a row</div></div>
      </div>
      <div class="proj ${projClass}">${projText}</div>
    </div>`;
}

// 7-day calorie bar chart vs goal
function calorieChartHTML() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const goal = +DATA.goals.calories || 0;
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const dd = DATA.days[keyOf(d)];
    const eaten = dd ? (dd.meals || []).reduce((s, m) => s + (+m.calories || 0), 0) : 0;
    days.push({ d, eaten });
  }
  const max = Math.max(goal, ...days.map((x) => x.eaten), 1) * 1.12;
  const goalPct = goal ? (goal / max) * 100 : 0;
  const bars = days.map((x) => {
    const h = Math.max((x.eaten / max) * 100, x.eaten ? 3 : 0);
    const over = goal && x.eaten > goal;
    return `<div class="cbar-col" title="${Math.round(x.eaten)} kcal"><div class="cbar ${over ? "over" : ""}" style="height:${h}%"></div></div>`;
  }).join("");
  const labels = days.map((x) => `<span>${x.d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 1)}</span>`).join("");
  return `
    <div class="card">
      <div class="week-head"><b>Last 7 days</b><span class="muted">${goal ? `goal ${goal} kcal` : ""}</span></div>
      <div class="cchart">
        <div class="cbars">${goal ? `<div class="cgoal" style="bottom:${goalPct}%"></div>` : ""}${bars}</div>
        <div class="clabels">${labels}</div>
      </div>
    </div>`;
}

// "Strength" card: this week's lifted volume + all-time personal bests
function strengthCardHTML() {
  const vol = weekVolume(progressWeek);
  const pbs = personalBests().slice(0, 5);
  const atCur = weekRange(progressWeek).mon.getTime() === weekRange(new Date()).mon.getTime();
  return `
    <div class="card">
      <div class="week-head"><b>Strength</b><span class="muted">${compactK(vol)} kg ${atCur ? "this week" : "that week"}</span></div>
      ${pbs.length ? `<div class="pb-list">${pbs.map((p) => `
        <div class="pb-row">
          <span class="pb-name">${escapeHtml(p.name)}</span>
          <span class="pb-val">${p.weight} kg${p.reps ? ` × ${p.reps}` : ""}</span>
        </div>`).join("")}</div>` : `<div class="empty">Log gym sets with weights to track volume &amp; personal bests.</div>`}
    </div>`;
}

function renderProgress() {
  const p = planInfo(); const ms = milestones(); const w = weekStats(progressWeek); const g = DATA.goals;
  const cur = latestWeight() ?? (+g.weight || p.start);
  const pct = Math.round(p.pct * 100);
  const reached = cur && g.targetWeight && cur <= g.targetWeight;
  const atCurrentWeek = weekRange(progressWeek).mon.getTime() === weekRange(new Date()).mon.getTime();
  $("#progress-body").innerHTML = `
    <div class="card">
      <div class="week-head"><b>Weight</b><span class="muted">${cur ? cur + " kg" : "—"} → ${g.targetWeight || "—"} kg</span></div>
      <div class="prog-big"><span style="width:${pct}%"></span></div>
      <div class="prog-meta"><span>${pct}% there</span><span>${p.toLose.toFixed(1)} kg to go</span></div>
      <div class="muted small" style="margin-top:8px">${reached
        ? "🎉 Target reached — nice work!"
        : `~${p.weeks} weeks left · target ${p.eta.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`}</div>
      <div class="chart-wrap">${weightChartSVG()}</div>
    </div>
    ${insightsCardHTML(cur)}
    ${calorieChartHTML()}
    <div class="card">
      <div class="month-nav">
        <button id="pw-prev" class="icon-btn" aria-label="Previous week">‹</button>
        <span>${atCurrentWeek ? "This week" : "Week of"} ${weekLabel(progressWeek)}</span>
        <button id="pw-next" class="icon-btn" aria-label="Next week" style="visibility:${atCurrentWeek ? "hidden" : "visible"}">›</button>
      </div>
      <div class="week-tiles">
        ${weekTile(w.cardioMin, g.cardioGoal, "Cardio min")}
        ${weekTile(w.strength, g.strengthGoal, "Strength")}
        ${stepsTile(w.steps, (+g.stepsGoal || 0) * 7)}
        <div class="wtile"><div class="wt-num">${w.avgCal || "—"}</div><div class="wt-bar"></div><div class="wt-lbl">avg kcal</div></div>
      </div>
    </div>
    ${strengthCardHTML()}
    <div class="card">
      <div class="week-head"><b>Milestones</b><span class="muted">${g.weeklyRate || 0.5} kg/week</span></div>
      <div class="ms-list">${ms.length ? ms.map((m) => `
        <div class="ms-row ${m.achieved ? "done" : ""}">
          <span class="ms-check">${m.achieved ? "✓" : ""}</span>
          <span class="ms-wk">Week ${m.week}</span>
          <span class="ms-wt">${m.weight} kg</span>
          <span class="ms-date">${m.date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
        </div>`).join("") : `<div class="empty">Set a start &amp; target weight in Goals.</div>`}
      </div>
    </div>`;

  $("#pw-prev").onclick = () => { progressWeek.setDate(progressWeek.getDate() - 7); renderProgress(); };
  $("#pw-next").onclick = () => {
    if (weekRange(progressWeek).mon.getTime() === weekRange(new Date()).mon.getTime()) return;
    progressWeek.setDate(progressWeek.getDate() + 7); renderProgress();
  };
}

// the calendar day before the one being viewed
function prevDayKey() { const d = new Date(viewDate); d.setDate(d.getDate() - 1); return keyOf(d); }
// duplicate the previous day's meals onto the current day
function copyYesterdayMeals() {
  const prev = DATA.days[prevDayKey()];
  if (!prev || !(prev.meals || []).length) return;
  const today = dayData();
  prev.meals.forEach((m) => today.meals.push({ ...m, id: uid() }));
  save(); renderAll(); haptic();
  toast(`Copied ${prev.meals.length} item${prev.meals.length > 1 ? "s" : ""} from the day before`);
}

function renderNutrition() {
  const t = totals();
  const d = dayData();
  $("#nut-eaten").textContent = Math.round(t.eaten);
  // count distinct meal sittings (Breakfast/Lunch/Dinner/Snack), not individual items
  $("#nut-count").textContent = new Set(d.meals.map((m) => m.type || "Other")).size;
  const wrap = $("#meal-list"); wrap.innerHTML = "";
  if (!d.meals.length) {
    wrap.appendChild(el(`<div class="empty">No food yet. Tap below to log a meal.</div>`));
    const prev = DATA.days[prevDayKey()];
    const n = prev ? (prev.meals || []).length : 0;
    if (n) {
      const b = el(`<button class="ghost-btn" id="copy-yday" type="button">⧉ Copy previous day's ${n} item${n > 1 ? "s" : ""}</button>`);
      b.onclick = copyYesterdayMeals;
      wrap.appendChild(b);
    }
    return;
  }
  // group entries by meal type, each with its own calorie subtotal
  const order = ["Breakfast", "Lunch", "Dinner", "Snack"];
  const groups = {};
  d.meals.forEach((m) => { const t = m.type || "Other"; (groups[t] = groups[t] || []).push(m); });
  const sections = [...order.filter((t) => groups[t]), ...Object.keys(groups).filter((t) => !order.includes(t))];
  sections.forEach((t) => {
    const items = groups[t];
    const sub = items.reduce((s, m) => s + (+m.calories || 0), 0);
    wrap.appendChild(el(`<div class="meal-group-head"><b>${escapeHtml(t)}</b><span>${Math.round(sub)} kcal</span></div>`));
    items.forEach((m) => wrap.appendChild(mealItem(m, false)));
  });
}

/* ============================================================
   EXPENSES
============================================================ */
let expenseMonth = new Date();

function monthKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; }
function monthLabel(d) { return d.toLocaleDateString(undefined, { month: "long", year: "numeric" }); }
function money(n) { return `${DATA.currency}${Math.round(+n || 0).toLocaleString()}`; }

function expensesForMonth() {
  const mk = monthKey(expenseMonth);
  return DATA.expenses
    .filter((e) => (e.date || "").slice(0, 7) === mk)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

const CAT_COLORS = { Travel: "var(--accent)", Randoms: "var(--carbs)", Sports: "var(--accent-2)" };

function renderExpenses() {
  $("#exp-month-label").textContent = monthLabel(expenseMonth);
  $("#exp-next").style.visibility = monthKey(expenseMonth) === monthKey(new Date()) ? "hidden" : "visible";

  const all = expensesForMonth();
  const list = all.filter((e) => e.kind !== "income");   // spending
  const incomes = all.filter((e) => e.kind === "income"); // earnings
  const spent = list.reduce((s, e) => s + (+e.amount || 0), 0);
  const earned = incomes.reduce((s, e) => s + (+e.amount || 0), 0);
  const net = spent - earned;
  const byCat = {}; EXPENSE_CATEGORIES.forEach((c) => (byCat[c] = 0));
  const byTravel = {}; TRAVEL_SUBS.forEach((s) => (byTravel[s] = 0));
  list.forEach((e) => {
    byCat[e.category] = (byCat[e.category] || 0) + (+e.amount || 0);
    if (e.category === "Travel" && e.sub) byTravel[e.sub] = (byTravel[e.sub] || 0) + (+e.amount || 0);
  });

  const catRows = EXPENSE_CATEGORIES.map((c) => {
    const amt = byCat[c] || 0;
    const pct = spent > 0 ? Math.round((amt / spent) * 100) : 0;
    return `<div class="cat-row">
        <div class="cat-top">
          <span class="cat-name"><i class="dot" style="background:${CAT_COLORS[c]}"></i>${c}</span>
          <span class="cat-amt">${money(amt)}</span>
        </div>
        <div class="cat-bar"><span style="width:${pct}%;background:${CAT_COLORS[c]}"></span></div>
      </div>`;
  }).join("");

  const travelSpent = byCat.Travel || 0;
  const travelRows = TRAVEL_SUBS.filter((s) => byTravel[s] > 0)
    .map((s) => `<div class="sub-row"><span>${s}</span><b>${money(byTravel[s])}</b></div>`).join("");

  $("#expenses-body").innerHTML = `
    <div class="card exp-total-card">
      <div class="exp-total">${money(net)}</div>
      <div class="muted small">net spent · ${monthLabel(expenseMonth)}</div>
      ${earned > 0 ? `<div class="net-line"><span>Spent ${money(spent)}</span><span class="earned">− Earned ${money(earned)}</span></div>` : ""}
    </div>
    <div class="card">
      <div class="week-head"><b>By category</b></div>
      ${catRows}
    </div>
    ${travelSpent > 0 ? `<div class="card">
      <div class="week-head"><b>Travel breakdown</b><span class="muted">${money(travelSpent)}</span></div>
      ${travelRows || `<div class="empty">No travel type set.</div>`}
    </div>` : ""}
    <div class="card">
      <div class="week-head"><b>Spends</b><span class="muted">${list.length}</span></div>
      <div class="exp-cols">
        <div class="exp-col">
          <div class="exp-col-h">Randoms + Sports</div>
          <div class="card-list" id="exp-list-other"></div>
        </div>
        <div class="exp-col">
          <div class="exp-col-h">Travel</div>
          <div class="card-list" id="exp-list-travel"></div>
        </div>
      </div>
    </div>
    ${incomes.length ? `<div class="card">
      <div class="week-head"><b>Earnings</b><span class="muted">${money(earned)}</span></div>
      <div class="card-list" id="exp-list-income"></div>
    </div>` : ""}`;

  const left = list.filter((e) => e.category !== "Travel");
  const right = list.filter((e) => e.category === "Travel");
  const lw = $("#exp-list-other"), rw = $("#exp-list-travel");
  if (!left.length) lw.appendChild(el(`<div class="empty">None</div>`));
  else left.forEach((e) => lw.appendChild(expenseCell(e)));
  if (!right.length) rw.appendChild(el(`<div class="empty">None</div>`));
  else right.forEach((e) => rw.appendChild(expenseCell(e)));
  if (incomes.length) incomes.forEach((e) => $("#exp-list-income").appendChild(expenseCell(e)));
}

function expenseCell(e) {
  const dateStr = new Date(e.date + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const income = e.kind === "income";
  const tag = income ? "Income" : (e.category === "Travel" ? (e.sub || "Travel") : e.category);
  const meta = (e.note ? escapeHtml(e.note) + " · " : "") + tag + " · " + dateStr;
  const amt = income ? `+${money(e.amount)}` : money(e.amount);
  const node = el(`
    <div class="item exp-cell">
      <div class="grow tappable">
        <div class="title money${income ? " income" : ""}">${amt}</div>
        <div class="sub">${meta}</div>
      </div>
      <div class="item-actions">
        <button class="edit" aria-label="Edit">✎</button>
        <button class="del" aria-label="Delete">✕</button>
      </div>
    </div>`);
  const openEdit = () => (income ? openIncomeEdit(e) : openExpenseEdit(e));
  node.querySelector(".grow").onclick = openEdit;
  node.querySelector(".edit").onclick = openEdit;
  node.querySelector(".del").onclick = () => removeExpense(e.id);
  return node;
}

function removeExpense(id) {
  if (!confirm("Delete this entry?")) return;
  DATA.expenses = DATA.expenses.filter((e) => e.id !== id);
  save(); renderExpenses();
}

function renderProfile() {
  const g = DATA.goals;
  $("#p-start").value = g.startWeight ?? "";
  $("#p-weight").value = (latestWeight() ?? g.weight) ?? "";
  $("#p-target").value = g.targetWeight ?? "";
  $("#p-rate").value = g.weeklyRate ?? "";
  $("#p-startdate").value = g.startDate || keyOf(planStartDate());
  $("#p-cal-goal").value = g.calories;
  $("#p-protein").value = g.protein;
  $("#p-carbs").value = g.carbs;
  $("#p-fat").value = g.fat;
  $("#p-cardio-goal").value = g.cardioGoal ?? "";
  $("#p-steps-goal").value = g.stepsGoal ?? "";
  $("#p-step-kcal").value = g.stepKcalPer1000 ?? 39;
  $("#p-water-goal").value = g.waterGoal ?? 3000;
  $("#p-strength-goal").value = g.strengthGoal ?? "";
  updatePlanReadout();
  if (typeof refreshSyncUI === "function") refreshSyncUI();
}

function updatePlanReadout() {
  const start = +$("#p-start").value || 0;
  const cur = +$("#p-weight").value || start;
  const target = +$("#p-target").value || 0;
  const rate = +$("#p-rate").value || 0;
  const box = $("#plan-readout");
  if (!cur || !target || !rate) {
    box.innerHTML = `<span class="muted small">Enter current, target and rate to see your plan.</span>`;
    return;
  }
  if (cur <= target) {
    box.innerHTML = `<b>🎉 You're at or below your target!</b>`;
    return;
  }
  // anchor the target date to the start weight + start date (fixed), matching Progress
  const base = start || cur;
  const totalWeeks = Math.ceil((base - target) / rate);
  const sd = $("#p-startdate").value;
  const startDate = sd ? new Date(sd + "T12:00:00") : new Date();
  const eta = new Date(startDate); eta.setDate(eta.getDate() + totalWeeks * 7);
  box.innerHTML = `
    <div><b>${(cur - target).toFixed(1)} kg</b> to go at ${rate} kg/week (${totalWeeks}-week plan).</div>
    <div>Target date: <b>${eta.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</b></div>
    <div>Suggested intake: <b>~${suggestedCalories(cur, rate)} kcal/day</b></div>`;
}

function renderAll() {
  pbMap = {}; personalBests().forEach((p) => (pbMap[p.name] = p.weight));
  renderDate();
  renderDashboard();
  renderWorkouts();
  renderNutrition();
  renderProgress();
  renderExpenses();
  renderTrips();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ============================================================
   MUTATIONS
============================================================ */
// delete immediately, then offer an Undo toast (less friction than a confirm dialog)
function removeWithUndo(list, id, label) {
  const i = list.findIndex((x) => x.id === id);
  if (i < 0) return;
  const [item] = list.splice(i, 1);
  save(); renderAll(); haptic();
  toast(`${label} deleted`, { actionLabel: "Undo", onAction: () => { list.splice(i, 0, item); save(); renderAll(); } });
}
function removeWorkout(id)  { removeWithUndo(dayData().workouts, id, "Workout"); }
function removeMeal(id)     { removeWithUndo(dayData().meals, id, "Food"); }
function removeCardio(id)   { removeWithUndo(dayData().cardio, id, "Exercise"); }
function removeActivity(id) { removeWithUndo(dayData().activity, id, "Activity"); }

/* ============================================================
   NAVIGATION
============================================================ */
const TITLES = { dashboard: "Today", workouts: "Workouts", nutrition: "Nutrition", progress: "Progress", expenses: "Expenses", trips: "Trips", profile: "Goals", more: "More" };
function showScreen(name) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.add("hidden"));
  $("#screen-" + name).classList.remove("hidden");
  // Progress, Goals & Trips live under the "More" tab, so keep More highlighted for them
  const tabName = (name === "progress" || name === "profile" || name === "trips") ? "more" : name;
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.screen === tabName));
  $("#screen-title").textContent = TITLES[name];
  // date switcher only relevant for day-based screens
  const dayBased = name === "dashboard" || name === "workouts" || name === "nutrition";
  $("#date-prev").style.display = dayBased ? "" : "none";
  $("#date-next").style.display = dayBased ? "" : "none";
  $("#date-label").style.display = dayBased ? "" : "none";
  if (name === "profile") renderProfile();
  if (name === "progress") renderProgress();
  if (name === "expenses") renderExpenses();
  if (name === "trips") { openTripId = null; renderTrips(); }
}
// rows inside the More screen open Spend / Trips
document.querySelectorAll("#screen-more .more-row").forEach((b) => {
  b.onclick = () => { haptic(8); showScreen(b.dataset.go); };
});

document.querySelectorAll(".tab").forEach((tab) => {
  tab.onclick = () => { haptic(8); showScreen(tab.dataset.screen); };
});

$("#date-prev").onclick = () => { viewDate.setDate(viewDate.getDate() - 1); renderAll(); };
$("#date-next").onclick = () => {
  if (isToday(viewDate)) return;
  viewDate.setDate(viewDate.getDate() + 1); renderAll();
};
// tap the date to open the vertical day picker
$("#date-label").onclick = () => openDatePicker();

// build a scrollable list of recent days (newest first) to jump between
function openDatePicker() {
  const wrap = $("#date-list");
  wrap.innerHTML = "";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  // go back to the oldest logged day, but always show at least 14 days
  let earliest = new Date(today); earliest.setDate(earliest.getDate() - 13);
  Object.keys(DATA.days).forEach((k) => {
    const d = new Date(k + "T12:00:00"); d.setHours(0, 0, 0, 0);
    if (d < earliest) earliest = d;
  });
  const curKey = keyOf(viewDate);
  const yKey = keyOf(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1));
  let count = 0;
  for (let d = new Date(today); d >= earliest && count < 400; d.setDate(d.getDate() - 1), count++) {
    const dayDate = new Date(d);
    const k = keyOf(dayDate);
    const dd = DATA.days[k];
    const eaten = dd ? (dd.meals || []).reduce((s, m) => s + (+m.calories || 0), 0) : 0;
    const acts = dd ? ((dd.workouts || []).length + (dd.cardio || []).length + (dd.activity || []).length) : 0;
    const lbl = k === keyOf(today) ? "Today" : k === yKey ? "Yesterday"
      : dayDate.toLocaleDateString(undefined, { weekday: "long" });
    const sub = dayDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    const meta = [eaten ? `${Math.round(eaten)} kcal` : "", acts ? `${acts} logged` : ""].filter(Boolean).join(" · ") || "—";
    const row = el(`<button type="button" class="date-row${k === curKey ? " active" : ""}">
      <span class="dr-main"><b>${lbl}</b><small>${sub}</small></span>
      <span class="dr-meta">${meta}</span>
    </button>`);
    row.onclick = () => { viewDate = dayDate; closeModal("#date-modal"); renderAll(); haptic(); };
    wrap.appendChild(row);
  }
  openModal("#date-modal");
}

/* ============================================================
   MODALS
============================================================ */
function openModal(id) { $(id).classList.remove("hidden"); }
function closeModal(id) { $(id).classList.add("hidden"); }
document.querySelectorAll("[data-close]").forEach((b) => {
  b.onclick = () => b.closest(".modal-backdrop").classList.add("hidden");
});
document.querySelectorAll(".modal-backdrop").forEach((m) => {
  m.addEventListener("click", (e) => { if (e.target === m) m.classList.add("hidden"); });
});

/* ---------- workout modal ---------- */
// rebuild the exercise autocomplete with the chosen day's moves first
function fillExerciseList(type) {
  const pri = EXERCISES_BY_TYPE[type] || [];
  const ordered = [...new Set([...pri, ...EXERCISES])];
  $("#exercise-list").innerHTML = ordered.map((n) => `<option value="${escapeHtml(n)}"></option>`).join("");
}
fillExerciseList("Push");

function normalizeSets(ex) {
  if (Array.isArray(ex.sets)) return ex.sets.length ? ex.sets : [{}];
  if (ex.sets) return Array.from({ length: +ex.sets }, () => ({ reps: ex.reps ?? null, weight: ex.weight ?? null }));
  if (ex.reps != null || ex.weight != null) return [{ reps: ex.reps ?? null, weight: ex.weight ?? null }];
  return [{}];
}
function renumberSets(list) {
  [...list.querySelectorAll(".set-n")].forEach((s, i) => (s.textContent = i + 1));
}
function setRow(set = {}, n = 1) {
  const row = el(`
    <div class="set-row">
      <span class="set-n">${n}</span>
      <span class="set-lift">
        <input class="s-reps" type="number" inputmode="numeric" placeholder="reps" value="${set.reps ?? ""}">
        <span class="set-x">×</span>
        <input class="s-kg" type="number" inputmode="decimal" placeholder="kg" title="Total weight lifted — barbell: full bar load; dumbbells: one dumbbell" value="${set.weight ?? ""}">
      </span>
      <input class="s-sec" type="number" inputmode="numeric" placeholder="seconds held" title="Hold time in seconds — for plank, wall sit, etc." value="${set.seconds ?? ""}">
      <button class="set-del" type="button" aria-label="Remove set">✕</button>
    </div>`);
  row.querySelector(".set-del").onclick = () => { const list = row.parentElement; row.remove(); renumberSets(list); recalcWorkoutBurn(); };
  // editing reps, weight or hold-time should refresh the calorie estimate too
  row.querySelector(".s-reps").addEventListener("input", recalcWorkoutBurn);
  row.querySelector(".s-kg").addEventListener("input", recalcWorkoutBurn);
  row.querySelector(".s-sec").addEventListener("input", recalcWorkoutBurn);
  return row;
}
// timed-hold exercises log seconds instead of reps×weight
const HOLD_EXERCISES = ["plank", "side plank", "wall sit", "hollow hold", "l-sit", "dead hang"];
const isHoldExercise = (name) => HOLD_EXERCISES.includes((name || "").trim().toLowerCase());

function exerciseBlock(ex = {}) {
  const block = el(`
    <div class="ex-block">
      <div class="ex-head">
        <input class="ex-name-input" list="exercise-list" placeholder="Search exercise…" value="${escapeHtml(ex.name || "")}">
        <button class="ex-del" type="button" aria-label="Remove exercise">✕</button>
      </div>
      <div class="set-list"></div>
      <button class="add-set" type="button">+ Set</button>
    </div>`);
  const list = block.querySelector(".set-list");
  normalizeSets(ex).forEach((s, i) => list.appendChild(setRow(s, i + 1)));
  // show the seconds field (and hide reps×kg) only for hold exercises like plank / wall sit
  const nameInput = block.querySelector(".ex-name-input");
  const refreshMode = () => block.classList.toggle("hold-mode", isHoldExercise(nameInput.value));
  nameInput.addEventListener("input", () => { refreshMode(); recalcWorkoutBurn(); });
  refreshMode();
  block.querySelector(".ex-del").onclick = () => { block.remove(); recalcWorkoutBurn(); };
  block.querySelector(".add-set").onclick = () => {
    const rows = list.querySelectorAll(".set-row");
    const last = rows[rows.length - 1];
    // copy the last set so repeated sets need no typing
    const prev = last ? { reps: last.querySelector(".s-reps").value, weight: last.querySelector(".s-kg").value, seconds: last.querySelector(".s-sec").value } : {};
    list.appendChild(setRow(prev, rows.length + 1));
    recalcWorkoutBurn();
  };
  return block;
}

let editingWorkoutId = null;
let gymType = "Push";
let workoutBurnTouched = false;

// conservative estimate: a base cost per set (scaled by body weight) plus a
// bonus for the volume (reps × weight) actually lifted, so heavier sets count more
function recalcWorkoutBurn() {
  if (workoutBurnTouched) return;
  const bw = +DATA.goals.weight || latestWeight() || +DATA.goals.startWeight || 75;
  let est = 0, sets = 0;
  $("#exercise-editor").querySelectorAll(".set-row").forEach((r) => {
    const reps = +r.querySelector(".s-reps").value || 0;
    const weight = +r.querySelector(".s-kg").value || 0;
    const sec = +r.querySelector(".s-sec").value || 0;
    if (!reps && !weight && !sec) return;       // ignore blank rows
    sets++;
    est += 4 * (bw / 75);                        // base effort per set (kept low on purpose)
    if (weight) est += (reps * weight) / 260;    // weighted sets — heavier burns more
    else est += reps * 0.15 * (bw / 75);         // bodyweight reps (high knees, crunches) — small per-rep
    est += (sec * 3.2 * 3.5 * bw / 200) / 60;    // isometric holds — plank, wall sit (conservative)
  });
  est = Math.round(est);
  $("#w-burned").value = est || "";
  $("#w-burn-hint").textContent = est
    ? `≈ ${est} kcal from ${sets} set${sets === 1 ? "" : "s"} (rough — edit if you like)`
    : "Add sets (reps×kg or a hold in seconds) and an estimate appears here.";
}
function setGymType(t) {
  gymType = t;
  $("#w-type-seg").querySelectorAll("button").forEach((x) => x.classList.toggle("active", x.dataset.type === t));
  fillExerciseList(t); // surface this day's exercises first in the picker
}
$("#w-type-seg").querySelectorAll("button").forEach((b) => { b.onclick = () => setGymType(b.dataset.type); });
$("#w-burned").addEventListener("input", () => { workoutBurnTouched = true; });

$("#add-workout-btn").onclick = () => {
  editingWorkoutId = null;
  workoutBurnTouched = false;
  $("#w-burned").value = "";
  setGymType("Push");
  const editor = $("#exercise-editor"); editor.innerHTML = "";
  editor.appendChild(exerciseBlock());
  $("#workout-modal-title").textContent = "Log Gym";
  recalcWorkoutBurn();
  openModal("#workout-modal");
};
$("#add-exercise").onclick = () => { $("#exercise-editor").appendChild(exerciseBlock()); recalcWorkoutBurn(); };

function openWorkoutEdit(w) {
  editingWorkoutId = w.id;
  workoutBurnTouched = true; // keep the stored value
  $("#w-burned").value = w.burned || "";
  const types = ["Push", "Pull", "Legs", "Functional", "Abs", "Full body"];
  setGymType(types.includes(w.name) ? w.name : "Full body");
  const editor = $("#exercise-editor"); editor.innerHTML = "";
  const exs = w.exercises && w.exercises.length ? w.exercises : [{}];
  exs.forEach((ex) => editor.appendChild(exerciseBlock(ex)));
  $("#w-burn-hint").textContent = "";
  $("#workout-modal-title").textContent = "Edit Gym";
  openModal("#workout-modal");
}

$("#save-workout").onclick = () => {
  const exercises = [...$("#exercise-editor").querySelectorAll(".ex-block")].map((block) => {
    const name = block.querySelector(".ex-name-input").value.trim();
    const sets = [...block.querySelectorAll(".set-row")].map((r) => ({
      reps: r.querySelector(".s-reps").value ? +r.querySelector(".s-reps").value : null,
      weight: r.querySelector(".s-kg").value ? +r.querySelector(".s-kg").value : null,
      seconds: r.querySelector(".s-sec").value ? +r.querySelector(".s-sec").value : null,
    })).filter((s) => s.reps != null || s.weight != null || s.seconds != null);
    return { name, sets };
  }).filter((e) => e.name);
  const fields = {
    name: gymType,
    exercises,
    burned: $("#w-burned").value ? +$("#w-burned").value : 0,
  };
  const workouts = dayData().workouts;
  if (editingWorkoutId) {
    const w = workouts.find((x) => x.id === editingWorkoutId);
    if (w) Object.assign(w, fields);
  } else {
    workouts.push({ id: uid(), ...fields });
  }
  const wasEdit = !!editingWorkoutId;
  editingWorkoutId = null;
  save(); renderAll(); haptic(); closeModal("#workout-modal");
  toast(wasEdit ? "Workout updated" : "Workout logged");
};

/* ---------- meal modal ---------- */
let mealType = "Breakfast";
$("#meal-type-seg").querySelectorAll("button").forEach((b) => {
  b.onclick = () => {
    $("#meal-type-seg").querySelectorAll("button").forEach((x) => x.classList.remove("active"));
    b.classList.add("active"); mealType = b.dataset.type;
  };
});

function guessMealType() {
  const h = new Date().getHours();
  if (h < 11) return "Breakfast";
  if (h < 15) return "Lunch";
  if (h < 21) return "Dinner";
  return "Snack";
}

let editingMealId = null;

$("#add-meal-btn").onclick = () => {
  editingMealId = null;
  ["#f-name", "#f-cal", "#f-protein", "#f-carbs", "#f-fat", "#f-search", "#f-qty"].forEach((s) => ($(s).value = ""));
  selectedFood = null;
  $("#f-qty-wrap").classList.add("hidden"); $("#f-portions").classList.add("hidden");
  $("#meal-modal-title").textContent = "Log Food";
  mealType = guessMealType();
  $("#meal-type-seg").querySelectorAll("button").forEach((x) => x.classList.toggle("active", x.dataset.type === mealType));
  renderRecentFoods();
  showDefaultFoodList();   // show favorites as a pick-list
  openModal("#meal-modal");
  setTimeout(() => $("#f-search").focus(), 100);
};

function openMealEdit(m) {
  editingMealId = m.id;
  selectedFood = null;
  $("#f-search").value = "";
  $("#f-results").innerHTML = "";
  $("#f-qty-wrap").classList.add("hidden");  $("#f-name").value = m.name || "";
  $("#f-cal").value = m.calories || 0;
  $("#f-protein").value = m.protein || 0;
  $("#f-carbs").value = m.carbs || 0;
  $("#f-fat").value = m.fat || 0;
  mealType = m.type || "Snack";
  $("#meal-type-seg").querySelectorAll("button").forEach((x) => x.classList.toggle("active", x.dataset.type === mealType));
  $("#meal-modal-title").textContent = "Edit Food";
  $("#f-recent").classList.add("hidden");
  $("#f-recent-label").classList.add("hidden");
  $("#f-portions").classList.add("hidden");
  openModal("#meal-modal");
}

/* ---------- recent foods quick-add ---------- */
// most-recent distinct foods across all logged days, newest first
function recentFoods(limit = 8) {
  const seen = new Map();
  const keys = Object.keys(DATA.days).sort().reverse();
  for (const k of keys) {
    const meals = DATA.days[k].meals || [];
    for (let i = meals.length - 1; i >= 0; i--) {
      const m = meals[i];
      const name = (m.name || "").trim();
      if (!name || seen.has(name)) continue;
      seen.set(name, m);
      if (seen.size >= limit) return [...seen.values()];
    }
  }
  return [...seen.values()];
}

function fillFromRecent(m) {
  selectedFood = null;
  $("#f-qty-wrap").classList.add("hidden");
  $("#f-name").value = m.name || "";
  $("#f-cal").value = Math.round(m.calories || 0);
  $("#f-protein").value = m.protein || 0;
  $("#f-carbs").value = m.carbs || 0;
  $("#f-fat").value = m.fat || 0;
  $("#f-search").value = ""; $("#f-results").innerHTML = "";
  haptic();
}

function renderRecentFoods() {
  const wrap = $("#f-recent"); const label = $("#f-recent-label");
  if (!wrap) return;
  const items = recentFoods();
  wrap.innerHTML = "";
  const show = items.length > 0;
  wrap.classList.toggle("hidden", !show);
  if (label) label.classList.toggle("hidden", !show);
  items.forEach((m) => {
    const b = el(`<button type="button" class="chip-recent">${escapeHtml(m.name)} <small>${Math.round(m.calories || 0)}</small></button>`);
    b.onclick = () => fillFromRecent(m);
    wrap.appendChild(b);
  });
}

/* ---------- favorites (pinned foods) ---------- */
function isFavorite(name) { return (DATA.favorites || []).some((f) => f.n.toLowerCase() === (name || "").toLowerCase()); }
function toggleFavorite(food) {
  if (!Array.isArray(DATA.favorites)) DATA.favorites = [];
  const i = DATA.favorites.findIndex((f) => f.n.toLowerCase() === food.n.toLowerCase());
  if (i >= 0) DATA.favorites.splice(i, 1);
  else DATA.favorites.push({ n: food.n, unit: food.unit, base: food.base, cal: food.cal, p: food.p, c: food.c, f: food.f });
  save(); haptic();
  const q = $("#f-search").value;
  if (q.trim()) searchFoods(q); else showDefaultFoodList();   // refresh stars / list
}
// when the search box is empty, show favorites as a selectable list to pick from
function showDefaultFoodList() {
  const wrap = $("#f-results");
  if (!wrap) return;
  wrap.innerHTML = "";
  const favs = DATA.favorites || [];
  if (!favs.length) return;
  wrap.appendChild(el(`<div class="food-list-head">⭐ Favorites</div>`));
  renderFoodResults(favs, { append: true });
}

/* ---------- food search + auto-calc ---------- */
let selectedFood = null;

function foodQtyLabel(f) {
  return f.unit === "g" ? "g" : f.unit === "ml" ? "ml" : f.unit;
}

function renderFoodResults(list, { online = false, append = false } = {}) {
  const wrap = $("#f-results");
  if (!append) wrap.innerHTML = "";
  if (!list.length) return;
  list.forEach((f) => {
    const per = f.unit === "g" || f.unit === "ml" ? `per 100${f.unit}` : `per ${f.unit}`;
    const fav = isFavorite(f.n);
    const tag = online ? ` <span class="fo-tag">online</span>` : f.custom ? ` <span class="fo-tag mine">saved</span>` : "";
    const row = el(`
      <div class="food-opt">
        <span class="fo-name">${escapeHtml(f.n)}${tag}</span>
        <span class="fo-kcal">${Math.round(f.cal)} kcal <small>${per}</small></span>
        <button class="fo-star${fav ? " on" : ""}" type="button" aria-label="Toggle favorite">${fav ? "★" : "☆"}</button>
      </div>`);
    row.onclick = (e) => { if (e.target.closest(".fo-star")) return; selectFood(f); };
    row.querySelector(".fo-star").onclick = (e) => { e.stopPropagation(); toggleFavorite(f); };
    wrap.appendChild(row);
  });
}

// every word in the query must appear in the name (any order), so
// "lemon ice tea" still finds "Lemon iced tea"
function foodMatches(name, words) {
  const n = name.toLowerCase();
  return words.every((w) => n.includes(w));
}
function searchFoods(q) {
  const query = q.trim().toLowerCase();
  if (!query) { showDefaultFoodList(); return; }
  const words = query.split(/\s+/).filter(Boolean);
  // your saved foods first, then the built-in list
  const mine = (DATA.customFoods || []).filter((f) => foodMatches(f.n, words));
  const builtin = FOODS.filter((f) => foodMatches(f.n, words));
  const all = [...mine, ...builtin];
  all.sort((a, b) => (isFavorite(b.n) ? 1 : 0) - (isFavorite(a.n) ? 1 : 0)); // ⭐ favorites first
  renderFoodResults(all.slice(0, 16));
  if (query.length >= 3) searchOnlineFoods(q.trim());
}

/* ---------- online food lookup (Open Food Facts, free, no key) ---------- */
let offController = null;
// map an Open Food Facts product to our food shape (per 100 g/ml)
function offToFood(p) {
  const nut = p.nutriments || {};
  let cal = nut["energy-kcal_100g"];
  if (cal == null && nut["energy_100g"] != null) cal = nut["energy_100g"] / 4.184; // kJ → kcal
  if (cal == null) return null;
  const name = (p.product_name || p.product_name_en || "").trim();
  if (!name) return null;
  return {
    n: name.length > 42 ? name.slice(0, 41) + "…" : name,
    unit: "g", base: 100, cal: Math.round(cal),
    p: +(+nut.proteins_100g || 0).toFixed(1),
    c: +(+nut.carbohydrates_100g || 0).toFixed(1),
    f: +(+nut.fat_100g || 0).toFixed(1),
  };
}
async function searchOnlineFoods(query) {
  if (!navigator.onLine) return;
  try {
    offController?.abort();
    offController = new AbortController();
    const url = "https://world.openfoodfacts.org/cgi/search.pl?search_terms=" +
      encodeURIComponent(query) +
      "&search_simple=1&action=process&json=1&page_size=8" +
      "&fields=product_name,product_name_en,nutriments";
    const res = await fetch(url, { signal: offController.signal });
    const data = await res.json();
    // ignore stale responses if the user has since changed the query
    if ($("#f-search").value.trim().toLowerCase() !== query.toLowerCase()) return;
    const seen = new Set();
    const mapped = (data.products || []).map(offToFood).filter((f) => {
      if (!f || seen.has(f.n.toLowerCase())) return false;
      seen.add(f.n.toLowerCase()); return true;
    }).slice(0, 8);
    if (mapped.length) renderFoodResults(mapped, { online: true, append: true });
  } catch { /* offline or aborted — local results already shown */ }
}

function selectFood(f) {
  selectedFood = f;
  $("#f-name").value = f.n;
  $("#f-qty").value = f.unit === "g" || f.unit === "ml" ? 100 : 1;
  $("#f-unit").textContent = foodQtyLabel(f);
  $("#f-qty-wrap").classList.remove("hidden");
  // portion quick-buttons (½ · 1 · 1.5 · 2 · 3), with "1" selected
  $("#f-portions").classList.remove("hidden");
  $("#f-portions").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x.dataset.f === "1"));
  $("#f-search").value = "";
  $("#f-results").innerHTML = "";  recalcFood();
}

function recalcFood() {
  if (!selectedFood) return;
  const q = +$("#f-qty").value || 0;
  const mult = q / selectedFood.base;
  $("#f-cal").value = Math.round(selectedFood.cal * mult);
  $("#f-protein").value = +(selectedFood.p * mult).toFixed(1);
  $("#f-carbs").value = +(selectedFood.c * mult).toFixed(1);
  $("#f-fat").value = +(selectedFood.f * mult).toFixed(1);
}

let searchTimer;
$("#f-search").addEventListener("input", (e) => {
  clearTimeout(searchTimer);
  const v = e.target.value;
  searchTimer = setTimeout(() => searchFoods(v), 120);
});
$("#f-qty").addEventListener("input", () => {
  recalcFood();
  $("#f-portions").querySelectorAll("button").forEach((x) => x.classList.remove("on")); // custom qty → no chip selected
});
// portion quick-buttons set the quantity (½/1/1.5/2/3 of a serving)
$("#f-portions").querySelectorAll("button").forEach((b) => {
  b.onclick = () => {
    if (!selectedFood) return;
    const baseQty = selectedFood.base || 1;
    $("#f-qty").value = +(baseQty * (+b.dataset.f || 1)).toFixed(2);
    recalcFood();
    $("#f-portions").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
  };
});
// typing your own food name = manual entry, drop the picked food
$("#f-name").addEventListener("input", () => {
  selectedFood = null;
  $("#f-qty-wrap").classList.add("hidden");
  $("#f-portions").classList.add("hidden");
});

function collectMealFields() {
  let name = $("#f-name").value.trim() || "Food";
  if (selectedFood) {
    const q = +$("#f-qty").value || 0;
    if (q) name += ` · ${q} ${foodQtyLabel(selectedFood)}`;
  }
  return {
    type: mealType,
    name,
    calories: +$("#f-cal").value || 0,
    protein: +$("#f-protein").value || 0,
    carbs: +$("#f-carbs").value || 0,
    fat: +$("#f-fat").value || 0,
  };
}
function mealFormEmpty() {
  return !$("#f-name").value.trim() && !(+$("#f-cal").value);
}
// remember a manually-typed food so it shows up in search next time
function rememberCustomFood() {
  if (selectedFood) return;                       // chosen from the list, already known
  const name = $("#f-name").value.trim();
  const cal = +$("#f-cal").value || 0;
  if (!name || !cal) return;
  const lc = name.toLowerCase();
  if (FOODS.some((f) => f.n.toLowerCase() === lc)) return;   // already a built-in food
  if (!Array.isArray(DATA.customFoods)) DATA.customFoods = [];
  const food = {
    n: name, unit: "serving", base: 1, cal,
    p: +$("#f-protein").value || 0, c: +$("#f-carbs").value || 0, f: +$("#f-fat").value || 0,
    custom: true,
  };
  const i = DATA.customFoods.findIndex((f) => f.n.toLowerCase() === lc);
  if (i >= 0) DATA.customFoods[i] = food; else DATA.customFoods.push(food);
}
// clear the form to log the next item, keeping the meal type and modal open
function resetMealForm() {
  editingMealId = null;
  selectedFood = null;
  ["#f-name", "#f-cal", "#f-protein", "#f-carbs", "#f-fat", "#f-search", "#f-qty"].forEach((s) => ($(s).value = ""));
  $("#f-results").innerHTML = "";
  $("#f-qty-wrap").classList.add("hidden");  $("#meal-modal-title").textContent = "Log Food";
}

$("#save-meal").onclick = () => {
  rememberCustomFood();
  const fields = collectMealFields();
  const meals = dayData().meals;
  if (editingMealId) {
    const m = meals.find((x) => x.id === editingMealId);
    if (m) Object.assign(m, fields);
  } else {
    meals.push({ id: uid(), ...fields });
  }
  const wasEdit = !!editingMealId;
  editingMealId = null;
  save(); renderAll(); haptic(); closeModal("#meal-modal");
  toast(wasEdit ? "Food updated" : "Food logged");
};

// save current item and keep the sheet open to add the next one
$("#add-another-meal").onclick = () => {
  if (mealFormEmpty()) { $("#f-search").focus(); return; }
  rememberCustomFood();
  dayData().meals.push({ id: uid(), ...collectMealFields() });
  save(); renderAll();
  resetMealForm();
  flash($("#add-another-meal"), "Added ✓ — next item");
  setTimeout(() => $("#f-search").focus(), 60);
};

/* ---------- cardio modal (timed cardio + step-based walks) ---------- */
function fillCardioSelect() {
  $("#c-type").innerHTML = CARDIO_OPTIONS.map((o, i) => `<option value="${i}">${o.name}</option>`).join("");
}
// walking activities produce steps; ~110 steps per minute at a brisk pace
const STEPS_PER_MIN = 110;
const isWalkType = (name) => /walk|hik/i.test(name);

function recalcCardio() {
  const o = CARDIO_OPTIONS[+$("#c-type").value] || CARDIO_OPTIONS[0];
  const min = +$("#c-min").value || 0;
  const steps = +$("#c-steps").value || 0;
  let est = 0;
  if (min) est = estimateCardioKcal(o.met, min);
  else if (steps) est = estimateStepKcal(steps);
  $("#c-burned").value = est || "";
  const walk = isWalkType(o.name);
  if (min) {
    $("#c-hint").textContent = walk
      ? `≈ ${est} kcal · ${min} min ≈ ${Math.round(min * STEPS_PER_MIN).toLocaleString()} steps (both counted)`
      : `≈ ${est} kcal from ${min} min`;
  } else if (steps) {
    $("#c-hint").textContent = walk
      ? `≈ ${est} kcal · ${steps.toLocaleString()} steps ≈ ${Math.round(steps / STEPS_PER_MIN)} min (both counted)`
      : `≈ ${est} kcal from ${steps.toLocaleString()} steps`;
  } else {
    $("#c-hint").textContent = walk
      ? "Enter minutes OR steps — we'll fill in the other for you."
      : "Enter minutes (or steps for a walk).";
  }
}
let editingCardioId = null;

$("#add-cardio-btn").onclick = () => {
  editingCardioId = null;
  fillCardioSelect();
  $("#c-type").value = "0"; $("#c-min").value = ""; $("#c-steps").value = ""; $("#c-burned").value = "";
  $("#c-hint").textContent = "Enter minutes, or steps for a walk.";
  $("#cardio-modal-title").textContent = "Log Cardio";
  openModal("#cardio-modal");
};

function openCardioEdit(c) {
  editingCardioId = c.id;
  fillCardioSelect();
  const idx = CARDIO_OPTIONS.findIndex((o) => o.name === c.type);
  $("#c-type").value = idx >= 0 ? idx : 0;
  $("#c-min").value = c.minutes || "";
  $("#c-steps").value = c.steps || "";
  $("#c-burned").value = c.burned || "";
  $("#c-hint").textContent = "";
  $("#cardio-modal-title").textContent = "Edit Cardio";
  openModal("#cardio-modal");
}
$("#c-type").onchange = recalcCardio;
$("#c-min").oninput = recalcCardio;
$("#c-steps").oninput = recalcCardio;
// office-walk presets: set Walking + steps, auto kcal
$("#c-presets").querySelectorAll("button").forEach((b) => {
  b.onclick = () => {
    fillCardioSelect();
    $("#c-type").value = "0"; // Walking (brisk)
    $("#c-min").value = "";
    $("#c-steps").value = b.dataset.steps;
    recalcCardio();
  };
});
// quick duration buttons — tap an approximate time instead of timing yourself
$("#c-min-presets").querySelectorAll("button").forEach((b) => {
  b.onclick = () => {
    $("#c-min").value = b.dataset.min;
    $("#c-steps").value = "";   // minutes drive the estimate for these
    recalcCardio();
    $("#c-min-presets").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
  };
});
$("#save-cardio").onclick = () => {
  const o = CARDIO_OPTIONS[+$("#c-type").value] || CARDIO_OPTIONS[0];
  let min = +$("#c-min").value || 0;
  let steps = +$("#c-steps").value || 0;
  if (!min && !steps) { closeModal("#cardio-modal"); return; }
  // for walks, fill in whichever field is missing so steps AND cardio minutes both get credit
  if (isWalkType(o.name)) {
    if (min && !steps) steps = Math.round(min * STEPS_PER_MIN);
    else if (steps && !min) min = Math.round(steps / STEPS_PER_MIN);
  }
  const burned = +$("#c-burned").value || (min ? estimateCardioKcal(o.met, min) : estimateStepKcal(steps));
  const fields = { type: o.name, minutes: min, steps, burned };
  const cardio = dayData().cardio;
  if (editingCardioId) {
    const c = cardio.find((x) => x.id === editingCardioId);
    if (c) Object.assign(c, fields);
  } else {
    cardio.push({ id: uid(), ...fields });
  }
  const wasEdit = !!editingCardioId;
  editingCardioId = null;
  save(); renderAll(); haptic(); closeModal("#cardio-modal");
  toast(wasEdit ? "Cardio updated" : "Cardio logged");
};

/* ---------- expense modal ---------- */
let editingExpenseId = null;
let expCategory = "Travel";
let expSub = "Metro";

function setExpCategory(cat) {
  expCategory = cat;
  $("#e-cat-seg").querySelectorAll("button").forEach((x) => x.classList.toggle("active", x.dataset.cat === cat));
  $("#e-sub-wrap").classList.toggle("hidden", cat !== "Travel");
}
function renderTravelSubs() {
  const seg = $("#e-sub-seg");
  seg.innerHTML = TRAVEL_SUBS.map((s) => `<button type="button" data-sub="${s}" class="${s === expSub ? "active" : ""}">${s}</button>`).join("");
  seg.querySelectorAll("button").forEach((b) => {
    b.onclick = () => {
      seg.querySelectorAll("button").forEach((x) => x.classList.remove("active"));
      b.classList.add("active"); expSub = b.dataset.sub;
    };
  });
}
$("#e-cat-seg").querySelectorAll("button").forEach((b) => {
  b.onclick = () => setExpCategory(b.dataset.cat);
});

$("#add-expense-btn").onclick = () => {
  editingExpenseId = null;
  $("#e-amount").value = ""; $("#e-note").value = "";
  // default the date to the month you're viewing, so adding to past months is easy
  const today = new Date();
  $("#e-date").value = monthKey(expenseMonth) === monthKey(today)
    ? keyOf(today)
    : keyOf(new Date(expenseMonth.getFullYear(), expenseMonth.getMonth(), 1));
  expCategory = "Travel"; expSub = "Metro";
  setExpCategory("Travel"); renderTravelSubs();
  $("#expense-modal-title").textContent = "Add Expense";
  openModal("#expense-modal");
  setTimeout(() => $("#e-amount").focus(), 100);
};

function openExpenseEdit(e) {
  editingExpenseId = e.id;
  $("#e-amount").value = e.amount || ""; $("#e-note").value = e.note || "";
  $("#e-date").value = e.date || keyOf(new Date());
  expCategory = e.category || "Travel"; expSub = e.sub || "Metro";
  setExpCategory(expCategory); renderTravelSubs();
  $("#expense-modal-title").textContent = "Edit Expense";
  openModal("#expense-modal");
}

$("#save-expense").onclick = () => {
  const amount = +$("#e-amount").value || 0;
  if (!amount) { closeModal("#expense-modal"); return; }
  const fields = {
    date: $("#e-date").value || keyOf(new Date()),
    amount,
    kind: "expense",
    category: expCategory,
    sub: expCategory === "Travel" ? expSub : null,
    note: $("#e-note").value.trim(),
  };
  if (editingExpenseId) {
    const ex = DATA.expenses.find((x) => x.id === editingExpenseId);
    if (ex) Object.assign(ex, fields);
  } else {
    DATA.expenses.push({ id: uid(), ...fields });
  }
  editingExpenseId = null;
  expenseMonth = new Date(fields.date + "T12:00:00"); // show the month we just edited
  save(); renderExpenses(); closeModal("#expense-modal");
};

/* ---------- earning (income) modal ---------- */
let editingIncomeId = null;
$("#add-income-btn").onclick = () => {
  editingIncomeId = null;
  $("#i-amount").value = ""; $("#i-note").value = "";
  const today = new Date();
  $("#i-date").value = monthKey(expenseMonth) === monthKey(today)
    ? keyOf(today)
    : keyOf(new Date(expenseMonth.getFullYear(), expenseMonth.getMonth(), 1));
  $("#income-modal-title").textContent = "Add Earning";
  openModal("#income-modal");
  setTimeout(() => $("#i-amount").focus(), 100);
};
function openIncomeEdit(e) {
  editingIncomeId = e.id;
  $("#i-amount").value = e.amount || ""; $("#i-note").value = e.note || "";
  $("#i-date").value = e.date || keyOf(new Date());
  $("#income-modal-title").textContent = "Edit Earning";
  openModal("#income-modal");
}
$("#save-income").onclick = () => {
  const amount = +$("#i-amount").value || 0;
  if (!amount) { closeModal("#income-modal"); return; }
  const fields = {
    date: $("#i-date").value || keyOf(new Date()),
    amount, kind: "income", category: null, sub: null,
    note: $("#i-note").value.trim(),
  };
  if (editingIncomeId) {
    const ex = DATA.expenses.find((x) => x.id === editingIncomeId);
    if (ex) Object.assign(ex, fields);
  } else {
    DATA.expenses.push({ id: uid(), ...fields });
  }
  editingIncomeId = null;
  expenseMonth = new Date(fields.date + "T12:00:00");
  save(); renderExpenses(); closeModal("#income-modal");
};

$("#exp-prev").onclick = () => { expenseMonth.setDate(1); expenseMonth.setMonth(expenseMonth.getMonth() - 1); renderExpenses(); };
$("#exp-next").onclick = () => {
  if (monthKey(expenseMonth) === monthKey(new Date())) return;
  expenseMonth.setDate(1); expenseMonth.setMonth(expenseMonth.getMonth() + 1); renderExpenses();
};

/* ============================================================
   TRIPS — each trip holds its own list of expenses
============================================================ */
let openTripId = null;       // null = trip list, else show that trip's detail
let editingTripId = null;
let editingTripItem = null;  // { tripId, itemId } when editing an item
let tiCategory = "Food";

function tripTotal(t) { return (t.items || []).reduce((s, i) => s + (+i.amount || 0), 0); }

function tripDateRange(t) {
  if (!t.startDate) return "";
  const fmt = (s) => new Date(s + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return t.endDate && t.endDate !== t.startDate ? `${fmt(t.startDate)} – ${fmt(t.endDate)}` : fmt(t.startDate);
}

function renderTrips() {
  const wrap = $("#trips-body");
  if (!wrap) return;
  wrap.innerHTML = "";
  const open = openTripId ? DATA.trips.find((t) => t.id === openTripId) : null;
  if (open) renderTripDetail(wrap, open);
  else renderTripList(wrap);
}

function renderTripList(wrap) {
  const trips = [...DATA.trips].sort((a, b) => ((b.startDate || "") < (a.startDate || "") ? -1 : 1));
  const grand = trips.reduce((s, t) => s + tripTotal(t), 0);

  wrap.appendChild(el(`
    <div class="card exp-total-card">
      <div class="exp-total">${money(grand)}</div>
      <div class="muted small">total across ${trips.length} trip${trips.length === 1 ? "" : "s"}</div>
    </div>`));

  const list = el(`<div class="card-list"></div>`);
  if (!trips.length) list.appendChild(el(`<div class="empty">No trips yet. Tap below to add one.</div>`));
  trips.forEach((t) => {
    const range = tripDateRange(t);
    const meta = [range, `${(t.items || []).length} item${(t.items || []).length === 1 ? "" : "s"}`]
      .filter(Boolean).join(" · ");
    const node = el(`
      <div class="item exp-cell">
        <div class="grow tappable">
          <div class="title">${escapeHtml(t.name || "Trip")}</div>
          <div class="sub">${escapeHtml(meta)}</div>
        </div>
        <div class="title money">${money(tripTotal(t))}</div>
        <div class="item-actions">
          <button class="edit" aria-label="Edit">✎</button>
          <button class="del" aria-label="Delete">✕</button>
        </div>
      </div>`);
    node.querySelector(".grow").onclick = () => { openTripId = t.id; renderTrips(); };
    node.querySelector(".edit").onclick = () => openTripEdit(t);
    node.querySelector(".del").onclick = () => removeTrip(t.id);
    list.appendChild(node);
  });
  wrap.appendChild(list);

  const actions = el(`<div class="btn-row"><button class="primary-btn" id="add-trip-btn">+ New Trip</button></div>`);
  actions.querySelector("#add-trip-btn").onclick = openTripAdd;
  wrap.appendChild(actions);
}

function renderTripDetail(wrap, t) {
  const back = el(`<button class="ghost-btn" style="margin-bottom:12px">‹ All trips</button>`);
  back.onclick = () => { openTripId = null; renderTrips(); };
  wrap.appendChild(back);

  const range = tripDateRange(t);
  wrap.appendChild(el(`
    <div class="card exp-total-card">
      <div class="exp-total">${money(tripTotal(t))}</div>
      <div class="muted small">${escapeHtml(t.name || "Trip")}${range ? " · " + range : ""}</div>
      ${t.note ? `<div class="net-line"><span>${escapeHtml(t.note)}</span></div>` : ""}
    </div>`));

  // category breakdown
  const byCat = {};
  (t.items || []).forEach((i) => { byCat[i.category] = (byCat[i.category] || 0) + (+i.amount || 0); });
  const total = tripTotal(t);
  const catRows = TRIP_CATEGORIES.filter((c) => byCat[c] > 0).map((c) => {
    const amt = byCat[c] || 0;
    const pct = total > 0 ? Math.round((amt / total) * 100) : 0;
    return `<div class="cat-row">
        <div class="cat-top"><span class="cat-name">${c}</span><span class="cat-amt">${money(amt)}</span></div>
        <div class="cat-bar"><span style="width:${pct}%;background:var(--accent)"></span></div>
      </div>`;
  }).join("");
  if (catRows) wrap.appendChild(el(`<div class="card"><div class="week-head"><b>By category</b></div>${catRows}</div>`));

  const card = el(`<div class="card"><div class="week-head"><b>Expenses</b><span class="muted">${(t.items || []).length}</span></div><div class="card-list" id="trip-item-list"></div></div>`);
  wrap.appendChild(card);
  const listWrap = card.querySelector("#trip-item-list");
  const items = [...(t.items || [])].sort((a, b) => ((a.date || "") < (b.date || "") ? 1 : -1));
  if (!items.length) listWrap.appendChild(el(`<div class="empty">No expenses yet.</div>`));
  items.forEach((i) => listWrap.appendChild(tripItemCell(t, i)));

  const actions = el(`<div class="btn-row"><button class="primary-btn" id="add-trip-item-btn">+ Add Expense</button></div>`);
  actions.querySelector("#add-trip-item-btn").onclick = () => openTripItemAdd(t);
  wrap.appendChild(actions);
}

function tripItemCell(t, i) {
  const dateStr = i.date ? new Date(i.date + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";
  const meta = [(i.note ? escapeHtml(i.note) : ""), i.category, dateStr].filter(Boolean).join(" · ");
  const node = el(`
    <div class="item exp-cell">
      <div class="grow tappable">
        <div class="title money">${money(i.amount)}</div>
        <div class="sub">${meta}</div>
      </div>
      <div class="item-actions">
        <button class="edit" aria-label="Edit">✎</button>
        <button class="del" aria-label="Delete">✕</button>
      </div>
    </div>`);
  const openEdit = () => openTripItemEdit(t, i);
  node.querySelector(".grow").onclick = openEdit;
  node.querySelector(".edit").onclick = openEdit;
  node.querySelector(".del").onclick = () => removeTripItem(t.id, i.id);
  return node;
}

function removeTrip(id) {
  if (!confirm("Delete this whole trip and its expenses?")) return;
  DATA.trips = DATA.trips.filter((t) => t.id !== id);
  if (openTripId === id) openTripId = null;
  save(); renderTrips();
}

function removeTripItem(tripId, itemId) {
  if (!confirm("Delete this expense?")) return;
  const t = DATA.trips.find((x) => x.id === tripId);
  if (t) t.items = (t.items || []).filter((i) => i.id !== itemId);
  save(); renderTrips();
}

/* ---------- trip modal ---------- */
function openTripAdd() {
  editingTripId = null;
  $("#t-name").value = ""; $("#t-note").value = "";
  $("#t-start").value = keyOf(new Date()); $("#t-end").value = "";
  $("#trip-modal-title").textContent = "New Trip";
  openModal("#trip-modal");
  setTimeout(() => $("#t-name").focus(), 100);
}
function openTripEdit(t) {
  editingTripId = t.id;
  $("#t-name").value = t.name || ""; $("#t-note").value = t.note || "";
  $("#t-start").value = t.startDate || ""; $("#t-end").value = t.endDate || "";
  $("#trip-modal-title").textContent = "Edit Trip";
  openModal("#trip-modal");
}
$("#save-trip").onclick = () => {
  const name = $("#t-name").value.trim();
  if (!name) { closeModal("#trip-modal"); return; }
  const fields = {
    name,
    startDate: $("#t-start").value || "",
    endDate: $("#t-end").value || "",
    note: $("#t-note").value.trim(),
  };
  if (editingTripId) {
    const t = DATA.trips.find((x) => x.id === editingTripId);
    if (t) Object.assign(t, fields);
  } else {
    const id = uid();
    DATA.trips.push({ id, items: [], ...fields });
    openTripId = id; // jump straight into the new trip
  }
  editingTripId = null;
  save(); renderTrips(); closeModal("#trip-modal");
};

/* ---------- trip expense modal ---------- */
function setTiCategory(cat) {
  tiCategory = cat;
  $("#ti-cat-seg").querySelectorAll("button").forEach((x) => x.classList.toggle("active", x.dataset.cat === cat));
}
function renderTiCats() {
  const seg = $("#ti-cat-seg");
  seg.innerHTML = TRIP_CATEGORIES.map((c) => `<button type="button" data-cat="${c}" class="${c === tiCategory ? "active" : ""}">${c}</button>`).join("");
  seg.querySelectorAll("button").forEach((b) => { b.onclick = () => setTiCategory(b.dataset.cat); });
}
function openTripItemAdd(t) {
  editingTripItem = { tripId: t.id, itemId: null };
  $("#ti-amount").value = ""; $("#ti-note").value = "";
  $("#ti-date").value = t.startDate || keyOf(new Date());
  tiCategory = "Food"; renderTiCats();
  $("#trip-item-modal-title").textContent = "Add Trip Expense";
  openModal("#trip-item-modal");
  setTimeout(() => $("#ti-amount").focus(), 100);
}
function openTripItemEdit(t, i) {
  editingTripItem = { tripId: t.id, itemId: i.id };
  $("#ti-amount").value = i.amount || ""; $("#ti-note").value = i.note || "";
  $("#ti-date").value = i.date || keyOf(new Date());
  tiCategory = i.category || "Food"; renderTiCats();
  $("#trip-item-modal-title").textContent = "Edit Trip Expense";
  openModal("#trip-item-modal");
}
$("#save-trip-item").onclick = () => {
  if (!editingTripItem) { closeModal("#trip-item-modal"); return; }
  const amount = +$("#ti-amount").value || 0;
  if (!amount) { closeModal("#trip-item-modal"); return; }
  const t = DATA.trips.find((x) => x.id === editingTripItem.tripId);
  if (!t) { closeModal("#trip-item-modal"); return; }
  if (!Array.isArray(t.items)) t.items = [];
  const fields = {
    date: $("#ti-date").value || keyOf(new Date()),
    amount,
    category: tiCategory,
    note: $("#ti-note").value.trim(),
  };
  if (editingTripItem.itemId) {
    const it = t.items.find((x) => x.id === editingTripItem.itemId);
    if (it) Object.assign(it, fields);
  } else {
    t.items.push({ id: uid(), ...fields });
  }
  editingTripItem = null;
  save(); renderTrips(); closeModal("#trip-item-modal");
};

/* ---------- weight modal ---------- */
$("#log-weight-btn").onclick = () => {
  $("#wt-date").value = keyOf(new Date());
  $("#wt-kg").value = latestWeight() ?? DATA.goals.weight ?? "";
  openModal("#weight-modal");
};
$("#save-weight").onclick = () => {
  const date = $("#wt-date").value || keyOf(new Date());
  const kg = +$("#wt-kg").value;
  if (!kg) { closeModal("#weight-modal"); return; }
  DATA.weights = DATA.weights.filter((w) => w.date !== date);
  DATA.weights.push({ date, kg });
  DATA.goals.weight = latestWeight();
  save(); renderAll(); haptic(); closeModal("#weight-modal");
  toast("Weight saved");
};

/* ============================================================
   PROFILE / GOALS
============================================================ */
["#p-start", "#p-weight", "#p-target", "#p-rate", "#p-startdate"].forEach((s) => {
  $(s).addEventListener("input", updatePlanReadout);
});
$("#suggest-cal-btn").onclick = () => {
  const kg = +$("#p-weight").value || +$("#p-start").value || 0;
  const rate = +$("#p-rate").value || 0.5;
  $("#p-cal-goal").value = suggestedCalories(kg, rate);
};
$("#save-profile-btn").onclick = () => {
  const g = DATA.goals;
  g.calories = +$("#p-cal-goal").value || 0;
  g.protein = +$("#p-protein").value || 0;
  g.carbs = +$("#p-carbs").value || 0;
  g.fat = +$("#p-fat").value || 0;
  g.startWeight = $("#p-start").value ? +$("#p-start").value : null;
  g.targetWeight = $("#p-target").value ? +$("#p-target").value : null;
  g.weeklyRate = $("#p-rate").value ? +$("#p-rate").value : 0.5;
  g.startDate = $("#p-startdate").value || "";
  g.cardioGoal = +$("#p-cardio-goal").value || 0;
  g.stepsGoal = +$("#p-steps-goal").value || 0;
  g.stepKcalPer1000 = +$("#p-step-kcal").value || 39;
  g.waterGoal = +$("#p-water-goal").value || 0;
  g.strengthGoal = +$("#p-strength-goal").value || 0;
  // current weight: keep weight-log in sync if edited here
  const cur = $("#p-weight").value ? +$("#p-weight").value : null;
  if (cur != null && cur !== latestWeight()) {
    const today = keyOf(new Date());
    DATA.weights = DATA.weights.filter((w) => w.date !== today);
    DATA.weights.push({ date: today, kg: cur });
  }
  g.weight = latestWeight() ?? cur;
  save(); renderAll();
  flash($("#save-profile-btn"), "Saved ✓");
};

function flash(btn, msg) {
  const old = btn.textContent; btn.textContent = msg;
  setTimeout(() => (btn.textContent = old), 1200);
}

/* light haptic feedback (no-op where unsupported) */
function haptic(ms = 10) { try { navigator.vibrate && navigator.vibrate(ms); } catch {} }

/* transient toast, optionally with an action button (e.g. Undo) */
let toastTimer;
function toast(msg, { actionLabel, onAction, ms = 4000 } = {}) {
  const host = $("#toast-host"); if (!host) return;
  host.innerHTML = "";
  const node = el(`<div class="toast"><span>${escapeHtml(msg)}</span></div>`);
  if (actionLabel) {
    const b = el(`<button class="toast-action" type="button">${escapeHtml(actionLabel)}</button>`);
    b.onclick = () => { clearTimeout(toastTimer); host.innerHTML = ""; haptic(); onAction && onAction(); };
    node.appendChild(b);
  }
  host.appendChild(node);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { node.classList.add("out"); setTimeout(() => (host.innerHTML = ""), 200); }, ms);
}

/* export / import / reset */
$("#export-btn").onclick = () => {
  const blob = new Blob([JSON.stringify(DATA, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `fittrack-backup-${keyOf(new Date())}.json`; a.click();
  URL.revokeObjectURL(url);
};
$("#import-btn").onclick = () => $("#import-file").click();
$("#import-file").onchange = (e) => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed.days || !parsed.goals) throw new Error("bad file");
      DATA = { ...structuredClone(DEFAULT_DATA), ...parsed,
               goals: { ...DEFAULT_DATA.goals, ...parsed.goals },
               weights: Array.isArray(parsed.weights) ? parsed.weights : [],
               expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
               trips: Array.isArray(parsed.trips) ? parsed.trips : [],
               currency: parsed.currency || "₹" };
      save(); renderAll(); renderProfile();
      flash($("#import-btn"), "Imported ✓");
    } catch { alert("Could not read that backup file."); }
  };
  reader.readAsText(file);
};
$("#reset-btn").onclick = () => {
  if (confirm("Erase ALL workouts, meals and goals on this device? This cannot be undone.")) {
    DATA = structuredClone(DEFAULT_DATA); save(); renderAll(); renderProfile();
  }
};

/* ============================================================
   CLOUD SYNC (Supabase) — optional, free tier
============================================================ */
const SYNC_CFG_KEY = "fittrack_sync_cfg";
const META_KEY = "fittrack_meta";
let sb = null;       // supabase client
let sbUser = null;   // signed-in user
let pushTimer = null;

function syncCfg() { try { return JSON.parse(localStorage.getItem(SYNC_CFG_KEY)); } catch { return null; } }
function localModified() { try { return JSON.parse(localStorage.getItem(META_KEY))?.lastModified || 0; } catch { return 0; } }
function setLocalModified(iso) { localStorage.setItem(META_KEY, JSON.stringify({ lastModified: iso || new Date().toISOString() })); }
function syncStatus(msg) { const e = $("#sync-status"); if (e) e.textContent = msg; }

function initSupabase() {
  const cfg = syncCfg();
  if (!cfg || !window.supabase) return false;
  try { sb = window.supabase.createClient(cfg.url, cfg.key); return true; } catch { return false; }
}

function refreshSyncUI() {
  if (!$("#sb-url")) return;
  const cfg = syncCfg();
  $("#sb-url").value = cfg?.url || "";
  $("#sb-key").value = cfg?.key || "";
  $("#sync-auth").classList.toggle("hidden", !sb || !!sbUser);
  $("#sync-account").classList.toggle("hidden", !sbUser);
  if (!window.supabase) syncStatus("Offline — sync library not loaded yet.");
  else if (!cfg) syncStatus("Not connected. Paste your Supabase URL + anon key, then Save connection.");
  else if (!sb) syncStatus("Connection saved, but couldn't start. Check the URL/key.");
  else if (sbUser) syncStatus(`✓ Synced as ${sbUser.email}`);
  else syncStatus("Connected. Sign in (or sign up) to sync across devices.");
}

async function pullFromCloud() {
  if (!sb || !sbUser) return "no";
  const { data, error } = await sb.from("fittrack").select("data, updated_at").eq("user_id", sbUser.id).maybeSingle();
  if (error) { syncStatus("Sync error: " + error.message); return "error"; }
  if (data && data.data) {
    const remoteTime = new Date(data.updated_at).getTime();
    if (remoteTime > new Date(localModified() || 0).getTime()) {
      const r = data.data;
      DATA = { ...structuredClone(DEFAULT_DATA), ...r,
        goals: { ...DEFAULT_DATA.goals, ...(r.goals || {}) },
        weights: Array.isArray(r.weights) ? r.weights : [],
        expenses: Array.isArray(r.expenses) ? r.expenses : [],
        trips: Array.isArray(r.trips) ? r.trips : [],
        currency: r.currency || "₹" };
      migrateGoals(DATA.goals);
      localStorage.setItem(STORE_KEY, JSON.stringify(DATA));
      setLocalModified(data.updated_at);
      renderAll(); if (!$("#screen-profile").classList.contains("hidden")) renderProfile();
      return "pulled";
    }
  }
  return "local-newer";
}

async function pushToCloud() {
  if (!sb || !sbUser) return;
  const now = new Date().toISOString();
  const { error } = await sb.from("fittrack").upsert({ user_id: sbUser.id, data: DATA, updated_at: now });
  if (error) { syncStatus("Push error: " + error.message); return; }
  setLocalModified(now);
  syncStatus(`✓ Synced ${new Date().toLocaleTimeString()}`);
}

async function pullThenPush() {
  syncStatus("Syncing…");
  const r = await pullFromCloud();
  if (r === "local-newer" || r === "no") await pushToCloud();
  else if (r === "pulled") syncStatus("✓ Pulled latest from cloud");
  refreshSyncUI();
}

// called by save() — debounced upload
function cloudOnSave() {
  setLocalModified();
  if (!sb || !sbUser) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(pushToCloud, 1500);
}

async function bootSession() {
  if (!initSupabase()) { refreshSyncUI(); return; }
  try {
    const { data } = await sb.auth.getSession();
    sbUser = data?.session?.user || null;
    if (sbUser) await pullThenPush();
  } catch {}
  refreshSyncUI();
}

function bindSyncUI() {
  if (!$("#sb-save-config")) return;
  $("#sb-save-config").onclick = () => {
    const url = $("#sb-url").value.trim(), key = $("#sb-key").value.trim();
    if (!url || !key) { alert("Enter both the Supabase URL and the anon key."); return; }
    localStorage.setItem(SYNC_CFG_KEY, JSON.stringify({ url, key }));
    initSupabase(); bootSession();
  };
  $("#sb-signup").onclick = async () => {
    if (!sb) return;
    syncStatus("Creating account…");
    const { error } = await sb.auth.signUp({ email: $("#sb-email").value.trim(), password: $("#sb-pass").value });
    syncStatus(error ? "Sign up failed: " + error.message : "Account created — now tap Sign in.");
  };
  $("#sb-signin").onclick = async () => {
    if (!sb) return;
    syncStatus("Signing in…");
    const { data, error } = await sb.auth.signInWithPassword({ email: $("#sb-email").value.trim(), password: $("#sb-pass").value });
    if (error) { syncStatus("Sign in failed: " + error.message); return; }
    sbUser = data.user; $("#sb-pass").value = "";
    await pullThenPush();
  };
  $("#sb-signout").onclick = async () => { try { await sb?.auth.signOut(); } catch {} sbUser = null; refreshSyncUI(); };
  $("#sb-syncnow").onclick = () => pullThenPush();
}

// pull when returning to the app (other device may have changed things)
document.addEventListener("visibilitychange", () => { if (!document.hidden && sbUser) pullFromCloud(); });

/* ============================================================
   BOOT
============================================================ */
renderAll();
showScreen("dashboard");
bindSyncUI();
bootSession();

/* register service worker for offline + auto-update installed PWAs */
if ("serviceWorker" in navigator) {
  // when a new worker takes control, reload once so the latest build shows
  let swRefreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (swRefreshing) return;
    swRefreshing = true;
    window.location.reload();
  });
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").then((reg) => {
      reg.update(); // check for a new version on every launch
      // and re-check whenever the app is brought back to the foreground
      document.addEventListener("visibilitychange", () => { if (!document.hidden) reg.update(); });
    }).catch(() => {});
  });
}
