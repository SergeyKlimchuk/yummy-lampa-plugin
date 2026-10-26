window.YUMMY_MOCKUP_CONTRACTS = {
  "home": {
    "title": "Главная",
    "component": "yani_home · LampaYaniHome.create",
    "route": "yani",
    "sources": [
      "src/ui-home.js :: create",
      "src/ui.js :: Home / homeContinueCards"
    ],
    "endpoints": [
      "GET /anime?status=ongoing&limit=6",
      "GET /users/{id}/stats/lists",
      "Общая синхронизация GET /video/watch-history"
    ],
    "actions": [
      "Открыть продолжение просмотра",
      "Открыть одну из шести категорий",
      "Открыть карточку онгоинга",
      "Перейти в существующие разделы"
    ],
    "constraints": [
      "Предпросмотр: до трёх карточек истории и шести онгоингов",
      "Личные списки требуют входа",
      "Любимое независимо от основного статуса"
    ],
    "previewStates": [
      "ready",
      "loading",
      "empty",
      "error",
      "guest"
    ]
  },
  "catalog": {
    "title": "Каталог",
    "component": "yani_catalog / Catalog",
    "route": "yani/catalog; /sort/{key}; /filter/{signature}",
    "sources": [
      {
        "path": "src/ui.js",
        "function": "Catalog",
        "line": 406
      },
      {
        "path": "src/ui-catalog-controls.js",
        "function": "create",
        "line": 27
      },
      {
        "path": "src/ui-card-bind.js",
        "function": "create",
        "line": 7
      }
    ],
    "endpoints": [
      "GET /anime?{params}"
    ],
    "actions": [
      "open title",
      "card context actions: watch/details/comments, authorized list/favorite/rating",
      "sort",
      "filter",
      "next page"
    ],
    "constraints": [
      "accurate total count/page count: maxPages is a synthetic safety bound (ceil(20000/limit)+1)",
      "poster, ratings, year, genres, progress and title metadata",
      "availability of playable sources is not implied by a card"
    ],
    "previewStates": [
      "ready",
      "loading",
      "empty",
      "error"
    ]
  },
  "search": {
    "title": "Поиск",
    "component": "yani_catalog for plugin results; Lampa.Search source via LampaYaniSearch.create",
    "route": "input dialog → yani/search/{encoded_query}; also global Lampa Search source",
    "sources": [
      {
        "path": "src/ui-search.js",
        "function": "create",
        "line": 46
      },
      {
        "path": "src/ui-search.js",
        "function": "rankCards",
        "line": 15
      },
      {
        "path": "src/ui.js",
        "function": "getSearchController",
        "line": 1728
      }
    ],
    "endpoints": [
      "GET /anime?q={query}&limit=30 (global source); catalog pagination for plugin results"
    ],
    "actions": [
      "enter query",
      "open result title",
      "plugin result catalog sorting/filtering",
      "global source result selection"
    ],
    "constraints": [
      "search autocomplete suggestions or search trend API",
      "all results in global source (one page only)",
      "a separate yani_search component; plugin results reuse catalog"
    ],
    "previewStates": [
      "ready",
      "loading",
      "empty",
      "error"
    ]
  },
  "genres": {
    "title": "Жанры",
    "component": "yani_genres / Genres",
    "route": "yani/genres",
    "sources": [
      {
        "path": "src/ui.js",
        "function": "Genres",
        "line": 866
      },
      {
        "path": "src/ui.js",
        "function": "genreTilesRow",
        "line": 3366
      },
      {
        "path": "src/ui.js",
        "function": "genreValue",
        "line": 3435
      }
    ],
    "endpoints": [
      "GET /anime/genres"
    ],
    "actions": [
      "open genre catalog"
    ],
    "constraints": [
      "genre photographs/posters: current tiles use locally generated SVG text art",
      "per-genre anime counts",
      "API descriptions"
    ],
    "previewStates": [
      "ready",
      "loading",
      "empty",
      "error"
    ]
  },
  "genre-catalog": {
    "title": "Каталог жанра",
    "component": "yani_catalog / Catalog with genre_context",
    "route": "yani/genre/{value}",
    "sources": [
      {
        "path": "src/ui.js",
        "function": "openGenreCatalog",
        "line": 3476
      },
      {
        "path": "src/ui.js",
        "function": "Catalog",
        "line": 406
      }
    ],
    "endpoints": [
      "GET /anime?genres={value}&limit=30",
      "GET /anime/genres/{id} for numeric IDs only"
    ],
    "actions": [
      "open title",
      "shared catalog sorts/filters",
      "next page"
    ],
    "constraints": [
      "rank badge for every sorting mode",
      "API description or image",
      "server-side total count"
    ],
    "previewStates": [
      "ready",
      "loading",
      "empty",
      "error"
    ]
  },
  "subject-catalog": {
    "title": "Студия / автор",
    "component": "yani_catalog / Catalog with subject_context",
    "route": "yani/studio/{id}; yani/director/{id}",
    "sources": [
      {
        "path": "src/ui.js",
        "function": "openSubjectCatalog",
        "line": 3508
      },
      {
        "path": "src/ui.js",
        "function": "pushSubjectCatalog",
        "line": 3491
      },
      {
        "path": "src/ui.js",
        "function": "Catalog",
        "line": 406
      }
    ],
    "endpoints": [
      "GET /anime?studio_ids={id} or director_ids={id}",
      "GET /anime/studio/{url}",
      "GET /director/{id}"
    ],
    "actions": [
      "open title",
      "shared catalog sorts/filters",
      "next page"
    ],
    "constraints": [
      "biography, portrait, staff roles, studio logo or dates",
      "credit links when IDs/URLs absent"
    ],
    "previewStates": [
      "ready",
      "loading",
      "empty",
      "error"
    ]
  },
  "top": {
    "title": "Топ аниме",
    "component": "yani_top / Top → Catalog",
    "route": "yani/top; /type/{all|tv|movie|ona}",
    "sources": [
      {
        "path": "src/ui.js",
        "function": "Top",
        "line": 400
      },
      {
        "path": "src/ui-catalog-controls.js",
        "function": "create",
        "line": 27
      }
    ],
    "endpoints": [
      "GET /anime?sort=top&sort_forward=true&from_year=1900&..."
    ],
    "actions": [
      "switch All / TV / Movies / ONA",
      "open title",
      "next page",
      "card context actions"
    ],
    "constraints": [
      "a separate top/realtime-ranking API",
      "rank movement/change badges",
      "vote numbers for every item",
      "ordinary catalog sort/filter deck in topMode: it is replaced with four type categories"
    ],
    "previewStates": [
      "ready",
      "loading",
      "empty",
      "error"
    ]
  },
  "user-lists": {
    "title": "Мои списки",
    "component": "yani_user_lists",
    "route": "yani/user-lists",
    "sources": [
      "src/ui-account-lists.js :: userLists",
      "src/ui.js :: loadUserListRows",
      "src/ui.js :: openUserLists"
    ],
    "endpoints": [],
    "actions": [
      "Open anime detail",
      "More opens category list",
      "History More opens full history",
      "Remote numeric keys 1 Watching,2 Planned,3 Completed,4 Dropped,5 Favorite,6 Postponed,0 History",
      "Remote color shortcuts red Watching,green Planned,yellow Favorite,blue History"
    ],
    "constraints": [
      "Create or rename custom categories",
      "Drag-and-drop reordering",
      "Batch category editing",
      "Automatic import of native Lampa favorite marks"
    ],
    "previewStates": [
      "ready",
      "example",
      "loading",
      "empty",
      "error",
      "guest"
    ]
  },
  "account-list": {
    "title": "Содержимое категории",
    "component": "yani_account_list",
    "route": "yani/account/list/{definition.key}",
    "sources": [
      "src/ui-account-lists.js :: accountList",
      "src/ui-account-list-controls.js :: create",
      "src/ui.js :: openUserListShortcut",
      "src/ui.js :: loadUserListShortcutItems"
    ],
    "endpoints": [],
    "actions": [
      "Open anime detail (category/favorite changes are made there)",
      "Sort: recent, progress, rating, year, title",
      "Local pages of 30 cards",
      "Sort selection replaces activity with /sort/{sort} and retains loaded rows"
    ],
    "constraints": [
      "Search inside the list",
      "Multi-select or bulk delete",
      "Free-form tags",
      "Per-card editing sidebar"
    ],
    "previewStates": [
      "ready",
      "example",
      "loading",
      "empty",
      "error",
      "guest"
    ]
  },
  "continue": {
    "title": "Продолжить просмотр",
    "component": "yani_history",
    "route": "yani/continue-watching",
    "sources": [
      "src/ui-home-sections.js :: history",
      "src/ui-home-sections.js :: continueWatchingEntries",
      "src/ui-home-sections.js :: attachHistoryEntry",
      "src/ui-playback-history.js :: bindHistoryCardRender",
      "src/ui.js :: openContinueWatching"
    ],
    "endpoints": [
      "Merged device-local playback history and remote GET /video/watch-history",
      "Continue-mode remote range up to 300 records",
      "Shared cached episode ceilings; detail requests can enrich missing card metadata"
    ],
    "actions": [
      "Resume/open episode options through existing history-card action",
      "Back to parent"
    ],
    "constraints": [
      "Separate custom folders",
      "Delete one watch record from this screen",
      "A promise that every source can resume exactly (iframe player progress can be limited)"
    ],
    "previewStates": [
      "ready",
      "example",
      "loading",
      "empty",
      "error",
      "guest"
    ]
  },
  "history": {
    "title": "История просмотра",
    "component": "yani_history",
    "route": "yani/history",
    "sources": [
      "src/ui-home-sections.js :: history",
      "src/ui-home-sections.js :: normalizeRemoteHistory",
      "src/ui-playback-history.js :: rememberPlayback",
      "src/ui.js :: openWatchHistory"
    ],
    "endpoints": [],
    "actions": [
      "Open/resume anime through history card",
      "Remote pagination in 30-record pages",
      "Back"
    ],
    "constraints": [
      "Per-day grouping in current UI",
      "Date range picker",
      "Per-row cloud deletion",
      "Clear remote history from the settings action (settings clear only local cache)"
    ],
    "previewStates": [
      "ready",
      "example",
      "loading",
      "empty",
      "error",
      "guest"
    ]
  },
  "schedule": {
    "title": "Расписание",
    "component": "yani_schedule · LampaYaniSchedule.create",
    "route": "yani/schedule",
    "sources": [
      "src/ui-schedule.js :: create / createItem / render",
      "src/ui.js :: Schedule"
    ],
    "endpoints": [
      "GET /anime/schedule",
      "GET /anime/{id} и /videos для доступных уточнений"
    ],
    "actions": [
      "Выбрать день",
      "Открыть карточку аниме"
    ],
    "constraints": [
      "Время эфира берётся из episodes.prev_date / next_date",
      "Данные о готовой озвучке могут отсутствовать",
      "Нет обещания выпуска строго по расписанию"
    ],
    "previewStates": [
      "ready",
      "loading",
      "empty",
      "error"
    ]
  },
  "new-translations": {
    "title": "Новые переводы",
    "component": "yani_new_translations / NewTranslations → Translations.component",
    "route": "yani/new_translations",
    "sources": [
      {
        "path": "src/ui-translations.js",
        "function": "component",
        "line": 48
      },
      {
        "path": "src/ui-translations.js",
        "function": "normalize",
        "line": 33
      },
      {
        "path": "src/ui-translations.js",
        "function": "latestEvents",
        "line": 14
      }
    ],
    "endpoints": [
      "GET /feed → response.new_videos[]"
    ],
    "actions": [
      "open title",
      "retry",
      "card context actions"
    ],
    "constraints": [
      "a full historical translation log",
      "all event metadata",
      "download/translate/upload actions",
      "translation count meaning total voices: it counts only events present in feed snapshot"
    ],
    "previewStates": [
      "ready",
      "loading",
      "empty",
      "error"
    ]
  },
  "new-releases": {
    "title": "Новые аниме",
    "component": "yani_new_releases / NewReleases → Releases.component",
    "route": "yani/new_releases",
    "sources": [
      {
        "path": "src/ui-releases.js",
        "function": "component",
        "line": 32
      },
      {
        "path": "src/ui-releases.js",
        "function": "normalize",
        "line": 20
      },
      {
        "path": "src/ui-releases.js",
        "function": "releaseLabel",
        "line": 13
      }
    ],
    "endpoints": [
      "GET /feed → response.new[]"
    ],
    "actions": [
      "open title",
      "retry",
      "card context actions"
    ],
    "constraints": [
      "an exact added-on date for every card",
      "the label means airing today",
      "paginated archive",
      "string type values are not used by releaseLabel (object metadata only)"
    ],
    "previewStates": [
      "ready",
      "loading",
      "empty",
      "error"
    ]
  },
  "recommended": {
    "title": "Для вас",
    "component": "yani_recommended / Recommended → Recommendations.component",
    "route": "yani/recommended",
    "sources": [
      {
        "path": "src/ui-recommendations.js",
        "function": "component",
        "line": 322
      },
      {
        "path": "src/ui-recommendations.js",
        "function": "personalSources",
        "line": 89
      },
      {
        "path": "src/ui-recommendations.js",
        "function": "eventCards",
        "line": 193
      },
      {
        "path": "src/ui-recommendations.js",
        "function": "relatedCards",
        "line": 243
      }
    ],
    "endpoints": [
      "GET /video/watch-history?limit=30&offset=0 when signed in",
      "GET /users/{id}/lists",
      "GET /users/{id}/lists/{0|1|2|5} if snapshot has no anime rows",
      "GET /users/{id}/lists/subs",
      "GET /anime/schedule",
      "GET /feed",
      "GET /profile/notifications?limit=30&offset=0 when signed in",
      "GET /anime/{id} for up to 4 tracked titles (viewing_order/related)"
    ],
    "actions": [
      "open title",
      "retry empty/offline state",
      "card context actions"
    ],
    "constraints": [
      "machine-learned recommendations or match percentage",
      "reason labels beyond real history/list/event relationships",
      "content without usable tracked history/list entries",
      "all cards having event dates or related reasons"
    ],
    "previewStates": [
      "ready",
      "example",
      "loading",
      "empty",
      "error",
      "guest"
    ]
  },
  "updates": {
    "title": "Обновления",
    "component": "yani_updates / Updates → Updates.component",
    "route": "yani/updates",
    "sources": [
      {
        "path": "src/ui-updates.js",
        "function": "component",
        "line": 88
      },
      {
        "path": "src/ui-updates.js",
        "function": "relevantTitles",
        "line": 30
      },
      {
        "path": "src/ui-updates.js",
        "function": "cards",
        "line": 65
      }
    ],
    "endpoints": [
      "GET /users/{id}/lists",
      "GET /users/{id}/lists/subs",
      "GET /anime/schedule",
      "GET /feed"
    ],
    "actions": [
      "open title",
      "retry",
      "card context actions"
    ],
    "constraints": [
      "events for completed/dropped anime solely due to list membership",
      "all TV release dates",
      "arbitrary event categories or read/unread state",
      "a dedicated updates endpoint"
    ],
    "previewStates": [
      "ready",
      "example",
      "loading",
      "empty",
      "error",
      "guest"
    ]
  },
  "collections": {
    "title": "Коллекции",
    "component": "yani_collections / Collections → Collections.catalog",
    "route": "yani/collections",
    "sources": [
      {
        "path": "src/ui-collections.js",
        "function": "catalog",
        "line": 301
      },
      {
        "path": "src/ui-collections.js",
        "function": "collectionCard",
        "line": 31
      },
      {
        "path": "src/ui-collections.js",
        "function": "previewPosters",
        "line": 21
      }
    ],
    "endpoints": [
      "GET /feed → response.collections[]",
      "GET /collection?limit=20&offset={offset}"
    ],
    "actions": [
      "open collection",
      "next page",
      "retry"
    ],
    "constraints": [
      "real total pages",
      "cover/preview posters",
      "author",
      "likes/views/counts (zero often means missing)",
      "collection creation/editing/favorite actions: absent in current UI and API wrapper"
    ],
    "previewStates": [
      "ready",
      "loading",
      "empty",
      "error"
    ]
  },
  "collection": {
    "title": "Состав коллекции",
    "component": "yani_collection / CollectionDetail → Collections.detail",
    "route": "yani/collection/{id}",
    "sources": [
      {
        "path": "src/ui.js",
        "function": "openCollection",
        "line": 3533
      },
      {
        "path": "src/ui-collections.js",
        "function": "detail",
        "line": 490
      }
    ],
    "endpoints": [
      "GET /collection/{id}?limit=30&offset={offset}"
    ],
    "actions": [
      "open title",
      "next page",
      "card context actions"
    ],
    "constraints": [
      "hero collection description/author/likes rendered by this component (current code only title + cards)",
      "exact total; maxPages1000 synthetic",
      "write/edit/remove anime from collection"
    ],
    "previewStates": [
      "ready",
      "loading",
      "empty",
      "error"
    ]
  },
  "detail": {
    "title": "Карточка аниме",
    "component": "yani_detail / Detail → LampaYaniDetail.create",
    "route": "yani/detail/{id}",
    "sources": [
      {
        "path": "src/ui-detail.js",
        "function": "create",
        "line": 164
      },
      {
        "path": "src/ui-detail.js",
        "function": "createDetailEpisodeSummary",
        "line": 475
      },
      {
        "path": "src/ui-detail.js",
        "function": "createDetailTranslations",
        "line": 563
      },
      {
        "path": "src/ui-detail.js",
        "function": "createDetailListPanel",
        "line": 620
      },
      {
        "path": "src/ui-detail.js",
        "function": "createDetailRatingAction",
        "line": 673
      },
      {
        "path": "src/ui-detail.js",
        "function": "toggleEpisodeSubscription",
        "line": 4
      }
    ],
    "endpoints": [
      "GET /anime/{id}",
      "GET /anime/{id}/videos (translations / episode summary)",
      "GET /anime/{id}/recommendations",
      "GET /comments/anime/{id}?limit=20&sort=new&skip=0",
      "optional GET Jikan /v4/anime/{MAL id}/episodes"
    ],
    "actions": [
      "Watch → playback destination/source/episode flow",
      "trailers",
      "open native Lampa title/search",
      "expand poster",
      "open genre/studio/director catalog",
      "open related/recommended title",
      "read comments/replies",
      "signed in: set/remove 1..10 rating",
      "signed in: toggle watching0/planned1/completed2/dropped3/postponed5; independent favorite",
      "signed in: subscribe/unsubscribe episodes (uses latest available video ID)"
    ],
    "constraints": [
      "all metadata and statistics; omit unknown values",
      "all poster resolutions",
      "all sources being playable",
      "full episode titles (external enrichment and MAL ID required)",
      "subscription state being server-hydrated (stored local video ID)",
      "community rating histogram/list distribution rendered: loadDetailCommunityStats exists but is not called",
      "collections block rendered: loadDetailCollections exists but is not called",
      "trailer, recommendations, viewing order, synopsis or translation metadata being available"
    ],
    "previewStates": [
      "ready",
      "loading",
      "empty",
      "error"
    ]
  },
  "sources": {
    "title": "Источник / озвучка / серии",
    "component": "yani_playback / PlaybackSetup → LampaYaniPlaybackPicker.create",
    "route": "yani/playback/{id}; inline voice/source/app selection and episode pages",
    "sources": [
      "src/ui.js :: PlaybackSetup / openPlaybackPicker",
      "src/ui-playback-picker.js :: create",
      "src/ui-playback-menu.js :: openVideos / groupVideos / playbackPlaylist",
      "src/ui-playback-preferences.js :: resolve / remember / reset"
    ],
    "endpoints": [
      "GET /anime/{id}/videos",
      "Локальные настройки и отдельный выбор аниме в Lampa.Storage",
      "Необязательное уточнение названий серий и качества источника"
    ],
    "actions": [
      "Предвыбрать озвучку и источник по сохранённому выбору аниме, общим настройкам или истории",
      "Изменить озвучку и один из источников, реально доступных для неё",
      "Запустить выбранную серию или продолжить сохранённую позицию",
      "Использовать настройки — сбросить выбор этого аниме",
      "Android: выбрать внутренний / внешний плеер либо запрос перед запуском"
    ],
    "constraints": [
      "Настройки озвучки и источника локальны для устройства; облачной синхронизации предпочтений нет",
      "До 30 вариантов и 60 серий на одной странице; полный плейлист сохраняется для воспроизведения",
      "Недоступный или отключённый источник не становится доступным из-за предпочтения; сохранённый выбор не перезаписывается при подстановке",
      "Число серий, последняя серия и доступные поля относятся только к конкретной паре озвучки и источника",
      "На LG WebOS нет внешнего Android-плеера; отдельные источники используют собственный встроенный плеер",
      "Офлайн-макет хранит изменения только до перезагрузки и не открывает потоки"
    ],
    "previewStates": [
      "ready",
      "loading",
      "empty",
      "error"
    ],
    "kind": "component"
  },
  "episodes": {
    "title": "Выбор серии",
    "component": "yani_playback / LampaYaniPlaybackPicker.create; fallback LampaYaniPlaybackMenu.chooseEpisode",
    "route": "yani/playback/{id}; episode grid within the playback setup screen",
    "sources": [
      "src/ui-playback-picker.js :: renderMain / selectEpisode / play",
      "src/ui-playback-menu.js :: playbackPlaylist / chooseEpisode",
      "src/ui.js :: episodeOptionTitle"
    ],
    "endpoints": [
      "Тот же GET /anime/{id}/videos; отдельного запроса для страницы серий нет"
    ],
    "actions": [
      "Открыть страницу до 60 серий",
      "Запустить выбранную серию с текущей озвучкой и источником",
      "Сохранить номер серии при смене доступной озвучки",
      "Вернуться к выбору озвучки и источника"
    ],
    "constraints": [
      "Номера и доступные метаданные берутся из реального ответа выбранного источника",
      "Качество, продолжительность и название серии могут отсутствовать",
      "Макет не запускает видео и не проверяет доступность потока",
      "Позиция просмотра переносится только на совпадающий номер серии"
    ],
    "previewStates": [
      "ready",
      "loading",
      "empty",
      "error"
    ],
    "kind": "component-part"
  },
  "trailers": {
    "title": "Трейлеры",
    "component": "LampaYaniTrailers.open; yani_trailers / TrailerList only when Select unavailable",
    "route": "normally a Lampa.Select modal; fallback yani/trailers/{id}",
    "sources": [
      {
        "path": "src/ui-trailers.js",
        "function": "create",
        "line": 56
      },
      {
        "path": "src/ui-trailers.js",
        "function": "loadTrailerItems",
        "line": 107
      },
      {
        "path": "src/ui-trailers.js",
        "function": "openTrailers",
        "line": 211
      },
      {
        "path": "src/ui-trailers.js",
        "function": "TrailerList",
        "line": 225
      }
    ],
    "endpoints": [
      "GET /anime/{id}/trailers",
      "optional GET /anime/{id} to discover MAL ID",
      "fallback POST https://graphql.anilist.co for Media(idMal).trailer"
    ],
    "actions": [
      "choose trailer",
      "play single item immediately",
      "open YouTube app if supported; embedded fallback",
      "Back"
    ],
    "constraints": [
      "trailer thumbnail, duration, upload date, language or quality (not rendered even when incidental API data exists)",
      "any trailers at all; AniList can also be empty",
      "YouTube app availability on TV"
    ],
    "previewStates": [
      "ready",
      "loading",
      "empty",
      "error"
    ],
    "kind": "dialog"
  },
  "comments": {
    "title": "Комментарии / ответы",
    "component": "Detail.loadInlineComments + ui.js commentsMenu/commentReplies (no registered component)",
    "route": "inline title-detail block; Lampa.Select comments/replies modals",
    "sources": [
      {
        "path": "src/ui-detail.js",
        "function": "loadInlineComments",
        "line": 944
      },
      {
        "path": "src/ui.js",
        "function": "commentsMenu",
        "line": 4305
      },
      {
        "path": "src/ui.js",
        "function": "commentReplies",
        "line": 4325
      },
      {
        "path": "src/ui.js",
        "function": "commentItem",
        "line": 4370
      }
    ],
    "endpoints": [
      "GET /comments/anime/{id}?limit=20&sort=new&skip={skip}",
      "GET /comments/{commentId}/children?skip={skip}"
    ],
    "actions": [
      "read comments",
      "open replies when children_count>0",
      "load more when current page length>=20",
      "Back to parent list/title"
    ],
    "constraints": [
      "avatars, badges, formatted rich text, spoiler expansion, exact total comments",
      "write/reply/edit/delete/like/dislike actions: current wrapper exposes no such methods",
      "displayed positive counts being actionable voting buttons"
    ],
    "previewStates": [
      "ready",
      "example",
      "loading",
      "empty",
      "error"
    ]
  },
  "replies": {
    "title": "Ответы на комментарий",
    "component": "Detail.loadInlineComments + ui.js commentsMenu/commentReplies (no registered component)",
    "route": "inline title-detail block; Lampa.Select comments/replies modals",
    "sources": [
      {
        "path": "src/ui-detail.js",
        "function": "loadInlineComments",
        "line": 944
      },
      {
        "path": "src/ui.js",
        "function": "commentsMenu",
        "line": 4305
      },
      {
        "path": "src/ui.js",
        "function": "commentReplies",
        "line": 4325
      },
      {
        "path": "src/ui.js",
        "function": "commentItem",
        "line": 4370
      }
    ],
    "endpoints": [
      "GET /comments/anime/{id}?limit=20&sort=new&skip={skip}",
      "GET /comments/{commentId}/children?skip={skip}"
    ],
    "actions": [
      "read comments",
      "open replies when children_count>0",
      "load more when current page length>=20",
      "Back to parent list/title"
    ],
    "constraints": [
      "avatars, badges, formatted rich text, spoiler expansion, exact total comments",
      "write/reply/edit/delete/like/dislike actions: current wrapper exposes no such methods",
      "displayed positive counts being actionable voting buttons"
    ],
    "previewStates": [
      "ready",
      "example",
      "loading",
      "empty",
      "error"
    ],
    "kind": "dialog"
  },
  "player": {
    "title": "Воспроизведение",
    "component": "native Lampa.Player; yani_player / IframePlayer → LampaYaniPlayer.create for embeds",
    "route": "Lampa internal player OR iframe route yani/player",
    "sources": [
      {
        "path": "src/ui.js",
        "function": "launchVideo",
        "line": 1898
      },
      {
        "path": "src/ui.js",
        "function": "launchResolvedVideo",
        "line": 1957
      },
      {
        "path": "src/ui.js",
        "function": "openEmbeddedEpisode",
        "line": 2126
      },
      {
        "path": "src/ui.js",
        "function": "playInternalPlayer",
        "line": 2468
      },
      {
        "path": "src/ui-player.js",
        "function": "create",
        "line": 3
      },
      {
        "path": "src/ui-playback-menu.js",
        "function": "showDirectPlaybackOptions",
        "line": 500
      }
    ],
    "endpoints": [
      "source resolver/provider requests as needed",
      "signed-in PUT /video/{videoId} progress",
      "signed-in POST /video batch progress when used"
    ],
    "actions": [
      "native player playback/seek/playlist/quality only when engine/source supports it",
      "Back to prior focus",
      "optional auto-next",
      "optional AniSkip on native video only",
      "YummyTV destination only if user setting + ID allow it",
      "Android external player only on supported Android"
    ],
    "constraints": [
      "custom plugin playback controls inside a cross-origin iframe",
      "fine progress synchronization or AniSkip for embeds (only start is reported)",
      "autoplay, exact seek, captions, quality selector, next episode or screenshots for every provider",
      "external Android player on LG webOS"
    ],
    "previewStates": [
      "ready",
      "error"
    ]
  },
  "account": {
    "title": "Аккаунт / профиль",
    "component": "yani_account",
    "route": "yani/account",
    "sources": [
      "src/ui.js :: Account",
      "src/ui.js :: renderAccount",
      "src/ui.js :: openAccount",
      "src/ui.js :: logoutFromAccount"
    ],
    "endpoints": [
      "GET /profile",
      "GET /users/{id}/stats/lists",
      "GET /users/{id}/lists",
      "GET /users/{id}/stats/genres",
      "GET /users/{id}/stats/ratings",
      "GET /users/{id}/stats/types-v2"
    ],
    "actions": [
      "Open Notifications",
      "Open Subscriptions",
      "Open a category's full account list",
      "Open My Reviews selector, then an anime detail",
      "Manual history synchronization only when automatic progress sync is off",
      "Sign out and replace stale Account activity",
      "Guest sign-in action opens yani_auth with refresh_account_on_authorized:true"
    ],
    "constraints": [
      "Edit nickname/about/avatar",
      "Send/read messages (only unread count is displayed)",
      "Manage friends",
      "Purchase/subscription plan",
      "Standalone statistics route"
    ],
    "previewStates": [
      "ready",
      "example",
      "loading",
      "empty",
      "error",
      "guest"
    ]
  },
  "subscriptions": {
    "title": "Подписки",
    "component": "yani_subscriptions",
    "route": "yani/subscriptions",
    "sources": [
      "src/ui-account-lists.js :: subscriptions",
      "src/ui.js :: openSubscriptions",
      "src/api.js :: subscriptions"
    ],
    "endpoints": [
      "GET /users/{id}/lists/subs"
    ],
    "actions": [
      "Open anime detail through standard Yummy card handler",
      "Back"
    ],
    "constraints": [
      "Subscribe/unsubscribe management buttons in this component",
      "Subscription tier/billing",
      "Per-subscription notification frequency controls",
      "Follower/social-user list"
    ],
    "previewStates": [
      "ready",
      "example",
      "loading",
      "empty",
      "error",
      "guest"
    ]
  },
  "notifications": {
    "title": "Уведомления",
    "component": "yani_notifications",
    "route": "yani/notifications",
    "sources": [
      "src/ui-notifications.js :: create",
      "src/ui-notifications.js :: normalize",
      "src/ui-notifications.js :: openNotification",
      "src/ui.js :: Notifications",
      "src/api.js :: notifications/markNotificationRead/markAllNotificationsRead/deleteAllNotifications"
    ],
    "endpoints": [
      "GET /profile/notifications?limit=30&offset=N",
      "POST /profile/notifications/{id}/read",
      "POST /profile/notifications/read",
      "DELETE /profile/notifications"
    ],
    "actions": [
      "Open notification marks that notification read",
      "Open an anime only when a recognized anime target exists",
      "Mark all read",
      "Delete all notifications",
      "Load 30 more",
      "Retry after load failure/cached state"
    ],
    "constraints": [
      "Notification filtering tabs",
      "Delete individual item button (API helper exists but current screen has no action)",
      "Open arbitrary click_uri externally",
      "Open comment thread/user profile from a generic notification",
      "Confirmation before delete-all is not currently implemented"
    ],
    "previewStates": [
      "ready",
      "example",
      "loading",
      "empty",
      "error",
      "guest"
    ]
  },
  "auth": {
    "title": "Вход в YummyAnime",
    "component": "yani_auth",
    "route": "yani/auth",
    "sources": [
      "src/ui-auth.js :: create",
      "src/ui.js :: AuthPage",
      "src/ui.js :: openSettingsLogin",
      "src/ui.js :: openAccountLogin",
      "src/auth.js :: login/refresh/logout"
    ],
    "endpoints": [],
    "actions": [
      "Edit login/email using shared input",
      "Edit password using masked shared input",
      "Sign in when unauthorized",
      "Refresh token when authorized",
      "Sign out when authorized",
      "Successful sign-in refreshes shared history and can replace stale Account screen"
    ],
    "constraints": [
      "QR-code/device-code pairing",
      "OAuth provider buttons",
      "Registration form",
      "Password reset form",
      "2FA form",
      "Embedded CAPTCHA UI",
      "Own application API-key field (official plugin already supplies public application header)"
    ],
    "previewStates": [
      "ready",
      "loading",
      "error",
      "authorized"
    ]
  },
  "settings": {
    "title": "Настройки YummyAnime",
    "component": "Lampa shared SettingsApi section 'yani'",
    "route": "Lampa.Settings.create('yani')",
    "sources": [
      "src/ui.js :: addSettings",
      "src/ui.js :: playbackSourceDefaultEnabled",
      "src/ui-playback-preferences.js :: defaults / setDefaults / knownVoices",
      "tests/settings-structure-contract.test.js"
    ],
    "endpoints": [],
    "actions": [
      "Выбрать общую озвучку и источник по умолчанию либо Авто",
      "На Android выбрать общий способ воспроизведения; на LG/webOS используется внутренний плеер"
    ],
    "constraints": [
      "Theme/color editor",
      "Developer API application setup",
      "Update plugin button",
      "Cloud-history deletion",
      "Android external player controls on LG"
    ],
    "previewStates": [
      "ready"
    ]
  },
  "status": {
    "title": "Статус сервисов",
    "component": "yani_status",
    "route": "yani/status",
    "sources": [
      "src/ui-status.js :: create",
      "src/api.js :: status",
      "src/config.js :: statusUrl",
      "status/status.json"
    ],
    "endpoints": [],
    "actions": [
      "Choose period locally",
      "Refresh snapshot",
      "Retry after network failure",
      "Back"
    ],
    "constraints": [
      "Live ping directly from TV",
      "Edit API/domain settings",
      "Fix network automatically",
      "CPU/RAM or stream bandwidth telemetry",
      "Per-device diagnostics"
    ],
    "previewStates": [
      "ready",
      "loading",
      "empty",
      "error"
    ]
  },
  "policy": {
    "title": "Условия использования",
    "component": "yani_policy controller / .yani-policy-layer",
    "route": "showUsagePolicy() overlay; legacy yani_policy component remains registered",
    "sources": [
      "src/ui.js :: showUsagePolicy",
      "src/ui.js :: closeUsagePolicy",
      "src/ui.js :: UsagePolicy",
      "tests/usage-policy-contract.test.js"
    ],
    "endpoints": [],
    "actions": [
      "usage_policy_accept button closes overlay",
      "Back closes overlay and restores previous controller"
    ],
    "constraints": [
      "Mandatory onboarding acceptance gate",
      "Stored terms revision/acceptance status",
      "Periodic prompts",
      "Account registration"
    ],
    "previewStates": [
      "ready"
    ]
  }
};
