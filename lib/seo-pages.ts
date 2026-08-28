export type SeoSource = { label: string; url: string };
export type SeoExample = { prompt: string; steps: string[]; answer: string };
export type SeoSection = { title: string; paragraphs: string[]; bullets?: string[]; example?: SeoExample; note?: string };

export type SeoPage = {
  path: string;
  category: "Rekrutacja" | "Egzamin 2027" | "Matematyka" | "Język polski" | "Język angielski" | "Arkusze" | "Dla rodzica";
  title: string;
  description: string;
  eyebrow: string;
  heading: string;
  lead: string;
  updatedAt: string;
  keywords: string[];
  facts: { value: string; label: string }[];
  sections: SeoSection[];
  faqs: { question: string; answer: string }[];
  sources: SeoSource[];
  related: string[];
  cta: { title: string; body: string; label: string; href: string };
};

const recruitmentLaw = { label: "Rozporządzenie o przeliczaniu punktów", url: "https://eli.gov.pl/api/acts/DU/2024/989/text.html" };
const recruitmentGuide = { label: "Zasady rekrutacji — Ministerstwo Edukacji", url: "https://www.gov.pl/web/edukacja/zasady-przeprowadzania-postepowania-rekrutacyjnego-i-postepowania-uzupelniajacego-do-szkol-ponadpodstawowych" };
const cke2027 = { label: "CKE — harmonogram i komunikaty 2027", url: "https://bip.cke.gov.pl/artykul/295/1998/2026-2027" };
const ckeSchedule = { label: "CKE — harmonogram egzaminów 2027", url: "https://bip.cke.gov.pl/attachments/download/10422" };
const ckeEquipment = { label: "CKE — przybory na egzamin 2027", url: "https://bip.cke.gov.pl/attachments/download/10419" };
const ckeOrganization = { label: "CKE — organizacja egzaminu 2027", url: "https://bip.cke.gov.pl/attachments/download/10428" };
const ckeMath = { label: "CKE — informator z matematyki", url: "https://bip.cke.gov.pl/attachments/download/9817" };
const ckePolish = { label: "CKE — informator z języka polskiego", url: "https://bip.cke.gov.pl/attachments/download/9925" };
const ckeEnglish = { label: "CKE — informator z języka angielskiego", url: "https://bip.cke.gov.pl/attachments/download/9818" };
const ckeArchive = { label: "CKE — informatory i materiały E8", url: "https://bip.cke.gov.pl/artykul/214/1652/egzamin-osmoklasisty" };
const examOverview = { label: "Ministerstwo Edukacji — egzamin ósmoklasisty", url: "https://www.gov.pl/web/edukacja/egzamin-osmoklasisty2" };
const youthMentalHealthSupport = { label: "Ministerstwo Zdrowia — pomoc psychologiczna dla dzieci i młodzieży", url: "https://www.gov.pl/web/zdrowie/gdzie-uzyskac-pomoc-psychologiczna-i-psychiatryczna" };

