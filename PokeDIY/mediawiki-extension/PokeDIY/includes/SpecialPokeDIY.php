<?php

namespace MediaWiki\Extension\PokeDIY;

use SpecialPage;

class SpecialPokeDIY extends SpecialPage {
    public function __construct() {
        parent::__construct( 'PokeDIY' );
    }

    public function execute( $subPage ): void {
        $this->setHeaders();

        $output = $this->getOutput();
        $output->setPageTitleMsg( $this->msg( 'pokediy-title' ) );
        $output->addModules( 'ext.pokediy' );
        $output->addHTML(
            '<div id="pokediy-root" class="pokediy-root" data-api-base="' .
            htmlspecialchars( wfScript( 'api' ) ) .
            '"><noscript>' .
            htmlspecialchars( $this->msg( 'pokediy-noscript' )->text() ) .
            '</noscript></div>'
        );
    }

    protected function getGroupName(): string {
        return 'wiki';
    }
}
