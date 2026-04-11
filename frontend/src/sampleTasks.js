export const SAMPLE_TASKS = [
  {
    id: "T1",
    name: "Analiza wymagan",
    duration: 2,
    dependencies: [],
  },
  {
    id: "T2",
    name: "Model danych",
    duration: 3,
    dependencies: ["T1"],
  },
  {
    id: "T3",
    name: "Implementacja API",
    duration: 4,
    dependencies: ["T2"],
  },
  {
    id: "T4",
    name: "Formularz frontendu",
    duration: 3,
    dependencies: ["T1"],
  },
  {
    id: "T5",
    name: "Wizualizacja grafu",
    duration: 2,
    dependencies: ["T3", "T4"],
  },
  {
    id: "T6",
    name: "Test akceptacyjny",
    duration: 1,
    dependencies: ["T5"],
  },
];