export const SEO_PAGES: SeoPage[] = [
  {
    path: "/rekrutacja/ile-punktow-do-liceum",
    category: "Rekrutacja",
    title: "Ile punktów do liceum? Zasady rekrutacji 2027",
    description: "Sprawdź, jak liczone jest maksymalnie 200 punktów do liceum i technikum: egzamin, oceny, pasek, wolontariat i konkursy.",
    eyebrow: "Rekrutacja krok po kroku",
    heading: "Ile punktów można zdobyć do liceum?",
    lead: "Maksymalny wynik rekrutacyjny to 200 punktów. Połowa pochodzi z egzaminu ósmoklasisty, a połowa ze świadectwa i osiągnięć.",
    updatedAt: "25 sierpnia 2026",
    keywords: ["ile punktów do liceum", "ile punktów można zdobyć w rekrutacji do liceum", "jak liczone są punkty do technikum", "ile punktów za oceny na świadectwie"],
    facts: [{ value: "200", label: "maksymalnie" }, { value: "100", label: "za egzamin" }, { value: "100", label: "za świadectwo" }],
    sections: [
      { title: "100 punktów za egzamin", paragraphs: ["Wynik procentowy z języka polskiego i matematyki mnoży się przez 0,35, a wynik z języka obcego przez 0,30. Daje to maksymalnie 35 + 35 + 30 punktów."], bullets: ["język polski: procent × 0,35", "matematyka: procent × 0,35", "język obcy: procent × 0,30"] },
      { title: "Oceny: maksymalnie 72 punkty", paragraphs: ["Szkoła uwzględnia język polski, matematykę oraz dwa przedmioty wskazane dla konkretnego oddziału. Dlatego tę samą ocenę trzeba liczyć osobno dla każdej wybranej klasy."], bullets: ["celujący — 18 pkt", "bardzo dobry — 17 pkt", "dobry — 14 pkt", "dostateczny — 8 pkt", "dopuszczający — 2 pkt"] },
      { title: "Pasek, wolontariat i konkursy", paragraphs: ["Świadectwo z wyróżnieniem daje 7 punktów, aktywność społeczna lub wolontariat wpisane na świadectwie — 3 punkty, a szczególne osiągnięcia maksymalnie 18 punktów."], note: "W przypadku konkursów sprawdź aktualny wykaz właściwego kuratora. Sama nazwa konkursu nie przesądza o liczbie punktów." },
      { title: "Czy technikum liczy punkty inaczej?", paragraphs: ["Podstawowa skala 200 punktów jest taka sama. Różnić mogą się dwa punktowane przedmioty profilowe, dodatkowe wymagania zdrowotne lub próby sprawnościowe dla wybranych kierunków."] },
    ],
    faqs: [
      { question: "Ile punktów daje świadectwo z paskiem?", answer: "Świadectwo ukończenia szkoły podstawowej z wyróżnieniem daje 7 punktów." },
      { question: "Ile punktów daje wolontariat?", answer: "Aktywność społeczna, w tym wolontariat, wpisana na świadectwie daje 3 punkty." },
      { question: "Czy 150 punktów wystarczy do liceum?", answer: "Nie ma jednego progu dla wszystkich szkół. Wynik trzeba porównać z konkretnym oddziałem i pamiętać, że progi z poprzedniego roku są tylko wskazówką." },
    ],
    sources: [recruitmentLaw, recruitmentGuide],
    related: ["/kalkulator-punktow", "/rekrutacja/progi-punktowe/warszawa-2027", "/egzamin-osmoklasisty-2027"],
    cta: { title: "Policz swój wynik w minutę", body: "Wpisz wyniki, oceny i osiągnięcia. Kalkulator pokaże wynik do 200 punktów i różnicę do wybranego progu.", label: "Otwórz kalkulator punktów", href: "/kalkulator-punktow" },
  },
  {
    path: "/rekrutacja/progi-punktowe/warszawa-2027",
    category: "Rekrutacja",
    title: "Progi punktowe liceów Warszawa 2027 — co już wiadomo",
    description: "Sprawdź, kiedy pojawią się progi punktowe warszawskich liceów na 2027 rok i jak bezpiecznie korzystać z wyników z poprzednich lat.",
    eyebrow: "Warszawa · rekrutacja 2027",
    heading: "Progi punktowe liceów w Warszawie 2027",
    lead: "Ostateczne progi na rok 2027 powstaną dopiero po zakończeniu rekrutacji. Wcześniej można pracować na scenariuszach i danych historycznych — nigdy na gwarancji przyjęcia.",
    updatedAt: "25 sierpnia 2026",
    keywords: ["progi punktowe liceum Warszawa 2027", "progi do liceum Warszawa", "rekrutacja liceum Warszawa 2027"],
    facts: [{ value: "2027", label: "rok rekrutacji" }, { value: "200", label: "maks. punktów" }, { value: "0", label: "znanych progów 2027" }],
    sections: [
      { title: "Dlaczego nie ma jeszcze progów 2027?", paragraphs: ["Próg nie jest ustalany z góry przez szkołę. To wynik ostatniej osoby przyjętej do konkretnego oddziału, więc zależy od wyników i preferencji wszystkich kandydatów."], note: "Nie publikujemy wymyślonych progów. Tabelę uzupełnimy dopiero po uzyskaniu kompletnego, możliwego do wskazania źródła." },
      { title: "Jak używać progów z poprzedniego roku", paragraphs: ["Porównuj ten sam oddział, języki, przedmioty rozszerzone i zasady naboru. Traktuj wynik jako punkt odniesienia i buduj trzy scenariusze: ambitny, realistyczny i bezpieczny."], bullets: ["sprawdź dokładną nazwę oddziału", "zapisz rok i źródło danych", "zostaw margines kilku punktów", "ułóż pełną listę preferencji"] },
      { title: "Co możesz zrobić już teraz", paragraphs: ["Policz aktualny wynik, sprawdź ile punktów pochodzi z egzaminu i skup przygotowania na obszarze, który daje największą realną poprawę."] },
    ],
    faqs: [
      { question: "Kiedy będą znane progi do liceów w Warszawie na 2027 rok?", answer: "Dopiero po rozstrzygnięciu rekrutacji w 2027 roku. Wcześniejsze liczby mogą być wyłącznie progami historycznymi lub symulacją." },
      { question: "Czy szkoła publikuje próg przed rekrutacją?", answer: "Nie. Próg wynika z liczby punktów kandydatów i liczby miejsc w konkretnym oddziale." },
    ],
    sources: [{ label: "Warszawa 19115 — rekrutacja do szkół ponadpodstawowych", url: "https://warszawa19115.pl/pl/-/rekrutacja-do-szk%C3%B3%C5%82-ponadpodstawowych-w-warszawie" }, recruitmentLaw],
    related: ["/kalkulator-punktow", "/rekrutacja/ile-punktow-do-liceum", "/dla-rodzica/jakie-liceum-wybrac"],
    cta: { title: "Zbuduj własny scenariusz", body: "Porównaj bieżący wynik z dowolnym historycznym progiem i zobacz, ile punktów możesz zdobyć na egzaminie.", label: "Policz punkty", href: "/kalkulator-punktow" },
  },
  {
    path: "/egzamin-osmoklasisty-2027",
    category: "Egzamin 2027",
    title: "Egzamin ósmoklasisty 2027 — terminy, czas i zasady",
    description: "Oficjalne terminy egzaminu ósmoklasisty 2027, czas trwania, przybory, wyniki i najważniejsze zasady w jednym miejscu.",
    eyebrow: "Aktualne informacje CKE",
    heading: "Egzamin ósmoklasisty 2027 bez niedomówień",
    lead: "Trzy dni, trzy obowiązkowe przedmioty. Termin główny przypada na 10–12 maja 2027 roku, zawsze o godzinie 9:00.",
    updatedAt: "25 sierpnia 2026",
    keywords: ["egzamin ósmoklasisty 2027", "kiedy egzamin ósmoklasisty 2027", "egzamin ósmoklasisty 2027 terminy", "ile trwa egzamin ósmoklasisty", "co można mieć na egzaminie ósmoklasisty", "czy można nie zdać egzaminu ósmoklasisty"],
    facts: [{ value: "10–12.05", label: "termin główny" }, { value: "9:00", label: "start każdego dnia" }, { value: "6.07", label: "wyniki" }],
    sections: [
      { title: "Terminy egzaminu 2027", paragraphs: ["Język polski odbędzie się 10 maja, matematyka 11 maja, a język obcy nowożytny 12 maja. Termin dodatkowy zaplanowano na 9–11 czerwca."], bullets: ["10 maja — język polski, 9:00", "11 maja — matematyka, 9:00", "12 maja — język obcy, 9:00"] },
      { title: "Ile trwa egzamin?", paragraphs: ["Czas to 150 minut z języka polskiego, 125 minut z matematyki oraz 110 minut z języka obcego."], bullets: ["polski — 150 minut", "matematyka — 125 minut", "język obcy — 110 minut"] },
      { title: "Co zabrać", paragraphs: ["Na każdy egzamin potrzebny jest długopis lub pióro z czarnym tuszem. Na matematykę dodatkowo linijka. CKE wskazuje, że rysunków nie wykonuje się ołówkiem, a długopisy zmazywalne są niedozwolone."], note: "Kalkulator nie jest dozwolony na standardowym egzaminie." },
      { title: "Czy można nie zdać E8?", paragraphs: ["Nie ma minimalnego progu zdawalności, więc egzaminu nie można nie zdać. Trzeba jednak do niego przystąpić, aby ukończyć szkołę podstawową, a wynik ma duże znaczenie w rekrutacji."] },
    ],
    faqs: [
      { question: "Kiedy jest egzamin ósmoklasisty 2027?", answer: "Termin główny to 10 maja — polski, 11 maja — matematyka i 12 maja — język obcy. Każdy egzamin zaczyna się o 9:00." },
      { question: "Kiedy będą wyniki egzaminu 2027?", answer: "CKE wyznaczyła ogłoszenie wyników i wydanie zaświadczeń na 6 lipca 2027 roku." },
      { question: "Ile procent trzeba mieć, żeby zdać?", answer: "Egzamin ósmoklasisty nie ma progu zdawalności. Każdy wynik jest jednak przeliczany na punkty rekrutacyjne." },
    ],
    sources: [cke2027, ckeSchedule, ckeEquipment, examOverview],
    related: ["/egzamin-osmoklasisty-2027/wyniki-ziu", "/rekrutacja/ile-punktow-do-liceum", "/kalkulator-punktow"],
    cta: { title: "Wiesz już kiedy. Teraz zaplanuj przygotowania.", body: "Ćwicz zadania z trzech przedmiotów i pytaj AI wyłącznie o aktualnie rozwiązywane zadanie.", label: "Załóż darmowe konto", href: "/logowanie?tryb=rejestracja&rola=uczen" },
  },
  {
    path: "/egzamin-osmoklasisty-2027/wyniki-ziu",
    category: "Egzamin 2027",
    title: "Wyniki egzaminu ósmoklasisty 2027 i logowanie ZIU",
    description: "Sprawdź, kiedy będą wyniki E8 2027, gdzie jest oficjalne logowanie ZIU i skąd otrzymać login oraz hasło.",
    eyebrow: "Wyniki · ZIU-SIOEO",
    heading: "Wyniki E8 2027: kiedy i gdzie je sprawdzić",
    lead: "Wyniki mają zostać udostępnione 6 lipca 2027 roku od godziny 8:30 w oficjalnym systemie ZIU-SIOEO.",
    updatedAt: "25 sierpnia 2026",
    keywords: ["wyniki egzaminu ósmoklasisty 2027", "ZIU logowanie wyniki egzaminu"],
    facts: [{ value: "6.07.2027", label: "dzień wyników" }, { value: "8:30", label: "publikacja w ZIU" }, { value: "3", label: "wyniki przedmiotowe" }],
    sections: [
      { title: "Jak zalogować się do ZIU", paragraphs: ["Wejdź wyłącznie na oficjalny adres ZIU. Login i hasło przekazuje dyrektor szkoły, w której uczeń pisał egzamin. System dopuszcza także logowanie przez Profil Zaufany, e-dowód lub bankowość elektroniczną."], bullets: ["oficjalny adres: ziu.gov.pl/login", "dane dostępowe otrzymasz w szkole", "nie podawaj hasła na stronach z wynikami ani kalkulatorach"] },
      { title: "Co zobaczysz w systemie", paragraphs: ["ZIU pokazuje wynik ogólny z każdego przedmiotu oraz rezultat za poszczególne zadania. Zaświadczenie z wynikami szkoła przekazuje zgodnie z harmonogramem CKE."] },
      { title: "Co zrobić po otrzymaniu wyników", paragraphs: ["Przelicz procenty na punkty rekrutacyjne, zaktualizuj listę preferencji zgodnie z zasadami swojego naboru i zachowaj dokument otrzymany ze szkoły."] },
    ],
    faqs: [
      { question: "Skąd wziąć hasło do ZIU?", answer: "Login i hasło przekazuje uczeńowi dyrektor szkoły, w której zdawał egzamin." },
      { question: "Czy egzaminio przechowuje hasło do ZIU?", answer: "Nie. egzaminio nie prosi o dane logowania do ZIU i nie pośredniczy w logowaniu do systemu państwowego." },
    ],
    sources: [ckeSchedule, ckeOrganization],
    related: ["/egzamin-osmoklasisty-2027", "/kalkulator-punktow", "/rekrutacja/ile-punktow-do-liceum"],
    cta: { title: "Masz wyniki? Przelicz je na punkty", body: "Kalkulator działa bez logowania i nie zapisuje wpisanych danych.", label: "Przejdź do kalkulatora", href: "/kalkulator-punktow" },
  },
];

