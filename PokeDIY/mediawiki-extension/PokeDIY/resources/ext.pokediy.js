( function () {
    'use strict';

    const root = document.getElementById( 'pokediy-root' );
    if ( !root ) {
        return;
    }

    root.dispatchEvent( new CustomEvent( 'pokediy:ready', {
        detail: {
            apiBase: root.dataset.apiBase,
            api: new mw.Api(),
            storage: mw.storage
        }
    } ) );
}() );
