# Native Lampa test fixtures

Pinned upstream: [yumata/lampa-source, commit 616c80224518a7c7e04e2789d5811881b93bf611](https://github.com/yumata/lampa-source/tree/616c80224518a7c7e04e2789d5811881b93bf611). Fetched 2026-10-27.

`playlist.js.txt` is the complete native Playlist module; `player-select.js.txt` is the unmodified `Playlist.listener.follow('select', ...)` handler from `src/interaction/player.js`. Each file includes its source URL. The upstream GPL version 2 license is included in `LICENSE`. These fixtures are test inputs and are not part of the plugin bundle.

Tests execute the native queue and transition handler in a VM with controlled media, storage and networking. Browser verification additionally uses the official Lampa 3.4.1 release and a generated local MP4. Physical LG WebOS playback requires separate device verification.

`timeline.js.txt` is the native Timeline module from [commit 71733ed81f4b13ac1ed1b3328cbbaa7e01afdbd2](https://github.com/yumata/lampa-source/blob/71733ed81f4b13ac1ed1b3328cbbaa7e01afdbd2/src/interaction/player/timeline.js), fetched 2026-10-27. It verifies actual resume/ask/start-again behavior and the native 90% resume heuristic against the plugin's completion policy.
