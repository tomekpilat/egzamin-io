# Film promocyjny egzaminio — 15 sekund

Gotowy materiał pionowy do Reels, TikTok i YouTube Shorts:

- `egzaminio-social-15s.mp4` — 1080 × 1920 px, H.264, wersja działająca bez dźwięku z tekstami wpisanymi w obraz,
- `egzaminio-runway-social-15s.mp4` — finalny wariant z filmowym otwarciem wygenerowanym w Runway i dokładnym UI produktu,
- `runway-opening.mp4` — surowe, pięciosekundowe ujęcie wygenerowane w Runway,
- `voiceover-pl.txt` — tekst narracji,
- `storyboard.md` — plan ujęć i wskazówki do przygotowania kolejnych wariantów.

Film jest gotowy do publikacji bez dźwięku. Nie sugeruje, że egzaminio jest oficjalnym serwisem CKE. Tekst z `voiceover-pl.txt` można wkleić do funkcji text-to-speech w CapCut albo nagrać własnym głosem.

Materiały korzystają z aktualnej palety produktu: indygo `#4338CA`, bursztyn `#F59E0B`, tło `#FAFAF9` i tekst `#1E1B2E`. Zarówno animacja interfejsu, jak i nakładka na ujęcie Runway są renderowane z tych samych wartości.

Plan publikacji, opisy, UTM-y i test A/B są opisane w [strategii marketingowej MVP](../../marketing-strategy-mvp.md#film-startowy-15-s-zacznij-od-prawdziwych-zadań).

## Ponowne renderowanie

Skrypt `scripts/render-marketing-video.py` wymaga Pillow oraz FFmpeg:

```bash
python3 scripts/render-marketing-video.py \
  --ffmpeg /ścieżka/do/ffmpeg \
  --output docs/marketing/video/egzaminio-social-15s.mp4
```

## Edycja

Zaimportuj MP4 do CapCut Desktop jako projekt 9:16. Film ma już najważniejsze teksty wpisane w obraz. W CapCut warto dodać polski voice-over na podstawie załączonego tekstu, cichy podkład z biblioteki oraz przygotować wariant bez narracji do testu A/B.

## Montaż wariantu Runway

Runway odpowiada za realistyczne otwarcie, a lokalny montaż nakłada prawidłową typografię i łączy je z dokładnym widokiem produktu. Dzięki temu generatywne wideo nie jest używane do przedstawiania tekstów ani interfejsu.

```bash
python3 scripts/compose-runway-marketing-video.py \
  --ffmpeg /ścieżka/do/ffmpeg \
  --runway docs/marketing/video/runway-opening.mp4 \
  --product docs/marketing/video/egzaminio-social-15s.mp4 \
  --output docs/marketing/video/egzaminio-runway-social-15s.mp4
```
