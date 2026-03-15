export interface Category {
  id: string;
  label: string;
  group: string;
}

export const CATEGORIES: Category[] = [
  // Physics
  { id: "hep-ph",  label: "HEP – Phenomenology",    group: "Physics" },
  { id: "hep-ex",  label: "HEP – Experiment",        group: "Physics" },
  { id: "hep-th",  label: "HEP – Theory",            group: "Physics" },
  { id: "hep-lat", label: "HEP – Lattice",           group: "Physics" },
  { id: "astro-ph",label: "Astrophysics",             group: "Physics" },
  { id: "astro-ph.CO", label: "Cosmology & Nongal. Astro.", group: "Physics" },
  { id: "astro-ph.GA", label: "Astrophysics of Galaxies",   group: "Physics" },
  { id: "astro-ph.HE", label: "High Energy Astrophysical",  group: "Physics" },
  { id: "gr-qc",   label: "General Relativity & Quantum Cosmology", group: "Physics" },
  { id: "nucl-th", label: "Nuclear Theory",           group: "Physics" },
  { id: "nucl-ex", label: "Nuclear Experiment",       group: "Physics" },
  { id: "cond-mat.mes-hall", label: "Mesoscale & Nanoscale Physics", group: "Physics" },
  { id: "cond-mat.str-el",   label: "Strongly Correlated Electrons", group: "Physics" },
  { id: "cond-mat.supr-con", label: "Superconductivity",             group: "Physics" },
  { id: "quant-ph", label: "Quantum Physics",         group: "Physics" },
  // Computer Science
  { id: "cs.AI",  label: "Artificial Intelligence",  group: "CS" },
  { id: "cs.LG",  label: "Machine Learning",         group: "CS" },
  { id: "cs.CV",  label: "Computer Vision",          group: "CS" },
  { id: "cs.CL",  label: "Computation & Language",   group: "CS" },
  { id: "cs.RO",  label: "Robotics",                 group: "CS" },
  { id: "cs.CR",  label: "Cryptography & Security",  group: "CS" },
  { id: "cs.DS",  label: "Data Structures & Algorithms", group: "CS" },
  { id: "cs.NE",  label: "Neural & Evolutionary Computing", group: "CS" },
  // Mathematics
  { id: "math.AG", label: "Algebraic Geometry",      group: "Math" },
  { id: "math.CO", label: "Combinatorics",           group: "Math" },
  { id: "math.NT", label: "Number Theory",           group: "Math" },
  { id: "math.PR", label: "Probability",             group: "Math" },
  { id: "math.ST", label: "Statistics Theory",       group: "Math" },
  // Statistics
  { id: "stat.ML", label: "Machine Learning",        group: "Statistics" },
  { id: "stat.ME", label: "Methodology",             group: "Statistics" },
  // Quantitative Finance
  { id: "q-fin.PM", label: "Portfolio Management",   group: "q-fin" },
  { id: "q-fin.TR", label: "Trading & Market Microstructure", group: "q-fin" },
  { id: "q-fin.RM", label: "Risk Management",        group: "q-fin" },
  { id: "q-fin.MF", label: "Mathematical Finance",   group: "q-fin" },
  { id: "q-fin.ST", label: "Statistical Finance",    group: "q-fin" },
  // Biology
  { id: "q-bio.NC", label: "Neurons & Cognition",    group: "q-bio" },
  { id: "q-bio.QM", label: "Quantitative Methods",   group: "q-bio" },
];

export const CATEGORY_MAP = new Map<string, Category>(
  CATEGORIES.map((c) => [c.id, c])
);

export function getCategoryLabel(id: string): string {
  return CATEGORY_MAP.get(id)?.label ?? id;
}

export const CATEGORY_GROUPS = Array.from(
  CATEGORIES.reduce((groups, cat) => {
    if (!groups.has(cat.group)) groups.set(cat.group, []);
    groups.get(cat.group)!.push(cat);
    return groups;
  }, new Map<string, Category[]>())
);
