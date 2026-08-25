-- A production-shaped practice bank with 50 original demo questions.
-- Demo content is intentionally not labelled as CKE material.

create table if not exists public.practice_questions (
  id text primary key,
  source_type text not null default 'demo' check (source_type in ('demo', 'cke')),
  source_label text not null,
  exam_year integer check (exam_year is null or exam_year between 2000 and 2100),
  subject text not null check (subject in ('mathematics', 'polish', 'english')),
  topic text not null,
  prompt text not null,
  options jsonb not null
    check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) = 4),
  correct_answer smallint not null check (correct_answer between 0 and 3),
  explanation text not null,
  difficulty smallint not null default 1 check (difficulty between 1 and 3),
  is_published boolean not null default false,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists practice_questions_sort_order_idx
  on public.practice_questions (sort_order);
create index if not exists practice_questions_catalog_idx
  on public.practice_questions (is_published, subject, sort_order);

drop trigger if exists set_practice_questions_updated_at on public.practice_questions;
create trigger set_practice_questions_updated_at
before update on public.practice_questions
for each row execute function public.set_updated_at();

create table if not exists public.student_question_attempts (
  student_id uuid not null references public.profiles(id) on delete cascade,
  question_id text not null references public.practice_questions(id) on delete cascade,
  selected_answer smallint not null check (selected_answer between 0 and 3),
  is_correct boolean not null,
  attempt_count integer not null default 1 check (attempt_count > 0),
  first_answered_at timestamptz not null default now(),
  last_answered_at timestamptz not null default now(),
  primary key (student_id, question_id)
);

create index if not exists student_question_attempts_student_idx
  on public.student_question_attempts (student_id, last_answered_at desc);

alter table public.practice_questions enable row level security;
alter table public.student_question_attempts enable row level security;
revoke all on public.practice_questions from anon, authenticated;
revoke all on public.student_question_attempts from anon, authenticated;

