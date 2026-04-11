import { useDeferredValue, useEffect, useState, useTransition } from "react";
import GraphCanvas from "./components/GraphCanvas";
import { SAMPLE_TASKS } from "./sampleTasks";

const INITIAL_FORM = {
  name: "",
  duration: "",
  dependencies: [],
};

const VIEW_MODES = [
  { id: "dependency", label: "Siec zaleznosci" },
  { id: "es", label: "ASAP" },
  { id: "ls", label: "ALAP" },
];

function cloneTasks(tasks) {
  return tasks.map((task) => ({
    ...task,
    dependencies: [...task.dependencies],
  }));
}

function getNextTaskId(tasks) {
  const usedIds = new Set(tasks.map((task) => task.id));
  let index = 1;

  while (usedIds.has(`T${index}`)) {
    index += 1;
  }

  return `T${index}`;
}

function formatDependencies(dependencies) {
  if (dependencies.length === 0) {
    return "brak";
  }

  return dependencies.join(", ");
}

function getStatusLabel(status) {
  if (status === "loading") {
    return "Obliczenia w toku";
  }

  if (status === "error") {
    return "Brak polaczenia z backendem";
  }

  if (status === "ready") {
    return "Wyniki aktualne";
  }

  return "Czeka na dane";
}

export default function App() {
  const [tasks, setTasks] = useState(() => cloneTasks(SAMPLE_TASKS));
  const [form, setForm] = useState(INITIAL_FORM);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState("");
  const [apiState, setApiState] = useState("idle");
  const [viewMode, setViewMode] = useState("dependency");
  const [isPending, startTransition] = useTransition();
  const deferredTasks = useDeferredValue(tasks);

  useEffect(() => {
    if (deferredTasks.length === 0) {
      setAnalysis(null);
      setError("");
      setApiState("idle");
      return undefined;
    }

    const controller = new AbortController();

    async function analyzeTasks() {
      setApiState("loading");

      try {
        const response = await fetch("/api/cpm/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ tasks: deferredTasks }),
          signal: controller.signal,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Nie udalo sie policzyc harmonogramu.");
        }

        setAnalysis(data);
        setError("");
        setApiState("ready");
      } catch (requestError) {
        if (requestError.name === "AbortError") {
          return;
        }

        setAnalysis(null);
        setError(requestError.message);
        setApiState("error");
      }
    }

    analyzeTasks();

    return () => {
      controller.abort();
    };
  }, [deferredTasks]);

  function toggleDependency(taskId) {
    setForm((currentForm) => {
      const alreadySelected = currentForm.dependencies.includes(taskId);

      return {
        ...currentForm,
        dependencies: alreadySelected
          ? currentForm.dependencies.filter((dependencyId) => dependencyId !== taskId)
          : [...currentForm.dependencies, taskId],
      };
    });
  }

  function handleSubmit(event) {
    event.preventDefault();

    const trimmedName = form.name.trim();
    const duration = Number(form.duration);

    if (!trimmedName) {
      setError("Podaj nazwe zadania.");
      return;
    }

    if (!Number.isFinite(duration) || duration <= 0) {
      setError("Czas trwania musi byc dodatnia liczba.");
      return;
    }

    const newTask = {
      id: getNextTaskId(tasks),
      name: trimmedName,
      duration,
      dependencies: [...form.dependencies],
    };

    startTransition(() => {
      setTasks((currentTasks) => [...currentTasks, newTask]);
    });

    setForm(INITIAL_FORM);
    setError("");
  }

  function removeTask(taskId) {
    startTransition(() => {
      setTasks((currentTasks) =>
        currentTasks
          .filter((task) => task.id !== taskId)
          .map((task) => ({
            ...task,
            dependencies: task.dependencies.filter((dependencyId) => dependencyId !== taskId),
          }))
      );
    });
  }

  function loadSampleTasks() {
    startTransition(() => {
      setTasks(cloneTasks(SAMPLE_TASKS));
      setViewMode("dependency");
    });
  }

  function clearTasks() {
    startTransition(() => {
      setTasks([]);
      setViewMode("dependency");
    });
  }

  const analysisTasks = analysis?.tasks ?? [];
  const criticalCount = analysis?.criticalTaskIds?.length ?? 0;
  const edgeCount = analysis?.edges?.length ?? 0;

  return (
    <div className="page-shell">
      <div className="page-gradient" />
      <main className="app-shell">
        <section className="hero-card">
          <div>
            <span className="eyebrow">React frontend + Node.js backend</span>
            <h1>Analizator CPM do backlogu projektu bojler</h1>
            <p className="hero-copy">
              Wersja przegladarkowa pokrywajaca elementy przypisane Mateuszowi Adamczakowi:
              liczenie ES/EF/LS/LF, generacje ukladu grafu, rysowanie polaczen oraz widoki
              ASAP i ALAP.
            </p>
          </div>

          <div className="hero-actions">
            <button type="button" className="primary-button" onClick={loadSampleTasks}>
              Wczytaj dane demo
            </button>
            <button type="button" className="secondary-button" onClick={clearTasks}>
              Wyczysc harmonogram
            </button>
          </div>
        </section>

        <section className="dashboard-grid">
          <div className="stack-column">
            <article className="panel">
              <div className="panel-heading">
                <div>
                  <span className="panel-kicker">Wejscie danych</span>
                  <h2>Dodaj nowe zadanie</h2>
                </div>
                <span className={`status-pill ${apiState}`}>{getStatusLabel(apiState)}</span>
              </div>

              <form className="task-form" onSubmit={handleSubmit}>
                <label className="field">
                  <span>Nazwa zadania</span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) =>
                      setForm((currentForm) => ({
                        ...currentForm,
                        name: event.target.value,
                      }))
                    }
                    placeholder="np. Wygenerowanie harmonogramu"
                  />
                </label>

                <label className="field">
                  <span>Czas trwania (dni)</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.duration}
                    onChange={(event) =>
                      setForm((currentForm) => ({
                        ...currentForm,
                        duration: event.target.value,
                      }))
                    }
                    placeholder="3"
                  />
                </label>

                <div className="field">
                  <span>Poprzedniki</span>
                  <div className="dependency-selector">
                    {tasks.length === 0 ? (
                      <p className="helper-copy">
                        Najpierw dodaj pierwsze zadanie bez poprzednikow.
                      </p>
                    ) : (
                      tasks.map((task) => (
                        <label key={task.id} className="dependency-option">
                          <input
                            type="checkbox"
                            checked={form.dependencies.includes(task.id)}
                            onChange={() => toggleDependency(task.id)}
                          />
                          <span>
                            {task.id} · {task.name}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <button type="submit" className="primary-button submit-button">
                  Dodaj zadanie
                </button>
              </form>

              {error && <div className="error-banner">{error}</div>}
            </article>

            <article className="panel">
              <div className="panel-heading">
                <div>
                  <span className="panel-kicker">Model projektu</span>
                  <h2>Aktualne zadania</h2>
                </div>
                <span className="panel-count">{tasks.length} szt.</span>
              </div>

              {tasks.length === 0 ? (
                <div className="empty-state">
                  Lista jest pusta. Dodaj wlasne zadania albo uruchom zestaw demo.
                </div>
              ) : (
                <div className="task-list">
                  {tasks.map((task) => (
                    <article key={task.id} className="task-card">
                      <div className="task-card-head">
                        <div>
                          <span className="task-id">{task.id}</span>
                          <h3>{task.name}</h3>
                        </div>
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => removeTask(task.id)}
                        >
                          Usun
                        </button>
                      </div>
                      <dl className="task-meta">
                        <div>
                          <dt>Czas</dt>
                          <dd>{task.duration} dni</dd>
                        </div>
                        <div>
                          <dt>Poprzedniki</dt>
                          <dd>{formatDependencies(task.dependencies)}</dd>
                        </div>
                      </dl>
                    </article>
                  ))}
                </div>
              )}
            </article>
          </div>

          <div className="stack-column">
            <article className="panel">
              <div className="panel-heading">
                <div>
                  <span className="panel-kicker">Podsumowanie CPM</span>
                  <h2>Kluczowe wskazniki</h2>
                </div>
                {isPending && <span className="panel-note">Aktualizacja widoku...</span>}
              </div>

              <div className="stats-grid">
                <div className="stat-card">
                  <span>Projekt duration</span>
                  <strong>{analysis?.projectDuration ?? 0}</strong>
                  <small>dni lacznie</small>
                </div>
                <div className="stat-card">
                  <span>Zadania krytyczne</span>
                  <strong>{criticalCount}</strong>
                  <small>Slack = 0</small>
                </div>
                <div className="stat-card">
                  <span>Polaczenia grafu</span>
                  <strong>{edgeCount}</strong>
                  <small>krawedzie miedzy zadaniami</small>
                </div>
              </div>
            </article>

            <article className="panel">
              <div className="panel-heading">
                <div>
                  <span className="panel-kicker">Wizualizacja</span>
                  <h2>Graf zaleznosci i harmonogram</h2>
                </div>
              </div>

              <div className="view-switcher" role="tablist" aria-label="Tryb grafu">
                {VIEW_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    className={viewMode === mode.id ? "view-pill active" : "view-pill"}
                    onClick={() => setViewMode(mode.id)}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              <GraphCanvas
                tasks={analysisTasks}
                edges={analysis?.edges ?? []}
                layout={analysis?.layouts?.[viewMode]}
                layoutConfig={analysis?.layoutConfig}
                mode={viewMode}
                projectDuration={analysis?.projectDuration ?? 0}
              />
            </article>
          </div>
        </section>

        {/* SEKCJA ŚCIEŻKI KRYTYCZNEJ LC */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Analiza sciezki</span>
              <h2>Sciezka krytyczna</h2>
            </div>
          </div>

          {(analysis?.criticalPath ?? []).length === 0 ? (
            <div className="empty-state">
              Brak sciezki krytycznej. Sprawdz czy projekt ma zadania z cerkiem 0.
            </div>
          ) : (
            <div className="critical-path-display">
              <div className="critical-path-sequence">
                {/* Iteruje przez każde zadanie w ścieżce krytycznej i wyświetla je w sekwencji */}
                {analysis?.criticalPath?.map((taskId, index) => {
                  const task = analysisTasks.find((t) => t.id === taskId);

                  return (
                    <div key={taskId} className="critical-path-item">
                      {/* Numer kroku w sekwencji */}
                      <div className="critical-path-step">{index + 1}</div>
                      {/* Informacje o zadaniu: ID, nazwa, czasy ES/EF */}
                      <div className="critical-path-info">
                        <div className="critical-path-label">{task?.id}</div>
                        <div className="critical-path-name">{task?.name}</div>
                        <div className="critical-path-times">
                          ES: {task?.es} | EF: {task?.ef} | Duration: {task?.duration}d
                        </div>
                      </div>
                      {/* Strzałka między zadaniami (bez strzałki na końcu) */}
                      {index < (analysis?.criticalPath?.length ?? 0) - 1 && (
                        <div className="critical-path-arrow">→</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <section className="panel metrics-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Tabela wynikow</span>
              <h2>ES / EF / LS / LF / Slack</h2>
            </div>
          </div>

          {analysisTasks.length === 0 ? (
            <div className="empty-state">Po uruchomieniu analizy tutaj pojawia sie tabela czasow.</div>
          ) : (
            <div className="table-scroll">
              <table className="metrics-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Zadanie</th>
                    <th>Czas</th>
                    <th>ES</th>
                    <th>EF</th>
                    <th>LS</th>
                    <th>LF</th>
                    <th>Slack</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {analysisTasks.map((task) => (
                    <tr key={task.id}>
                      <td>{task.id}</td>
                      <td>{task.name}</td>
                      <td>{task.duration}</td>
                      <td>{task.es}</td>
                      <td>{task.ef}</td>
                      <td>{task.ls}</td>
                      <td>{task.lf}</td>
                      <td>{task.slack}</td>
                      <td>
                        <span className={task.isCritical ? "table-badge critical" : "table-badge"}>
                          {task.isCritical ? "Krytyczne" : "Bufor"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