SEO_PAGES.push(
  {
    path: "/matematyka/procenty-zadania-egzamin-osmoklasisty",
    category: "Matematyka",
    title: "Procenty — zadania na egzamin ósmoklasisty z rozwiązaniami",
    description: "Przećwicz obliczenia procentowe: procent liczby, podwyżki, obniżki i punkty procentowe. Zadania z rozwiązaniami krok po kroku.",
    eyebrow: "Matematyka · procenty",
    heading: "Procenty bez zgadywania",
    lead: "Większość zadań procentowych sprowadza się do jednego pytania: co jest całością, a co jej częścią? Zaznacz te dwie liczby przed rozpoczęciem rachunków.",
    updatedAt: "25 sierpnia 2026",
    keywords: ["procenty zadania egzamin ósmoklasisty", "obliczenia procentowe zadania z rozwiązaniami"],
    facts: [{ value: "1%", label: "jedna setna" }, { value: "25%", label: "jedna czwarta" }, { value: "× 0,8", label: "obniżka o 20%" }],
    sections: [
      { title: "Trzy typy zadań", paragraphs: ["Na egzaminie trzeba zwykle policzyć procent liczby, odtworzyć całość na podstawie części albo porównać zmianę. Nazwanie typu zadania jest ważniejsze niż zapamiętanie osobnego wzoru na każdy przypadek."], bullets: ["procent liczby: zamień procent na ułamek i pomnóż", "szukanie całości: podziel część przez odpowiadający jej ułamek", "podwyżka lub obniżka: użyj mnożnika, np. 1,15 albo 0,85"] },
      { title: "Przykład krok po kroku", paragraphs: ["Kurtka kosztowała 240 zł. Po obniżce jest tańsza o 15%. Ile kosztuje teraz?"], example: { prompt: "Cena 240 zł, obniżka 15%.", steps: ["Oblicz 15% z 240: 0,15 × 240 = 36.", "Odejmij rabat od ceny: 240 − 36 = 204."], answer: "Po obniżce kurtka kosztuje 204 zł." } },
      { title: "Punkty procentowe to nie procent", paragraphs: ["Zmiana z 40% na 50% oznacza wzrost o 10 punktów procentowych, ale o 25% względem wartości początkowej. W poleceniu sprawdź, której z tych dwóch odpowiedzi oczekuje autor."], note: "Zapisuj jednostkę przy wyniku. Sama liczba 10 może oznaczać złote, procenty albo punkty procentowe." },
    ],
    faqs: [
      { question: "Jak szybko policzyć 10% liczby?", answer: "Podziel liczbę przez 10. Dla 240 jest to 24." },
      { question: "Czy przy procentach można używać kalkulatora na E8?", answer: "Nie. Na matematykę uczeń przynosi czarny długopis i linijkę." },
    ],
    sources: [ckeMath, ckeEquipment],
    related: ["/matematyka/twierdzenie-pitagorasa-zadania", "/matematyka/zadania-otwarte", "/egzamin-osmoklasisty-2027"],
    cta: { title: "Sprawdź procenty na zadaniach", body: "Rozwiąż ćwiczenie samodzielnie, a gdy utkniesz, poproś AI o podpowiedź do konkretnego kroku.", label: "Ćwicz za darmo", href: "/logowanie?tryb=rejestracja&rola=uczen" },
  },
  {
    path: "/matematyka/twierdzenie-pitagorasa-zadania",
    category: "Matematyka",
    title: "Twierdzenie Pitagorasa — zadania klasa 8 krok po kroku",
    description: "Twierdzenie Pitagorasa dla klasy 8: jak rozpoznać trójkąt prostokątny, wybrać przeciwprostokątną i rozwiązać zadanie.",
    eyebrow: "Matematyka · geometria",
    heading: "Twierdzenie Pitagorasa: najpierw nazwij boki",
    lead: "Wzór a² + b² = c² działa w trójkącie prostokątnym, a c zawsze oznacza bok leżący naprzeciw kąta prostego — najdłuższy bok.",
    updatedAt: "25 sierpnia 2026",
    keywords: ["twierdzenie Pitagorasa zadania klasa 8", "Pitagoras egzamin ósmoklasisty"],
    facts: [{ value: "a²+b²", label: "suma kwadratów przyprostokątnych" }, { value: "c²", label: "kwadrat przeciwprostokątnej" }, { value: "90°", label: "warunek użycia" }],
    sections: [
      { title: "Schemat rozwiązania", paragraphs: ["Zaznacz kąt prosty, wskaż bok naprzeciw niego, podstaw długości do wzoru i dopiero na końcu wyciągnij pierwiastek. Ten porządek zapobiega najczęstszemu błędowi: pomyleniu c z krótszym bokiem."], bullets: ["sprawdź, czy trójkąt jest prostokątny", "oznacz przeciwprostokątną jako c", "podstaw znane długości", "oblicz brakujący kwadrat i pierwiastek"] },
      { title: "Przykład 6–8–10", paragraphs: ["Przyprostokątne mają długości 6 cm i 8 cm. Szukamy przeciwprostokątnej."], example: { prompt: "a = 6 cm, b = 8 cm, c = ?", steps: ["c² = 6² + 8²", "c² = 36 + 64 = 100", "c = √100 = 10"], answer: "Przeciwprostokątna ma 10 cm." } },
      { title: "Kiedy odejmować", paragraphs: ["Jeżeli znasz przeciwprostokątną i jedną przyprostokątną, przenieś znany kwadrat na drugą stronę: b² = c² − a². Nie odejmuj długości boków przed podniesieniem ich do kwadratu."] },
    ],
    faqs: [
      { question: "Który bok to c?", answer: "Bok naprzeciw kąta prostego. Jest przeciwprostokątną i najdłuższym bokiem trójkąta." },
      { question: "Czy twierdzenie działa w każdym trójkącie?", answer: "Nie. W tej postaci dotyczy wyłącznie trójkąta prostokątnego." },
    ],
    sources: [ckeMath],
    related: ["/matematyka/procenty-zadania-egzamin-osmoklasisty", "/matematyka/zadania-otwarte", "/arkusze"],
    cta: { title: "Sam wzór to za mało", body: "Przećwicz rozpoznawanie danych w różnych rysunkach i zadaniach tekstowych.", label: "Rozwiąż zadania", href: "/logowanie?tryb=rejestracja&rola=uczen" },
  },
  {
    path: "/matematyka/zadania-otwarte",
    category: "Matematyka",
    title: "Zadania otwarte z matematyki E8 — jak zdobywać punkty",
    description: "Jak rozwiązywać zadania otwarte na egzaminie ósmoklasisty: zapis metody, punkty za postęp i praktyczna checklista.",
    eyebrow: "Matematyka · zadania otwarte",
    heading: "W zadaniu otwartym liczy się droga",
    lead: "Według informatora CKE zadania otwarte stanowią około połowy punktów z matematyki. Nie wystarczy odpowiedź — pokaż tok rozumowania.",
    updatedAt: "25 sierpnia 2026",
    keywords: ["zadania otwarte matematyka egzamin ósmoklasisty", "jak rozwiązywać zadania otwarte z matematyki"],
    facts: [{ value: "5–6", label: "zadań otwartych" }, { value: "15–16", label: "punktów" }, { value: "~50%", label: "wyniku z matematyki" }],
    sections: [
      { title: "Jak oceniane jest rozwiązanie", paragraphs: ["Za pełne rozwiązanie można otrzymać 2 lub 3 punkty. CKE przewiduje także punkty za istotny postęp lub pokonanie zasadniczej trudności, nawet gdy dalszy rachunek zawiera błąd."], note: "Nie wymazuj poprawnego pomysłu tylko dlatego, że wynik nie wygląda ładnie. Sprawdź rachunki i zapisz wniosek." },
      { title: "Checklista przed oddaniem", paragraphs: ["Krótka kontrola często odzyskuje punkt bez ponownego rozwiązywania całego zadania."], bullets: ["czy wypisałem dane i szukaną wielkość?", "czy widać metodę, a nie tylko wynik?", "czy jednostki są poprawne?", "czy odpowiedziałem dokładnie na pytanie?", "czy wynik ma sens w kontekście? "] },
      { title: "Zapisuj zależności", paragraphs: ["Jeżeli nie widzisz końca rozwiązania, zapisz prawidłowe równanie, wzór, diagram lub zależność. To może pokazać istotny postęp, a Tobie ułatwić kolejny krok."] },
    ],
    faqs: [
      { question: "Czy można dostać punkt mimo błędnego wyniku?", answer: "Tak, jeżeli zapis pokazuje istotny postęp zgodny z zasadami oceniania konkretnego zadania. Liczba punktów zależy od tego, jak daleko rozwiązanie prowadziło poprawną metodą." },
      { question: "Ile jest zadań otwartych?", answer: "Informator CKE przewiduje 5–6 zadań otwartych w arkuszu matematycznym." },
    ],
    sources: [ckeMath],
    related: ["/matematyka/procenty-zadania-egzamin-osmoklasisty", "/matematyka/twierdzenie-pitagorasa-zadania", "/arkusze"],
    cta: { title: "Ćwicz pełny zapis rozwiązania", body: "AI może wskazać kolejny krok, ale nie zastąpi Twojego toku rozumowania.", label: "Przejdź do ćwiczeń", href: "/logowanie?tryb=rejestracja&rola=uczen" },
  },
  {
    path: "/jezyk-angielski/funkcje-jezykowe",
    category: "Język angielski",
    title: "Funkcje językowe na egzaminie ósmoklasisty — przykłady",
    description: "Prośba, propozycja, przeprosiny i uzyskiwanie informacji: funkcje językowe z angielskiego E8 wyjaśnione na sytuacjach.",
    eyebrow: "Angielski · komunikacja",
    heading: "Funkcje językowe: najpierw sytuacja, potem zdanie",
    lead: "W tych zadaniach nie tłumaczysz słowo w słowo. Rozpoznajesz zamiar rozmówcy: prośbę, zgodę, odmowę, propozycję albo reakcję.",
    updatedAt: "25 sierpnia 2026",
    keywords: ["funkcje językowe egzamin ósmoklasisty angielski"],
    facts: [{ value: "Who?", label: "kto mówi" }, { value: "Why?", label: "po co mówi" }, { value: "What next?", label: "jaka reakcja pasuje" }],
    sections: [
      { title: "Najczęstsze intencje", paragraphs: ["Ucz się całych reakcji w kontekście, nie pojedynczych słów. To samo słowo może znaczyć coś innego zależnie od sytuacji."], bullets: ["prośba: Could you…? / Would you mind…?", "propozycja: How about…? / Shall we…?", "rada: You should… / If I were you…", "przeprosiny: I’m sorry… / It was my fault.", "zgoda i odmowa: Sure. / I’m afraid I can’t."] },
      { title: "Minićwiczenie", paragraphs: ["A: Would you mind opening the window? B: …"], example: { prompt: "Wybierz reakcję: A. Not at all. B. Never mind. C. I do not know.", steps: ["Would you mind…? jest uprzejmą prośbą.", "Not at all oznacza tutaj zgodę na wykonanie prośby."], answer: "A. Not at all." } },
      { title: "Pułapka podobnych zwrotów", paragraphs: ["Never mind zwykle oznacza nie przejmuj się lub nieważne. Not at all może znaczyć wcale nie albo uprzejmą zgodę — sens zależy od pytania."] },
    ],
    faqs: [{ question: "Jak uczyć się funkcji językowych?", answer: "Grupuj zwroty według intencji i ćwicz je w krótkich dialogach. Samo tłumaczenie listy zwrotów nie wystarcza." }],
    sources: [ckeEnglish],
    related: ["/jezyk-angielski/srodki-jezykowe", "/jezyk-angielski/email-wzor", "/egzamin-osmoklasisty-2027"],
    cta: { title: "Przećwicz reakcje w kontekście", body: "Krótka seria dialogów lepiej utrwala funkcję niż długa lista zwrotów.", label: "Ćwicz angielski", href: "/logowanie?tryb=rejestracja&rola=uczen" },
  },
  {
    path: "/jezyk-angielski/srodki-jezykowe",
    category: "Język angielski",
    title: "Środki językowe na E8 — gramatyka i słownictwo",
    description: "Jak ćwiczyć środki językowe na egzamin ósmoklasisty: gramatyka, słownictwo, transformacje i uzupełnianie luk.",
    eyebrow: "Angielski · język w użyciu",
    heading: "Środki językowe: patrz na całe zdanie",
    lead: "Zadanie sprawdza jednocześnie gramatykę, słownictwo i sens. Zanim wpiszesz odpowiedź, ustal czas, osobę i część mowy potrzebną w luce.",
    updatedAt: "25 sierpnia 2026",
    keywords: ["środki językowe angielski egzamin ósmoklasisty", "czasy angielskie na egzamin ósmoklasisty"],
    facts: [{ value: "sens", label: "najpierw" }, { value: "forma", label: "potem" }, { value: "pisownia", label: "na końcu" }],
    sections: [
      { title: "Procedura dla każdej luki", paragraphs: ["Przeczytaj całe zdanie, nazwij brakującą część mowy, znajdź sygnał czasu lub konstrukcji i dopiero utwórz formę. Na końcu przeczytaj zdanie ponownie."], bullets: ["yesterday → zwykle Past Simple", "since lub for → często Present Perfect", "than → forma stopnia wyższego", "to + bezokolicznik albo czasownik z -ing zależnie od konstrukcji"] },
      { title: "Minićwiczenie", paragraphs: ["She has lived here ___ 2022."], example: { prompt: "Wstaw since albo for.", steps: ["2022 jest punktem rozpoczęcia.", "Since łączymy z konkretnym momentem, a for z okresem."], answer: "She has lived here since 2022." } },
      { title: "Nie ucz się czasów w izolacji", paragraphs: ["Na egzaminie czas gramatyczny służy znaczeniu. Ćwicz kontrasty, np. Past Simple kontra Present Perfect, na krótkich kontekstach i sygnałach czasowych."] },
    ],
    faqs: [{ question: "Czy środki językowe to tylko gramatyka?", answer: "Nie. CKE zalicza do nich środki leksykalne, gramatyczne i ortograficzne." }],
    sources: [ckeEnglish],
    related: ["/jezyk-angielski/funkcje-jezykowe", "/jezyk-angielski/email-wzor", "/arkusze"],
    cta: { title: "Ćwicz jedną pułapkę naraz", body: "Wybierz angielski i rozwiązuj zadania z wyjaśnieniem błędu.", label: "Przejdź do zadań", href: "/logowanie?tryb=rejestracja&rola=uczen" },
  },
  {
    path: "/jezyk-angielski/email-wzor",
    category: "Język angielski",
    title: "E-mail na egzaminie ósmoklasisty — wzór i 50–120 słów",
    description: "Jak napisać e-mail po angielsku na E8: schemat, limit 50–120 słów, trzy podpunkty i kryteria oceniania.",
    eyebrow: "Angielski · wypowiedź pisemna",
    heading: "Dobry e-mail rozwija trzy podpunkty",
    lead: "CKE przewiduje jedną wypowiedź pisemną: e-mail albo wpis na blogu, długości 50–120 słów. Najwięcej zależy od rozwinięcia informacji z polecenia.",
    updatedAt: "25 sierpnia 2026",
    keywords: ["email egzamin ósmoklasisty angielski wzór", "ile słów email egzamin ósmoklasisty angielski"],
    facts: [{ value: "50–120", label: "słów" }, { value: "3", label: "podpunkty" }, { value: "10", label: "punktów" }],
    sections: [
      { title: "Schemat, który pilnuje treści", paragraphs: ["Zamiast zapamiętywać gotowy tekst, użyj krótkiej konstrukcji: przywitanie, zdanie wprowadzające, trzy rozwinięte podpunkty, zakończenie. Każdy podpunkt powinien zawierać dodatkowy szczegół lub powód."], bullets: ["Hi Alex,", "Thanks for your message. I want to tell you about…", "podpunkt 1 + szczegół", "podpunkt 2 + powód", "podpunkt 3 + przykład", "Write back soon. / All the best,"] },
      { title: "Jak rozwinąć podpunkt", paragraphs: ["Samo I liked the trip może tylko odnosić się do polecenia. Dodanie because we visited a science museum and tried an experiment rozwija informację i pokazuje zakres języka."] },
      { title: "Cztery kryteria", paragraphs: ["Wypowiedź jest oceniana za treść, spójność i logikę, zakres środków językowych oraz ich poprawność. Najpierw dopilnuj komunikatu, potem poprawiaj język."], note: "Nie wklejaj wyuczonego tekstu, który nie realizuje polecenia. Wzór ma być rusztowaniem, nie gotowcem." },
    ],
    faqs: [
      { question: "Ile słów ma mieć e-mail na E8?", answer: "Aktualny informator CKE wskazuje 50–120 słów." },
      { question: "Czy trzeba podać temat wiadomości?", answer: "W arkuszu początek wypowiedzi jest podany. Najważniejsze jest wykonanie trzech podpunktów polecenia zgodnie z formą." },
    ],
    sources: [ckeEnglish],
    related: ["/jezyk-angielski/funkcje-jezykowe", "/jezyk-angielski/srodki-jezykowe", "/arkusze"],
    cta: { title: "Napisz własny e-mail", body: "Przećwicz realizację polecenia bez kopiowania gotowych prac.", label: "Ćwicz angielski", href: "/logowanie?tryb=rejestracja&rola=uczen" },
  },
);

