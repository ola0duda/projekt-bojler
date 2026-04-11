# Analizator Sciezki Krytycznej (CPM)

Przegladarkowa aplikacja do planowania harmonogramow projektu z wykorzystaniem metody
**Critical Path Method (CPM)**. Repo zostalo uporzadkowane zgodnie z zalozeniem
`React (Frontend) + Node.js (Backend)`.

## Zakres gotowy dla backlogu Mateusza Adamczaka

- obliczanie `ES`, `EF`, `LS`, `LF` oraz `slack`
- generowanie ukladu grafu na podstawie zaleznosci
- rysowanie polaczen pomiedzy zadaniami
- przelaczanie widokow `ASAP` i `ALAP`

## Struktura

- `frontend/` - aplikacja React uruchamiana przez Vite
- `backend/` - API Node.js udostepniajace obliczenia CPM i dane do wizualizacji

## Uruchamianie lokalne

1. Zainstaluj frontendowe zaleznosci:
   `cmd /c npm install --prefix frontend`
2. Uruchom backend:
   `node backend/server.js`
3. W drugim terminalu uruchom frontend:
   `cmd /c npm run dev --prefix frontend`

Frontend podczas developmentu kieruje zapytania `/api` do backendu przez proxy Vite.
