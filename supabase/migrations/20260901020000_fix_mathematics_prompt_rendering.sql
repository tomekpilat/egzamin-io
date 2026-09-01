-- Keep mathematical expressions in one canonical MathJax block instead of
-- repeating a plain-text approximation in the question heading.

update public.practice_questions
set prompt = 'Dane są cztery liczby. Która z nich jest równa 0?',
    content_blocks = jsonb_build_array(jsonb_build_object(
      'type', 'math',
      'latex', E'w=\\sqrt{100-64}-2,\\quad x=12-\\sqrt{64+36},\\quad y=\\sqrt{25-16}-3,\\quad z=7-\\sqrt{9+16}',
      'display', true
    ))
where id = 'cke-2026-main-mathematics-100-x-q03';

update public.practice_questions
set prompt = 'Sumę liczb od 1 do n opisuje podany wzór. Wybierz wartość sumy od 1 do 100 oraz poprawnie przekształconą postać wzoru.',
    content_blocks = jsonb_build_array(jsonb_build_object(
      'type', 'math',
      'latex', E'S=\\frac{1}{2}n(n+1)',
      'display', true
    ))
where id = 'cke-2026-main-mathematics-100-x-q08';

notify pgrst, 'reload schema';