SEO_PAGES.push(
  {
    path: "/dla-rodzica/jak-przygotowac-dziecko-do-egzaminu",
    category: "Dla rodzica",
    title: "Jak przygotować dziecko do egzaminu ósmoklasisty",
    description: "Praktyczny plan dla rodzica: diagnoza, rytm nauki, arkusze, odpoczynek i wspieranie dziecka bez dokładania presji.",
    eyebrow: "Dla rodzica · plan przygotowań",
    heading: "Wspieraj rytm, nie pilnuj każdej odpowiedzi",
    lead: "Najbardziej pomaga przewidywalny plan, spokojna rozmowa o trudnościach i zauważanie regularności. Wynik pojedynczego testu nie powinien sterować atmosferą w domu.",
    updatedAt: "25 sierpnia 2026",
    keywords: ["jak przygotować dziecko do egzaminu ósmoklasisty", "kiedy zacząć przygotowania do egzaminu ósmoklasisty"],
    facts: [{ value: "3", label: "przedmioty" }, { value: "2–4", label: "krótkie sesje tygodniowo" }, { value: "1", label: "pełny arkusz co kilka tygodni" }],
    sections: [
      { title: "Zacznij od diagnozy", paragraphs: ["Jeden arkusz lub krótki zestaw z każdego przedmiotu pokaże, gdzie uczeń traci punkty. Rozdziel braki w wiedzy od problemów z czytaniem polecenia, rachunkiem i zarządzaniem czasem."] },
      { title: "Ustal mały rytm", paragraphs: ["Dwie lub trzy krótkie, zaplanowane sesje są zwykle łatwiejsze do utrzymania niż weekendowy maraton. Konkretne zadanie, np. trzy zadania z procentów, działa lepiej niż ogólne ucz się matematyki."], bullets: ["zapisz stałe dni i krótkie cele", "mieszaj powtórkę z nowymi zadaniami", "co kilka tygodni wykonaj pełny arkusz", "po arkuszu wybierz jeden priorytet, nie dziesięć"] },
      { title: "O czym rozmawiać", paragraphs: ["Pytaj: co było dziś łatwiejsze, gdzie utknąłeś i jaki będzie następny krok. Unikaj porównywania z innymi uczniami oraz czytania prywatnych rozmów dziecka z narzędziem edukacyjnym."], note: "Panel rodzica w egzaminio pokazuje trend i regularność, ale nie udostępnia treści rozmów dziecka z AI." },
    ],
    faqs: [
      { question: "Kiedy zacząć przygotowania?", answer: "Najlepiej zacząć od spokojnej diagnozy na początku klasy ósmej. Nawet później regularny, priorytetowy plan jest lepszy niż chaotyczne nadrabianie wszystkiego." },
      { question: "Ile czasu dziennie się uczyć?", answer: "Nie ma jednej liczby dla każdego ucznia. Krótka, skupiona sesja z konkretnym celem jest lepsza niż długa obecność nad książką bez informacji zwrotnej." },
    ],
    sources: [cke2027, ckeArchive],
    related: ["/dla-rodzica/korepetycje-czy-kurs-online", "/dla-rodzica/stres-przed-egzaminem", "/egzamin-osmoklasisty-2027"],
    cta: { title: "Zobacz postęp bez zaglądania przez ramię", body: "Połącz konto rodzica z kontem dziecka i obserwuj regularność oraz tematy wymagające wsparcia.", label: "Załóż konto rodzica", href: "/logowanie?tryb=rejestracja&rola=rodzic" },
  },
  {
    path: "/dla-rodzica/korepetycje-czy-kurs-online",
    category: "Dla rodzica",
    title: "Korepetycje czy kurs online przed egzaminem ósmoklasisty?",
    description: "Porównanie korepetycji, kursu grupowego i nauki online: dla kogo działają, jakie mają ograniczenia i jak wybrać bez obietnic bez pokrycia.",
    eyebrow: "Dla rodzica · wybór wsparcia",
    heading: "Wybierz format do problemu, nie do reklamy",
    lead: "Korepetycje pomagają przy konkretnych brakach i potrzebie indywidualnej informacji zwrotnej. Narzędzie online ułatwia regularną praktykę. Często najlepsze jest rozsądne połączenie obu.",
    updatedAt: "25 sierpnia 2026",
    keywords: ["czy warto kurs przygotowawczy do egzaminu ósmoklasisty", "korepetycje czy kurs online przed egzaminem ósmoklasisty", "ile kosztują korepetycje z matematyki klasa 8"],
    facts: [{ value: "1:1", label: "korepetycje" }, { value: "grupa", label: "kurs" }, { value: "na żądanie", label: "ćwiczenia online" }],
    sections: [
      { title: "Kiedy wybrać korepetycje", paragraphs: ["Indywidualne spotkanie jest przydatne, gdy uczeń ma trwałą lukę, potrzebuje obserwacji sposobu myślenia albo nie potrafi sam rozpocząć zadania. Jakość zależy od nauczyciela i dopasowania, nie od samej ceny."] },
      { title: "Kiedy działa kurs lub aplikacja", paragraphs: ["Kurs grupowy daje strukturę i termin. Aplikacja pozwala ćwiczyć częściej, dobierać temat oraz od razu analizować błąd. Wymaga jednak nawyku i nie zastępuje specjalistycznej pomocy w każdej sytuacji."] },
      { title: "Jak porównać realny koszt", paragraphs: ["Porównuj koszt całego okresu, liczbę aktywnych sesji, dostęp do zadań i jakość informacji zwrotnej. Ceny korepetycji są lokalne i zmienne — bez aktualnego badania rynku nie ma uczciwej jednej stawki dla całej Polski."], bullets: ["ustal problem do rozwiązania", "poproś o plan i sposób mierzenia postępu", "sprawdź możliwość rezygnacji", "po miesiącu oceń zachowanie i wyniki, nie tylko frekwencję"] },
    ],
    faqs: [
      { question: "Czy kurs online zastąpi korepetytora?", answer: "Nie zawsze. Może dobrze obsłużyć regularne ćwiczenie i wyjaśnienia, ale przy głębokich trudnościach indywidualna praca z nauczycielem może być potrzebna." },
      { question: "Ile kosztują korepetycje?", answer: "Cena zależy od miasta, doświadczenia nauczyciela, formy i długości zajęć. Porównuj aktualne oferty lokalne oraz koszt całego planu, a nie pojedynczej lekcji." },
    ],
    sources: [ckeArchive],
    related: ["/dla-rodzica/jak-przygotowac-dziecko-do-egzaminu", "/plan-plus", "/dla-rodzica/stres-przed-egzaminem"],
    cta: { title: "Najpierw sprawdź, czy regularność działa", body: "Plan Free pozwala rozpocząć ćwiczenia bez opłat. Decyzję o dodatkowym wsparciu podejmij na podstawie realnych potrzeb.", label: "Wypróbuj za darmo", href: "/logowanie?tryb=rejestracja&rola=rodzic" },
  },
  {
    path: "/dla-rodzica/stres-przed-egzaminem",
    category: "Dla rodzica",
    title: "Jak pomóc dziecku przed egzaminem ósmoklasisty — stres",
    description: "Co rodzic może zrobić, gdy dziecko stresuje się egzaminem: plan, rozmowa, sen, próbna sytuacja i moment na profesjonalną pomoc.",
    eyebrow: "Dla rodzica · dobrostan",
    heading: "Stres potrzebuje przewidywalności, nie kolejnej presji",
    lead: "Napięcie przed ważnym wydarzeniem jest naturalne. Pomaga jasny plan, przećwiczona procedura dnia egzaminu i przekonanie, że wynik nie definiuje wartości dziecka.",
    updatedAt: "25 sierpnia 2026",
    keywords: ["jak pomóc dziecku przed egzaminem ósmoklasisty stres"],
    facts: [{ value: "plan", label: "zmniejsza niepewność" }, { value: "sen", label: "wspiera koncentrację" }, { value: "rozmowa", label: "bez porównań" }],
    sections: [
      { title: "Tydzień przed egzaminem", paragraphs: ["Nie próbuj nadrobić całego programu. Wybierz krótkie powtórki, przypomnij procedurę, przygotuj przybory i zaplanuj drogę. Ostatnie dni powinny zmniejszać chaos, nie zwiększać liczbę godzin nauki."] },
      { title: "Zdania, które pomagają", paragraphs: ["Zamiast musisz zdobyć przynajmniej 80%, powiedz: przygotowałeś się według planu; skup się na jednym poleceniu naraz. Pytaj, jakiego wsparcia dziecko potrzebuje, zanim zaczniesz doradzać."], bullets: ["Chcesz, żebym posłuchał czy pomógł ułożyć plan?", "Wynik jest ważny, ale nie mówi wszystkiego o Tobie.", "Na egzaminie wracaj do oddechu i jednego zadania."] },
      { title: "Kiedy szukać dodatkowej pomocy", paragraphs: ["Jeżeli lęk długo utrudnia sen, jedzenie, chodzenie do szkoły lub codzienne funkcjonowanie, warto skontaktować się z psychologiem szkolnym, poradnią albo lekarzem. Strona edukacyjna nie zastępuje diagnozy ani terapii."], note: "W sytuacji bezpośredniego zagrożenia zdrowia lub życia zadzwoń pod 112. Dzieci i młodzież mogą też bezpłatnie i anonimowo skorzystać z telefonu zaufania 116 111." },
    ],
    faqs: [{ question: "Czy rozwiązywać arkusz dzień przed egzaminem?", answer: "Pełny arkusz może niepotrzebnie zwiększyć napięcie. Lepsza bywa krótka powtórka znanych strategii i przygotowanie spokojnego poranka." }],
    sources: [ckeSchedule, ckeEquipment, youthMentalHealthSupport],
    related: ["/dla-rodzica/jak-przygotowac-dziecko-do-egzaminu", "/egzamin-osmoklasisty-2027", "/arkusze"],
    cta: { title: "Mniej chaosu, jeden następny krok", body: "Ustal tygodniowy cel i obserwuj regularność zamiast pojedynczego wyniku.", label: "Zobacz panel rodzica", href: "/logowanie?tryb=rejestracja&rola=rodzic" },
  },
  {
    path: "/dla-rodzica/jakie-liceum-wybrac",
    category: "Dla rodzica",
    title: "Jakie liceum wybrać dla dziecka? Praktyczna checklista",
    description: "Jak porównać licea i profile: dojazd, atmosfera, przedmioty rozszerzone, języki, wyniki i progi bez wybierania wyłącznie po rankingu.",
    eyebrow: "Dla rodzica · wybór szkoły",
    heading: "Wybieraj oddział, nie tylko szyld szkoły",
    lead: "Profil, nauczyciele, dojazd i codzienne środowisko mogą mieć większe znaczenie niż kilka miejsc w rankingu. Zbuduj listę, która łączy ambicję z realnym dopasowaniem.",
    updatedAt: "25 sierpnia 2026",
    keywords: ["jakie liceum wybrać dla dziecka"],
    facts: [{ value: "profil", label: "przedmioty rozszerzone" }, { value: "dojazd", label: "codzienny koszt czasu" }, { value: "3", label: "scenariusze wyboru" }],
    sections: [
      { title: "Porównaj konkretny oddział", paragraphs: ["W jednej szkole różne oddziały mogą mieć inne rozszerzenia, języki, punktowane przedmioty i progi. Czytaj ofertę oddziału, nie tylko opis całej placówki."] },
      { title: "Checklista wizyty", paragraphs: ["Dzień otwarty warto wykorzystać do pytań o zmianę profilu, podział na grupy, liczbę godzin rozszerzeń, pomoc dla nowych uczniów i typowy plan lekcji."], bullets: ["czy rozszerzenia pasują do zainteresowań?", "ile trwa dojazd w godzinach szczytu?", "jak wygląda nauka języków?", "czy uczeń czuje się bezpiecznie w tej przestrzeni?", "jakie są zasady zmiany oddziału?"] },
      { title: "Ułóż listę preferencji", paragraphs: ["Połącz wybory ambitne, realistyczne i bezpieczne. Kolejność powinna odzwierciedlać prawdziwe preferencje ucznia, a nie próbę odgadnięcia algorytmu naboru."], note: "Progi historyczne są wskazówką. Ostateczny wynik zależy od kandydatów w danym roku." },
    ],
    faqs: [{ question: "Czy ranking liceów powinien decydować?", answer: "Ranking jest jednym z sygnałów, ale nie opisuje dopasowania profilu, dojazdu, atmosfery ani potrzeb konkretnego ucznia." }],
    sources: [recruitmentGuide],
    related: ["/rekrutacja/progi-punktowe/warszawa-2027", "/kalkulator-punktow", "/dla-rodzica/jak-przygotowac-dziecko-do-egzaminu"],
    cta: { title: "Najpierw poznaj swój scenariusz punktowy", body: "Policz aktualny wynik i porównuj oddziały na wspólnej skali — bez traktowania progów jak gwarancji.", label: "Policz punkty", href: "/kalkulator-punktow" },
  },
);

