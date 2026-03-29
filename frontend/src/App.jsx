import React, { useState } from 'react';

function App() {
  //stan przechowujący listę zadań
  const [tasks, setTasks] = useState([]);
  //stany dla pól formularza
  const [name, setName] = useState('');
  const [duration, setDuration] = useState('');

  const addTask = (e) => {
    e.preventDefault();

    //walidacja
    if (name.trim().length === 0) {
      alert("Podaj nazwę zadania.");
      return;
    }
    if (duration <= 0) {
      alert("Czas trwania musi być liczbą większą od 0.");
      return;
    }

    const newTask = {
      id: Date.now(), //unikalne id na podstawie czasu
      name: name,
      duration: parseInt(duration),
    };

    setTasks([...tasks, newTask]); //dodanie zadania do listy
    setName(''); //czyszczenie pola nazwy
    setDuration(''); //czyszczenie pola czasu
  };

  const removeTask = (id) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-300 p-4 md:p-10 font-sans">
      <div className="max-w-3xl mx-auto bg-white shadow-xl rounded-2xl overflow-hidden">
        
        {/* nagłówek */}
        <div className="bg-pink-500 p-6">
          <h1 className="text-white text-2xl font-bold text-center">
            projekt bojler (Metoda CPM)
          </h1>
        </div>

        <div className="p-6">
          {/* wprowadzanie danych */}
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-slate-700 mb-4">Dodaj nowe zadanie:</h2>
            <form onSubmit={addTask} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Nazwa"
                className="p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none transition-all"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                type="number"
                placeholder="Czas (dni)"
                className="p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none transition-all"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
              <button
                type="submit"
                className="bg-purple-500 hover:bg-pink-500 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-emerald-200"
              >
                Dodaj do listy +
              </button>
            </form>
          </section>

          <hr className="border-slate-100 mb-8" />

          {/* wyświetlanie listy */}
          <section>
            <h2 className="text-lg font-semibold text-slate-700 mb-4">Zdefiniowane czynności:</h2>
            {tasks.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400">
                Lista jest pusta. Dodaj pierwsze zadanie.
              </div>
            ) : (
              <div className="grid gap-3">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-shadow">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 uppercase tracking-wide">{task.name}</span>
                      <span className="text-sm text-slate-500">Czas trwania: <b className="text-blue-600">{task.duration} dni</b></span>
                    </div>
                    <button
                      onClick={() => removeTask(task.id)}
                      className="bg-red-50 hover:bg-red-100 text-red-500 p-2 rounded-lg transition-colors"
                      title="Usuń zadanie"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}

export default App;