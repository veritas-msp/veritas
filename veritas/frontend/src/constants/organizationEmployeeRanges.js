export const ORGANIZATION_EMPLOYEE_RANGE_VALUES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1001+"];
export const ORGANIZATION_EMPLOYEE_RANGE_LABELS = {
  fr: {
    "1-10": "1 – 10 employés",
    "11-50": "11 – 50 employés",
    "51-200": "51 – 200 employés",
    "201-500": "201 – 500 employés",
    "501-1000": "501 – 1 000 employés",
    "1001+": "Plus de 1 000 employés"
  },
  en: {
    "1-10": "1 – 10 employees",
    "11-50": "11 – 50 employees",
    "51-200": "51 – 200 employees",
    "201-500": "201 – 500 employees",
    "501-1000": "501 – 1,000 employees",
    "1001+": "1,000+ employees"
  },
  de: {
    "1-10": "1 – 10 Mitarbeiter",
    "11-50": "11 – 50 Mitarbeiter",
    "51-200": "51 – 200 Mitarbeiter",
    "201-500": "201 – 500 Mitarbeiter",
    "501-1000": "501 – 1.000 Mitarbeiter",
    "1001+": "Über 1.000 Mitarbeiter"
  },
  it: {
    "1-10": "1 – 10 dipendenti",
    "11-50": "11 – 50 dipendenti",
    "51-200": "51 – 200 dipendenti",
    "201-500": "201 – 500 dipendenti",
    "501-1000": "501 – 1.000 dipendenti",
    "1001+": "Oltre 1.000 dipendenti"
  },
  es: {
    "1-10": "1 – 10 empleados",
    "11-50": "11 – 50 empleados",
    "51-200": "51 – 200 empleados",
    "201-500": "201 – 500 empleados",
    "501-1000": "501 – 1.000 empleados",
    "1001+": "Más de 1.000 empleados"
  }
};
export function getEmployeeRangeOptions(locale = "fr") {
  const code = String(locale || "fr").slice(0, 2).toLowerCase();
  const labels = ORGANIZATION_EMPLOYEE_RANGE_LABELS[code] || ORGANIZATION_EMPLOYEE_RANGE_LABELS.fr;
  return ORGANIZATION_EMPLOYEE_RANGE_VALUES.map(value => ({
    value,
    label: labels[value] || value
  }));
}
export function isValidEmployeeRange(value) {
  return !value || ORGANIZATION_EMPLOYEE_RANGE_VALUES.includes(value);
}