insert into public.practice_questions (
  id, source_type, source_label, exam_year, subject, topic, prompt,
  options, correct_answer, explanation, difficulty, is_published, sort_order
) values
  ('demo-mat-01', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'mathematics', 'Procenty', 'Ile wynosi 15% liczby 200?', '["20","25","30","35"]'::jsonb, 2, '10% z 200 to 20, a 5% to 10. Razem 15% wynosi 30.', 1, true, 1),
  ('demo-mat-02', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'mathematics', 'Ułamki', 'Oblicz: 3/4 + 1/8.', '["4/12","5/8","7/8","1"]'::jsonb, 2, 'Sprowadzamy ułamki do mianownika 8: 3/4 = 6/8, więc 6/8 + 1/8 = 7/8.', 2, true, 2),
  ('demo-mat-03', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'mathematics', 'Równania', 'Rozwiąż równanie: 3x + 5 = 20.', '["3","5","8","15"]'::jsonb, 1, 'Odejmujemy 5 od obu stron: 3x = 15. Następnie dzielimy przez 3, więc x = 5.', 1, true, 3),
  ('demo-mat-04', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'mathematics', 'Pola figur', 'Prostokąt ma boki długości 7 cm i 4 cm. Jakie jest jego pole?', '["11 cm²","22 cm²","28 cm²","49 cm²"]'::jsonb, 2, 'Pole prostokąta to iloczyn długości boków: 7 · 4 = 28 cm².', 1, true, 4),
  ('demo-mat-05', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'mathematics', 'Twierdzenie Pitagorasa', 'Przyprostokątne trójkąta prostokątnego mają 6 cm i 8 cm. Ile ma przeciwprostokątna?', '["9 cm","10 cm","12 cm","14 cm"]'::jsonb, 1, 'Z twierdzenia Pitagorasa: 6² + 8² = 36 + 64 = 100, a pierwiastek ze 100 to 10.', 2, true, 5),
  ('demo-mat-06', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'mathematics', 'Średnia arytmetyczna', 'Jaka jest średnia arytmetyczna liczb 4, 6 i 8?', '["5","6","7","8"]'::jsonb, 1, 'Dodajemy liczby i dzielimy przez ich liczbę: (4 + 6 + 8) / 3 = 18 / 3 = 6.', 1, true, 6),
  ('demo-mat-07', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'mathematics', 'Proporcje', 'Trzy zeszyty kosztują 12 zł. Ile kosztuje pięć takich zeszytów?', '["16 zł","18 zł","20 zł","24 zł"]'::jsonb, 2, 'Jeden zeszyt kosztuje 12 / 3 = 4 zł. Pięć zeszytów kosztuje 5 · 4 = 20 zł.', 1, true, 7),
  ('demo-mat-08', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'mathematics', 'Potęgi', 'Ile wynosi 2 do potęgi piątej?', '["10","16","25","32"]'::jsonb, 3, '2⁵ oznacza 2 · 2 · 2 · 2 · 2, czyli 32.', 1, true, 8),
  ('demo-mat-09', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'mathematics', 'Pierwiastki', 'Ile wynosi pierwiastek kwadratowy ze 144?', '["10","11","12","14"]'::jsonb, 2, 'Szukamy liczby, której kwadrat wynosi 144. Ponieważ 12 · 12 = 144, wynikiem jest 12.', 1, true, 9),
  ('demo-mat-10', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'mathematics', 'Kąty', 'Dwa kąty trójkąta mają 50° i 60°. Ile ma trzeci kąt?', '["60°","70°","80°","90°"]'::jsonb, 1, 'Suma kątów w trójkącie to 180°. Obliczamy 180° − 50° − 60° = 70°.', 1, true, 10),
  ('demo-mat-11', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'mathematics', 'Jednostki', 'Ile metrów ma 2,5 kilometra?', '["250 m","2500 m","25 000 m","2050 m"]'::jsonb, 1, 'Jeden kilometr ma 1000 metrów, więc 2,5 · 1000 = 2500 metrów.', 1, true, 11),
  ('demo-mat-12', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'mathematics', 'Ułamki dziesiętne', 'Który ułamek zwykły jest równy liczbie 0,35 i został skrócony?', '["3/5","7/20","35/10","1/35"]'::jsonb, 1, '0,35 = 35/100. Po skróceniu licznika i mianownika przez 5 otrzymujemy 7/20.', 2, true, 12),
  ('demo-mat-13', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'mathematics', 'Obniżki', 'Plecak kosztował 120 zł. Cenę obniżono o 25%. Ile kosztuje teraz?', '["30 zł","80 zł","90 zł","95 zł"]'::jsonb, 2, '25% ze 120 zł to 30 zł. Po obniżce cena wynosi 120 − 30 = 90 zł.', 2, true, 13),
  ('demo-mat-14', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'mathematics', 'Obwody figur', 'Kwadrat ma bok długości 6 cm. Jaki jest jego obwód?', '["12 cm","24 cm","30 cm","36 cm"]'::jsonb, 1, 'Kwadrat ma cztery równe boki, więc obwód wynosi 4 · 6 = 24 cm.', 1, true, 14),
  ('demo-mat-15', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'mathematics', 'Prawdopodobieństwo', 'Rzucamy zwykłą kostką. Jakie jest prawdopodobieństwo wyrzucenia liczby parzystej?', '["1/6","1/3","1/2","2/3"]'::jsonb, 2, 'Parzyste wyniki to 2, 4 i 6, czyli 3 z 6 możliwości. 3/6 skraca się do 1/2.', 2, true, 15),
  ('demo-mat-16', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'mathematics', 'Prędkość', 'Samochód przejechał 150 km w 3 godziny ze stałą prędkością. Jaka była ta prędkość?', '["45 km/h","50 km/h","60 km/h","75 km/h"]'::jsonb, 1, 'Prędkość to droga podzielona przez czas: 150 / 3 = 50 km/h.', 1, true, 16),
  ('demo-mat-17', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'mathematics', 'Objętość', 'Sześcian ma krawędź długości 3 cm. Jaka jest jego objętość?', '["9 cm³","18 cm³","27 cm³","36 cm³"]'::jsonb, 2, 'Objętość sześcianu to trzecia potęga krawędzi: 3³ = 27 cm³.', 1, true, 17),
  ('demo-mat-18', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'mathematics', 'Funkcje', 'Dla funkcji y = 2x − 1 oblicz wartość y, gdy x = 4.', '["6","7","8","9"]'::jsonb, 1, 'Podstawiamy x = 4: y = 2 · 4 − 1 = 8 − 1 = 7.', 2, true, 18),
  ('demo-mat-19', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'mathematics', 'Skala', 'Na mapie w skali 1:100 odcinek ma 5 cm. Jaką długość ma w rzeczywistości?', '["0,5 m","5 m","50 m","500 m"]'::jsonb, 1, '5 cm na mapie oznacza 5 · 100 = 500 cm w rzeczywistości, czyli 5 metrów.', 2, true, 19),
  ('demo-mat-20', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'mathematics', 'Ciągi', 'Jaka jest następna liczba w ciągu: 3, 7, 11, ...?', '["12","14","15","16"]'::jsonb, 2, 'Każdy kolejny wyraz jest większy o 4. Po 11 otrzymujemy więc 15.', 1, true, 20),
  ('demo-pol-01', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'polish', 'Części mowy', 'Który wyraz jest przymiotnikiem w zdaniu: „Cichy wiatr poruszał liście”?', '["Cichy","wiatr","poruszał","liście"]'::jsonb, 0, '„Cichy” określa cechę wiatru i odpowiada na pytanie „jaki?”, dlatego jest przymiotnikiem.', 1, true, 21),
  ('demo-pol-02', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'polish', 'Części zdania', 'Wskaż podmiot w zdaniu: „Uczniowie przygotowali przedstawienie”.', '["Uczniowie","przygotowali","przedstawienie","brak podmiotu"]'::jsonb, 0, 'Podmiot nazywa wykonawcę czynności. Przedstawienie przygotowali uczniowie.', 1, true, 22),
  ('demo-pol-03', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'polish', 'Części zdania', 'Wskaż orzeczenie w zdaniu: „Uczniowie przygotowali przedstawienie”.', '["Uczniowie","przygotowali","przedstawienie","uczniowie przygotowali"]'::jsonb, 1, 'Orzeczenie informuje o czynności podmiotu. W tym zdaniu jest nim czasownik „przygotowali”.', 1, true, 23),
  ('demo-pol-04', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'polish', 'Ortografia', 'Który zapis jest poprawny?', '["wziąć","wziońć","wziąść","wziąźć"]'::jsonb, 0, 'Poprawna forma bezokolicznika to „wziąć”.', 1, true, 24),
  ('demo-pol-05', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'polish', 'Pisownia „nie”', 'W którym przykładzie partykułę „nie” zapisano poprawnie?', '["niezrobił","nie zrobił","nie-zrobił","niez robił"]'::jsonb, 1, '„Nie” z czasownikami zapisujemy oddzielnie, dlatego poprawna forma to „nie zrobił”.', 1, true, 25),
  ('demo-pol-06', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'polish', 'Słownictwo', 'Który wyraz jest synonimem słowa „odważny”?', '["ostrożny","śmiały","spokojny","uparty"]'::jsonb, 1, '„Śmiały” ma znaczenie zbliżone do słowa „odważny”.', 1, true, 26),
  ('demo-pol-07', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'polish', 'Słownictwo', 'Który wyraz jest antonimem słowa „chaotyczny”?', '["głośny","niepewny","uporządkowany","szybki"]'::jsonb, 2, 'Przeciwieństwem chaosu jest porządek, dlatego antonimem jest „uporządkowany”.', 1, true, 27),
  ('demo-pol-08', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'polish', 'Środki stylistyczne', 'Które zdanie zawiera uosobienie?', '["Słońce zajrzało do okna.","Słońce świeciło jasno.","Okno było otwarte.","Dzień był ciepły."]'::jsonb, 0, 'Słońcu przypisano ludzką czynność zaglądania, więc jest to uosobienie.', 2, true, 28),
  ('demo-pol-09', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'polish', 'Środki stylistyczne', 'Które wyrażenie jest metaforą?', '["zimna woda","morze świateł","wysoki budynek","szybki pociąg"]'::jsonb, 1, '„Morze świateł” nie oznacza prawdziwego morza, lecz bardzo dużą liczbę świateł.', 2, true, 29),
  ('demo-pol-10', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'polish', 'Przypadki', 'W jakim przypadku występuje wyraz „drzewu” w zdaniu: „Przyglądam się drzewu”?', '["mianownik","celownik","biernik","narzędnik"]'::jsonb, 1, 'Pytamy: przyglądam się komu? czemu? — drzewu. To pytania celownika.', 2, true, 30),
  ('demo-pol-11', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'polish', 'Zdania złożone', 'Które zdanie jest zdaniem złożonym?', '["Pada deszcz.","Wstałem i otworzyłem okno.","Cichy pies śpi.","Jutro wycieczka."]'::jsonb, 1, 'Zdanie zawiera dwa orzeczenia: „wstałem” i „otworzyłem”, dlatego jest złożone.', 2, true, 31),
  ('demo-pol-12', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'polish', 'Narrator', 'Który fragment wskazuje na narratora pierwszoosobowego?', '["Wróciłem do domu przed zmrokiem.","Marek wrócił do domu.","Bohater wracał powoli.","W mieście zapadł zmrok."]'::jsonb, 0, 'Forma „wróciłem” pokazuje, że narrator mówi o sobie w pierwszej osobie.', 1, true, 32),
  ('demo-pol-13', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'polish', 'Interpunkcja', 'Który zapis dialogu jest poprawny?', '["– Dokąd idziesz? – zapytała Ola.","– Dokąd idziesz –? zapytała Ola.","Dokąd idziesz? zapytała – Ola.","– Dokąd idziesz?, zapytała Ola."]'::jsonb, 0, 'Wypowiedź dialogową rozpoczyna myślnik, znak zapytania zostaje przy pytaniu, a dopowiedzenie narratora oddziela kolejny myślnik.', 2, true, 33),
  ('demo-pol-14', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'polish', 'Spójniki', 'Wskaż spójnik w zdaniu: „Zostałem w domu, ponieważ padał deszcz”.', '["Zostałem","w domu","ponieważ","deszcz"]'::jsonb, 2, 'Wyraz „ponieważ” łączy zdania składowe i wskazuje przyczynę.', 1, true, 34),
  ('demo-pol-15', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'polish', 'Czytanie ze zrozumieniem', 'Maja po koncercie schowała bilet do pudełka z pamiątkami. Dlaczego najpewniej to zrobiła?', '["Chciała zachować wspomnienie.","Chciała oddać bilet kasjerowi.","Nie podobał jej się koncert.","Planowała sprzedać pudełko."]'::jsonb, 0, 'Pudełko służy do przechowywania pamiątek, więc bilet miał przypominać Mai o koncercie.', 1, true, 35),
  ('demo-eng-01', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'english', 'Present Simple', 'Choose the correct form: She ___ to school by bus every day.', '["go","goes","going","went"]'::jsonb, 1, 'In the Present Simple, the third person singular takes -s: she goes.', 1, true, 36),
  ('demo-eng-02', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'english', 'Past Simple', 'Choose the Past Simple form of “go”.', '["goed","gone","went","going"]'::jsonb, 2, '“Go” is irregular. Its Past Simple form is “went”.', 1, true, 37),
  ('demo-eng-03', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'english', 'Some and any', 'Complete the question: Is there ___ milk in the fridge?', '["a","some","any","many"]'::jsonb, 2, 'We usually use “any” in questions with uncountable nouns: any milk.', 1, true, 38),
  ('demo-eng-04', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'english', 'Comparatives', 'Choose the comparative form of “big”.', '["more big","bigger","biggest","bigly"]'::jsonb, 1, 'A short adjective takes -er, and the final consonant doubles: big → bigger.', 1, true, 39),
  ('demo-eng-05', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'english', 'Present Perfect', 'Complete the sentence: I have lived here ___ 2022.', '["for","from","since","during"]'::jsonb, 2, '“Since” introduces the starting point of an action: since 2022.', 2, true, 40),
  ('demo-eng-06', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'english', 'Functions', 'Choose the best response: “Would you like to come to my party?”', '["Yes, I’d love to.","I like parties yesterday.","No, I am coming last week.","Yes, I would like pizza."]'::jsonb, 0, '“Yes, I’d love to” is a natural and polite way to accept an invitation.', 1, true, 41),
  ('demo-eng-07', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'english', 'Modal verbs', 'Complete the sentence: My sister ___ swim very well.', '["is","can","has","does"]'::jsonb, 1, '“Can” expresses ability and is followed by the base form “swim”.', 1, true, 42),
  ('demo-eng-08', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'english', 'Adverbs of frequency', 'Which word means “nigdy”?', '["always","often","sometimes","never"]'::jsonb, 3, 'The English word for “nigdy” is “never”.', 1, true, 43),
  ('demo-eng-09', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'english', 'Vocabulary', 'Which English word means “biblioteka”?', '["bookshop","library","laboratory","classroom"]'::jsonb, 1, '“Library” means a place where books can be borrowed or read.', 1, true, 44),
  ('demo-eng-10', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'english', 'Vocabulary', 'Choose the opposite of “expensive”.', '["cheap","heavy","modern","useful"]'::jsonb, 0, 'Something that does not cost much is “cheap”, the opposite of “expensive”.', 1, true, 45),
  ('demo-eng-11', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'english', 'Reading', 'Tom leaves home at 7:30. His lesson starts at 8:00, and the journey takes 20 minutes. How early does he arrive?', '["5 minutes","10 minutes","20 minutes","30 minutes"]'::jsonb, 1, 'Tom arrives at 7:50, which is 10 minutes before the lesson starts.', 2, true, 46),
  ('demo-eng-12', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'english', 'Future plans', 'Complete the sentence: We are ___ visit London next summer.', '["go to","going to","will going","going"]'::jsonb, 1, 'For a planned future action, use “be going to”: We are going to visit.', 2, true, 47),
  ('demo-eng-13', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'english', 'Present Continuous', 'Complete the sentence: Anna ___ a book at the moment.', '["reads","read","is reading","has read"]'::jsonb, 2, '“At the moment” points to the Present Continuous: is reading.', 1, true, 48),
  ('demo-eng-14', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'english', 'Much and many', 'Complete the question: How ___ apples do we need?', '["much","many","any","a lot"]'::jsonb, 1, '“Apples” is a countable plural noun, so the correct word is “many”.', 1, true, 49),
  ('demo-eng-15', 'demo', 'Zestaw demonstracyjny egzaminio', null, 'english', 'Functions', 'Which sentence is a polite request?', '["Help me now.","You help me.","Could you help me, please?","I helping you."]'::jsonb, 2, '“Could you …, please?” is a standard polite request.', 1, true, 50)