SEO_PAGES.push(
  {
    path: "/jezyk-polski/lektury-obowiazkowe",
    category: "Język polski",
    title: "Lektury obowiązkowe na egzamin ósmoklasisty 2027",
    description: "Aktualna lista lektur obowiązkowych na E8, podział na klasy IV–VI i VII–VIII oraz sposób wykorzystania lektury w wypracowaniu.",
    eyebrow: "Język polski · lektury",
    heading: "Lektury obowiązkowe: lista i sposób powtórki",
    lead: "Nie wystarczy znać fabułę. Na egzaminie liczy się rozpoznanie problemu, motywu, decyzji bohatera i umiejętność użycia utworu jako argumentu.",
    updatedAt: "25 sierpnia 2026",
    keywords: ["lektury obowiązkowe egzamin ósmoklasisty", "lista lektur ósmoklasisty 2027"],
    facts: [{ value: "5", label: "pełnych lektur IV–VI" }, { value: "6", label: "pełnych lektur VII–VIII" }, { value: "150", label: "min. słów w pracy" }],
    sections: [
      { title: "Pozycje poznawane w całości", paragraphs: ["W klasach IV–VI informator wymienia: Akademię Pana Kleksa, Kajko i Kokosz. Szkołę latania, Opowieści z Narnii, Chłopców z Placu Broni oraz Hobbita."], bullets: ["Akademia Pana Kleksa — Jan Brzechwa", "Kajko i Kokosz. Szkoła latania — Janusz Christa", "Opowieści z Narnii — C.S. Lewis", "Chłopcy z Placu Broni — Ferenc Molnár", "Hobbit — J.R.R. Tolkien"] },
      { title: "Lektury klas VII–VIII", paragraphs: ["W całości omawiane są: Opowieść wigilijna, Zemsta, Kamienie na szaniec, Dziady część II, Mały Książę i Balladyna."], bullets: ["Opowieść wigilijna — Charles Dickens", "Zemsta — Aleksander Fredro", "Kamienie na szaniec — Aleksander Kamiński", "Dziady część II — Adam Mickiewicz", "Mały Książę — Antoine de Saint-Exupéry", "Balladyna — Juliusz Słowacki"] },
      { title: "Jak powtarzać lekturę", paragraphs: ["Dla każdego utworu przygotuj jedną kartę: bohater i jego przemiana, trzy ważne zdarzenia, dwa motywy oraz jeden cytat lub scena, którą potrafisz opisać własnymi słowami."], note: "Lista lektur znajduje się również na początku arkusza, ale nie zastępuje znajomości treści i problematyki wymaganych utworów." },
    ],
    faqs: [
      { question: "Czy trzeba znać całe Quo vadis?", answer: "W aktualnym informatorze Quo vadis występuje jako utwór poznawany we fragmentach. Warto zawsze sprawdzać bieżący informator CKE." },
      { question: "Czy lista lektur jest w arkuszu?", answer: "Tak, informator CKE przewiduje zamieszczenie listy lektur obowiązkowych na początku arkusza." },
    ],
    sources: [ckePolish],
    related: ["/jezyk-polski/rozprawka-egzamin-osmoklasisty", "/jezyk-polski/opowiadanie-tworcze", "/egzamin-osmoklasisty-2027"],
    cta: { title: "Zamień lekturę w argument", body: "Ćwicz rozpoznawanie motywów i dobieranie zdarzeń do polecenia.", label: "Ćwicz język polski", href: "/logowanie?tryb=rejestracja&rola=uczen" },
  },
  {
    path: "/jezyk-polski/rozprawka-egzamin-osmoklasisty",
    category: "Język polski",
    title: "Rozprawka na egzaminie ósmoklasisty — schemat i 150 słów",
    description: "Jak napisać rozprawkę na E8: teza, argument, przykład z lektury, wniosek i aktualne minimum 150 słów.",
    eyebrow: "Język polski · wypracowanie",
    heading: "Rozprawka: argument ma coś udowodnić",
    lead: "Aktualny informator wskazuje tekst nie krótszy niż 150 słów. Liczba słów nie uratuje jednak pracy, jeśli argumenty nie odpowiadają na problem z tematu.",
    updatedAt: "25 sierpnia 2026",
    keywords: ["rozprawka egzamin ósmoklasisty jak napisać", "rozprawka schemat i wzór", "ile słów musi mieć rozprawka na egzaminie ósmoklasisty", "argumenty do rozprawki z lektur"],
    facts: [{ value: "150", label: "minimum słów" }, { value: "1", label: "lektura obowiązkowa" }, { value: "20", label: "maks. punktów za pracę" }],
    sections: [
      { title: "Prosty schemat", paragraphs: ["We wstępie nazwij stanowisko. Każdy akapit argumentacyjny powinien zawierać argument, konkretną sytuację z utworu i wyjaśnienie, jak ta sytuacja potwierdza stanowisko."], bullets: ["wstęp: odpowiedź na problem", "argument 1 + przykład z lektury + wyjaśnienie", "argument 2 + przykład + wyjaśnienie", "zakończenie: wniosek wynikający z argumentów"] },
      { title: "Argument to nie streszczenie", paragraphs: ["Zdanie Balladyna zrobiła wiele złych rzeczy jest zbyt ogólne. Wybierz decyzję bohaterki, pokaż jej skutek i połącz go z tezą. Opisuj tylko tyle fabuły, ile jest potrzebne do rozumowania."] },
      { title: "Kontrola przed oddaniem", paragraphs: ["Sprawdź zgodność z tematem, obecność wymaganej lektury, logiczne akapity, minimum słów i poprawność językową. Licz wyrazy zgodnie z zasadami stosowanymi przez CKE."], note: "Jeśli polecenie wymaga odwołania do lektury obowiązkowej, brak takiego odwołania może skutkować zerem za całą wypowiedź." },
    ],
    faqs: [
      { question: "Ile słów musi mieć rozprawka na E8?", answer: "Aktualny informator CKE wskazuje co najmniej 150 słów." },
      { question: "Czy trzeba podać cytat?", answer: "Nie trzeba znać cytatu słowo w słowo. Trzeba poprawnie wykorzystać treść utworu i odnieść ją do argumentu." },
    ],
    sources: [ckePolish],
    related: ["/jezyk-polski/lektury-obowiazkowe", "/jezyk-polski/opowiadanie-tworcze", "/arkusze"],
    cta: { title: "Ćwicz argument, nie gotowiec", body: "Pracuj na krótkich poleceniach i ucz się łączyć lekturę z tezą.", label: "Przejdź do zadań", href: "/logowanie?tryb=rejestracja&rola=uczen" },
  },
  {
    path: "/jezyk-polski/opowiadanie-tworcze",
    category: "Język polski",
    title: "Opowiadanie twórcze na E8 — plan i kryteria",
    description: "Jak napisać opowiadanie twórcze na egzaminie ósmoklasisty: plan wydarzeń, bohater lektury, elementy twórcze i limit słów.",
    eyebrow: "Język polski · forma twórcza",
    heading: "Opowiadanie twórcze potrzebuje zmiany",
    lead: "Dobre opowiadanie nie jest opisem dnia. Bohater ma cel, napotyka przeszkodę, podejmuje decyzję i dochodzi do wyraźnego zakończenia.",
    updatedAt: "25 sierpnia 2026",
    keywords: ["opowiadanie twórcze egzamin ósmoklasisty", "kryteria oceniania wypracowania egzamin ósmoklasisty"],
    facts: [{ value: "150", label: "minimum słów" }, { value: "2", label: "tematy do wyboru" }, { value: "20", label: "maks. punktów" }],
    sections: [
      { title: "Plan w pięciu punktach", paragraphs: ["Zanim zaczniesz pisać, zapisz po jednym zdaniu dla sytuacji początkowej, celu bohatera, przeszkody, punktu zwrotnego i zakończenia."], bullets: ["gdzie i kiedy zaczyna się historia", "czego chce bohater", "co mu przeszkadza", "jaka decyzja zmienia bieg zdarzeń", "jak kończy się konflikt"] },
      { title: "Wykorzystaj bohatera funkcjonalnie", paragraphs: ["Jeżeli polecenie wskazuje lekturę, bohater powinien zachowywać się w sposób zgodny z utworem. Sama obecność imienia nie wystarczy — wiedza o postaci ma wpływać na zdarzenia."] },
      { title: "Elementy twórcze", paragraphs: ["Dialog, opis, charakterystyka, zwrot akcji, retrospekcja lub puenta mają służyć opowieści. Dodawanie ich mechanicznie może osłabić spójność."], note: "Zostaw kilka minut na sprawdzenie, czy wszystkie elementy polecenia naprawdę pojawiły się w tekście." },
    ],
    faqs: [{ question: "Czy opowiadanie też ma mieć 150 słów?", answer: "Tak. Informator opisuje wypracowanie, zarówno twórcze, jak i argumentacyjne, jako tekst nie krótszy niż 150 słów." }],
    sources: [ckePolish],
    related: ["/jezyk-polski/lektury-obowiazkowe", "/jezyk-polski/rozprawka-egzamin-osmoklasisty", "/arkusze"],
    cta: { title: "Zaplanuj historię przed pisaniem", body: "Ćwicz elementy opowiadania na krótkich poleceniach egzaminacyjnych.", label: "Ćwicz język polski", href: "/logowanie?tryb=rejestracja&rola=uczen" },
  },
  {
    path: "/arkusze",
    category: "Arkusze",
    title: "Arkusze egzaminu ósmoklasisty z lat ubiegłych",
    description: "Oficjalne arkusze CKE, próbne egzaminy i testy online z polskiego, matematyki i angielskiego — uporządkowane według lat.",
    eyebrow: "Arkusze i próbne egzaminy",
    heading: "Arkusz ma sens, gdy wyciągasz z niego wnioski",
    lead: "Rozwiązuj w czasie egzaminacyjnym, sprawdzaj z oficjalnym kluczem i zapisuj temat każdego błędu. Sam wynik bez analizy niewiele zmienia.",
    updatedAt: "25 sierpnia 2026",
    keywords: ["arkusze egzamin ósmoklasisty pdf", "próbny egzamin ósmoklasisty online", "testy ósmoklasisty online za darmo", "egzamin ósmoklasisty arkusze z lat ubiegłych"],
    facts: [{ value: "3", label: "przedmioty" }, { value: "2019–2026", label: "lata egzaminu" }, { value: "CKE", label: "źródło oficjalne" }],
    sections: [
      { title: "Jak pracować z arkuszem", paragraphs: ["Pierwsze podejście zrób bez podpowiedzi i z zegarem. Dopiero potem użyj klucza, oznacz zadania niepewne i wróć do tematów, które powtarzają się w błędach."], bullets: ["ustaw właściwy czas", "rozwiązuj bez telefonu i notatek", "sprawdź oficjalny klucz", "zapisz błąd: wiedza, rachunek, polecenie czy czas", "powtórz podobne zadanie po kilku dniach"] },
      { title: "PDF a wersja interaktywna", paragraphs: ["PDF najlepiej odwzorowuje warunki egzaminu. Wersja interaktywna ułatwia filtrowanie tematów, zapis postępu i powrót do słabszych obszarów. Warto używać obu formatów."] },
      { title: "Oficjalne materiały", paragraphs: ["CKE publikuje informatory, przykładowe arkusze, próbne zestawy oraz arkusze wykorzystane w poprzednich latach wraz z zasadami oceniania."], note: "Materiały demonstracyjne egzaminio są zawsze oznaczone osobno i nie są przedstawiane jako oficjalne arkusze CKE." },
    ],
    faqs: [
      { question: "Czy arkusze CKE są darmowe?", answer: "CKE udostępnia swoje arkusze i zasady oceniania publicznie. egzaminio dodaje warstwę ćwiczeń, postępu i wyjaśnień." },
      { question: "Od którego roku są arkusze E8?", answer: "Egzamin ósmoklasisty jest przeprowadzany od roku szkolnego 2018/2019." },
    ],
    sources: [ckeArchive, ckeMath, ckePolish, ckeEnglish],
    related: ["/arkusze/egzamin-osmoklasisty-2026", "/matematyka/zadania-otwarte", "/egzamin-osmoklasisty-2027"],
    cta: { title: "Rozwiązuj i zapisuj postęp", body: "W panelu ucznia możesz filtrować opublikowane arkusze według roku, przedmiotu i terminu.", label: "Otwórz ćwiczenia", href: "/logowanie?tryb=rejestracja&rola=uczen" },
  },
  {
    path: "/arkusze/egzamin-osmoklasisty-2026",
    category: "Arkusze",
    title: "Egzamin ósmoklasisty 2026 — arkusze i odpowiedzi",
    description: "Arkusze E8 2026 z języka polskiego, matematyki i języka angielskiego: gdzie znaleźć oficjalne PDF-y i jak je analizować.",
    eyebrow: "Arkusze · rocznik 2026",
    heading: "Egzamin ósmoklasisty 2026: arkusz to początek",
    lead: "Korzystaj z oficjalnego arkusza i zasad oceniania CKE. Po sprawdzeniu nie poprawiaj tylko wyniku — nazwij temat oraz rodzaj każdego błędu.",
    updatedAt: "25 sierpnia 2026",
    keywords: ["egzamin ósmoklasisty 2026 arkusz i odpowiedzi", "próbny egzamin ósmoklasisty 2026 arkusze"],
    facts: [{ value: "11–13.05", label: "termin główny 2026" }, { value: "65%", label: "średni polski" }, { value: "55%", label: "średnia matematyka" }],
    sections: [
      { title: "Trzy komplety materiałów", paragraphs: ["Dla każdego przedmiotu potrzebujesz arkusza, zasad oceniania oraz — w przypadku języka obcego — nagrania. Pobieraj je z serwisu CKE, aby uniknąć niepełnych lub zmienionych wersji."] },
      { title: "Jak ocenić zadania otwarte", paragraphs: ["Porównuj nie tylko wynik końcowy, lecz także kolejne etapy z zasadami oceniania. W matematyce poprawny postęp może być punktowany, a w wypowiedzi pisemnej obowiązuje kilka odrębnych kryteriów."] },
      { title: "Co pokazały wyniki 2026", paragraphs: ["Ministerstwo podało średnie wyniki 65% z polskiego, 55% z matematyki i 73% z angielskiego. To opis całej populacji, nie próg dobrego wyniku ani cel dla konkretnego ucznia."], note: "Nie porównuj wyniku ucznia wyłącznie ze średnią. Ważniejszy jest wymagany wynik rekrutacyjny oraz postęp między kolejnymi próbami." },
    ],
    faqs: [{ question: "Gdzie znaleźć oficjalne odpowiedzi?", answer: "Wraz z arkuszami CKE publikuje zasady oceniania. To właściwe źródło odpowiedzi i punktacji zadań otwartych." }],
    sources: [{ label: "CKE — komunikaty i informacje 2026", url: "https://bip.cke.gov.pl/artykul/289/1953/2025-2026" }, { label: "Ministerstwo Edukacji — wyniki E8 2026", url: "https://www.gov.pl/web/edukacja/wstepne-wyniki-egzaminu-osmoklasisty-2026" }, ckeArchive],
    related: ["/arkusze", "/matematyka/zadania-otwarte", "/kalkulator-punktow"],
    cta: { title: "Przenieś arkusz do planu nauki", body: "Zapisuj rozwiązane zadania i wracaj do tematów, które kosztowały najwięcej punktów.", label: "Zacznij ćwiczyć", href: "/logowanie?tryb=rejestracja&rola=uczen" },
  },
);

