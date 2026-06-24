// Medicine categories, as stored on each Medicine document's `category` field
// (see backend/src/data/medicineSeeds.ts).
export const MEDICINE_CATEGORIES = [
  { key: "Fever & Pain",   emoji: "🌡️" },
  { key: "Antibiotics",    emoji: "💊" },
  { key: "Allergy & Cold", emoji: "🤧" },
  { key: "Gastric",        emoji: "🫁" },
  { key: "Vitamins",       emoji: "💪" },
  { key: "Diabetes",       emoji: "🩸" },
  { key: "BP & Cardiac",   emoji: "❤️" },
  { key: "Injections",     emoji: "💉" },
  { key: "Dermatology",    emoji: "🧴" },
  { key: "ENT",            emoji: "👂" },
  { key: "Ophthalmology",  emoji: "👁️" },
  { key: "Pulmonology",    emoji: "🫀" },
  { key: "Pediatric",      emoji: "👶" },
  { key: "Gynecology",     emoji: "🌸" },
  { key: "Psychiatry",     emoji: "🧠" },
];

// Each department can only prescribe from its own medicine categories.
export const DEPARTMENT_MEDICINE_CATEGORIES: Record<string, string[]> = {
  "General Medicine": ["Fever & Pain", "Antibiotics", "Allergy & Cold", "Gastric", "Vitamins", "Diabetes", "Injections"],
  "Pediatrics":        ["Pediatric"],
  "Gynecology":        ["Gynecology"],
  "Orthopedics":       ["Fever & Pain", "Injections", "Vitamins"],
  "Dermatology":       ["Dermatology"],
  "ENT":               ["ENT"],
  "Ophthalmology":     ["Ophthalmology"],
  "Psychiatry":        ["Psychiatry"],
  "Cardiology":        ["BP & Cardiac"],
  "Pulmonology":       ["Pulmonology"],
};

export const getAllowedCategories = (department: string): string[] =>
  DEPARTMENT_MEDICINE_CATEGORIES[department] || DEPARTMENT_MEDICINE_CATEGORIES["General Medicine"];

export const getDeptMedicineCategories = (department: string) => {
  const allowed = getAllowedCategories(department);
  return MEDICINE_CATEGORIES.filter(c => allowed.includes(c.key));
};
