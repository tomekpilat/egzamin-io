# egzaminio

Teaser aplikacji do przygotowania ósmoklasistów do egzaminu. Produkt łączy ćwiczenia oparte na arkuszach CKE z nauczycielem AI, który udziela podpowiedzi i wyjaśnia rozwiązania krok po kroku.

## Podgląd

### Desktop

![Teaser egzaminio — widok desktopowy](docs/previews/egzaminio-teaser-desktop.jpg)

### Mobile

<img src="docs/previews/egzaminio-teaser-mobile.jpg" alt="Teaser egzaminio — widok mobilny" width="390">

## Uruchomienie

Projekt wymaga Node.js 22.13 lub nowszego.

```bash
npm install
npm run dev
```

Strona będzie dostępna pod adresem `http://localhost:3000`.

## Docker

Obraz produkcyjny korzysta z wieloetapowego buildu i uruchamia wyłącznie serwer standalone na porcie `3000`.

```bash
docker build -t egzaminio .
docker run --rm -p 3000:3000 egzaminio
```

Po uruchomieniu:

- strona: `http://localhost:3000`
- health check: `http://localhost:3000/api/health`

Szczegółowa instrukcja wdrożenia znajduje się w [docs/coolify-deployment.md](docs/coolify-deployment.md).

## Weryfikacja

```bash
npm run build
```

## Ważne

egzaminio jest niezależnym projektem edukacyjnym i nie jest powiązany z Centralną Komisją Egzaminacyjną.