export function getSeoPage(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return SEO_PAGES.find((page) => page.path === normalized) ?? null;
}

export function relatedSeoPages(page: SeoPage) {
  return page.related.map((path) => SEO_PAGES.find((candidate) => candidate.path === path)).filter((candidate): candidate is SeoPage => Boolean(candidate));
}

export const SEO_CATEGORIES = [
  { slug: "rekrutacja", label: "Rekrutacja", heading: "Punkty, progi i wybór szkoły", description: "Aktualne zasady rekrutacji do liceum i technikum, kalkulator punktów oraz bezpieczne korzystanie z progów historycznych." },
  { slug: "egzamin-osmoklasisty", label: "Egzamin 2027", heading: "Egzamin ósmoklasisty — najważniejsze informacje", description: "Oficjalne terminy, czas trwania, wyniki i praktyczne przygotowanie do egzaminu ósmoklasisty." },
  { slug: "matematyka", label: "Matematyka", heading: "Matematyka krok po kroku", description: "Wąskie tematy egzaminacyjne, rozwiązane przykłady oraz strategie zdobywania punktów w zadaniach otwartych." },
  { slug: "jezyk-polski", label: "Język polski", heading: "Polski bez gotowców", description: "Lektury, argumentacja i formy wypowiedzi wyjaśnione tak, aby uczeń potrafił napisać własny tekst." },
  { slug: "jezyk-angielski", label: "Język angielski", heading: "Angielski w sytuacjach egzaminacyjnych", description: "Funkcje językowe, środki językowe oraz wypowiedź pisemna ćwiczone w kontekście." },
  { slug: "dla-rodzica", label: "Dla rodzica", heading: "Spokojne wsparcie przed egzaminem", description: "Plan przygotowań, wybór formy nauki, dobrostan oraz rekrutacja opisane z perspektywy rodzica." },
] as const;

export function getSeoCategory(slug: string) {
  return SEO_CATEGORIES.find((category) => category.slug === slug) ?? null;
}

export function pagesForCategory(label: SeoPage["category"]) {
  return SEO_PAGES.filter((page) => page.category === label);
}
