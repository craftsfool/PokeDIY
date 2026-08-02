# PokeDIY MediaWiki extension shell

This directory targets the stack currently declared by 52Poké's public
infrastructure repository: MediaWiki 1.43 with `vector-2022` as the default
skin.

The extension deliberately does not reproduce the Vector header, table of
contents, language switcher, user tools, or page actions. MediaWiki owns those
surfaces. `Special:PokeDIY` only creates a content mount point and loads a
ResourceLoader module for the DIY editor.

Installation in a MediaWiki checkout:

```php
wfLoadExtension( 'PokeDIY' );
```

Then open `Special:PokeDIY`. The production editor bundle should mount on
`#pokediy-root` after the `pokediy:ready` event. The event detail exposes the
page API URL, `mw.Api`, and `mw.storage`, so persistence and upload flows can be
implemented through MediaWiki rather than browser-only substitutes.

The standalone React application at the repository root remains a local
interaction preview. Its outer Vector shell is intentionally a preview only;
it is not part of the production extension.

The extension source follows the parent infrastructure repository's
BSD-3-Clause convention. User-authored articles and uploaded creative content
are published separately under CC BY-NC-SA 3.0.