on conflict (id) do update set
  source_type = excluded.source_type,
  source_label = excluded.source_label,
  exam_year = excluded.exam_year,
  subject = excluded.subject,
  topic = excluded.topic,
  prompt = excluded.prompt,
  options = excluded.options,
  correct_answer = excluded.correct_answer,
  explanation = excluded.explanation,
  difficulty = excluded.difficulty,
  is_published = excluded.is_published,
  sort_order = excluded.sort_order,
  updated_at = now();

create or replace function public.get_practice_questions()
returns table (
  question_id text,
  source_label text,
  subject text,
  topic text,
  prompt text,
  options jsonb,
  difficulty smallint,
  sort_order integer,
  selected_answer smallint,
  is_correct boolean,
  attempt_count integer,
  correct_answer smallint,
  explanation text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'student' and onboarding_completed
  ) then
    raise exception 'active student profile required';
  end if;

  return query
  select q.id, q.source_label, q.subject, q.topic, q.prompt, q.options,
         q.difficulty, q.sort_order, a.selected_answer, a.is_correct,
         coalesce(a.attempt_count, 0),
         case when a.question_id is not null then q.correct_answer else null end,
         case when a.question_id is not null then q.explanation else null end
  from public.practice_questions q
  left join public.student_question_attempts a
    on a.question_id = q.id and a.student_id = (select auth.uid())
  where q.is_published
  order by q.sort_order;
