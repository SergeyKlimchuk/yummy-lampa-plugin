# Контент и возможности остальных экранов

Проверка выполнена только по текущему коду fork и локальным fixtures; запросов к аккаунту/API и правок fork не было.

**Важно:** required в JSON — поле, нужное для действия интерфейса, а не гарантия сервера. Остальные поля должны скрываться либо иметь состояние «неизвестно». Fixtures помечены как anonymized: их названия, адреса и числа нельзя выдавать за реальные данные.

| Экран | Маршрут / представление | Действия и ограничения |
|---|---|---|
| Каталог | `yani/catalog; /sort/{key}; /filter/{signature}` | open title; card context actions: watch/details/comments, authorized list/favorite/rating; sort |
| Поиск | `input dialog → yani/search/{encoded_query}; also global Lampa Search source` | enter query; open result title; plugin result catalog sorting/filtering |
| Жанры | `yani/genres` | open genre catalog |
| Каталог жанра | `yani/genre/{value}` | open title; shared catalog sorts/filters; next page |
| Топ аниме | `yani/top; /type/{all|tv|movie|ona}` | switch All / TV / Movies / ONA; open title; next page |
| Для вас | `yani/recommended` | open title; retry empty/offline state; card context actions |
| Обновления | `yani/updates` | open title; retry; card context actions |
| Новые переводы | `yani/new_translations` | open title; retry; card context actions |
| Новые аниме | `yani/new_releases` | open title; retry; card context actions |
| Коллекции | `yani/collections` | open collection; next page; retry |
| Состав коллекции | `yani/collection/{id}` | open title; next page; card context actions |
| Карточка аниме | `yani/detail/{id}` | Watch → playback destination/source/episode flow; trailers; open native Lampa title/search |
| Студия / автор | `yani/studio/{id}; yani/director/{id}` | open title; shared catalog sorts/filters; next page |
| Трейлеры | `normally a Lampa.Select modal; fallback yani/trailers/{id}` | choose trailer; play single item immediately; open YouTube app if supported; embedded fallback |
| Источник / озвучка / серии | `Lampa.Select dialogs; no dedicated route` | choose enabled dubbing/provider group; choose episode; resume saved episode/time |
| Воспроизведение | `Lampa internal player OR iframe route yani/player` | native player playback/seek/playlist/quality only when engine/source supports it; Back to prior focus; optional auto-next |
| Комментарии / ответы | `inline title-detail block; Lampa.Select comments/replies modals` | read comments; open replies when children_count>0; load more when current page length>=20 |

## Критические ограничения макетов

- Каталог, результаты поиска, жанр, студия/автор и топ используют общий каталог карточек. Топ имеет четыре категории All/TV/Movie/ONA, обычный каталог — семь сортировок и фильтры типа/статуса/года.
- «Для вас» — реальные события отслеживаемых тайтлов плюс связанные аниме из viewing_order/related. Нет API процента совпадения или оснований придумывать персональный рейтинг.
- «Обновления» берёт watching/planned/postponed и подписки; показывает события с датой. «Новые переводы» — последняя запись new_videos на аниме. «Новые аниме» — feed.new, без гарантированной даты добавления.
- Коллекции читаются из feed и /collection. У текущего раздела состава коллекции есть заголовок и карточки; создание/редактирование коллекций не реализовано.
- Детали могут содержать постер, альтернативные названия, жанры, студии/авторов, эпизодные данные, переводы, рейтинги, порядок просмотра и рекомендации. Каждая такая группа может отсутствовать. Гистограмма оценок и блок коллекций имеют неиспользуемые helpers, но текущий renderDetail их не вызывает.
- Просмотр → выбор озвучки/провайдера → выбор серии. Оба выбора — диалоги Select, а не отдельные страницы. При единственном варианте шаг пропускается. Качество, название серии, длительность и просмотры необязательны; сезоны в текущем chooser отдельно не группируются.
- Трейлеры обычно открывают Select, один трейлер запускается сразу. Отдельная страница yani_trailers — fallback. Нет гарантированных превью, длительности, языка и качества.
- Внутренний видеоплеер принадлежит Lampa; встроенный iframe — сайту провайдера. Для iframe нельзя обещать свои кнопки перемотки, качество, точный прогресс или AniSkip. На LG webOS нельзя рисовать Android-only внешний плеер.
- Комментарии доступны только для чтения и открытия ответов с догрузкой. Нет методов отправки, редактирования, удаления, лайка/дизлайка. Счётчики реакций — текст.
- Нет локальных fixtures для feed, genres, collections, trailers, studio/director. Макеты этих разделов не должны выдумывать наполненные списки, даты, счётчики или названия; допустимы реальные проверенные записи либо честные loading/empty/unknown состояния.

Полные поля, параметры, состояния и проверенные `sourcepath + function + line` для каждого экрана сохранены в [content-inventory.json](content-inventory.json).
