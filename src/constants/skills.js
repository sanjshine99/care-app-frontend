export const SKILL_OPTIONS = [
  { value: "personal_care", label: "Personal Care" },
  { value: "medication_management", label: "Medication Management" },
  { value: "dementia_care", label: "Dementia Care" },
  { value: "mobility_assistance", label: "Mobility Assistance" },
  { value: "meal_preparation", label: "Meal Preparation" },
  { value: "companionship", label: "Companionship" },
  { value: "household_tasks", label: "Household Tasks" },
  { value: "specialized_medical", label: "Specialized Medical" },
];

const SKILL_LABELS = Object.fromEntries(
  SKILL_OPTIONS.map((s) => [s.value, s.label]),
);

export function getSkillLabel(value) {
  return SKILL_LABELS[value] ?? value.replace(/_/g, " ");
}