end;
$$;

create or replace function public.submit_practice_answer(
  target_question_id text,
  selected_answer integer
)
returns table (
  answer_is_correct boolean,
  answer_correct_index smallint,
  answer_explanation text,
  answer_attempt_count integer,
  solved_count integer,
  correct_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_student_id uuid := (select auth.uid());
  target_correct_answer smallint;
  target_explanation text;
  answer_correct boolean;
  updated_attempt_count integer;
begin
  if selected_answer not between 0 and 3 then raise exception 'invalid answer index'; end if;
  if not exists (
    select 1 from public.profiles
    where id = current_student_id and role = 'student' and onboarding_completed
  ) then
    raise exception 'active student profile required';
  end if;

  select q.correct_answer, q.explanation
  into target_correct_answer, target_explanation
  from public.practice_questions q
  where q.id = target_question_id and q.is_published;
  if not found then raise exception 'published question not found'; end if;

  answer_correct := selected_answer = target_correct_answer;

  insert into public.student_question_attempts (
    student_id, question_id, selected_answer, is_correct
  ) values (
    current_student_id, target_question_id, selected_answer, answer_correct
  )
  on conflict (student_id, question_id) do update
    set selected_answer = excluded.selected_answer,
        is_correct = excluded.is_correct,
        attempt_count = public.student_question_attempts.attempt_count + 1,
        last_answered_at = now()
  returning attempt_count into updated_attempt_count;

  return query
  select answer_correct, target_correct_answer, target_explanation,
         updated_attempt_count,
         (select count(*)::integer from public.student_question_attempts where student_id = current_student_id),
         (select count(*)::integer from public.student_question_attempts where student_id = current_student_id and is_correct);
end;
$$;

revoke all on function public.get_practice_questions() from public;
revoke all on function public.submit_practice_answer(text, integer) from public;
grant execute on function public.get_practice_questions() to authenticated;
grant execute on function public.submit_practice_answer(text, integer) to authenticated;
