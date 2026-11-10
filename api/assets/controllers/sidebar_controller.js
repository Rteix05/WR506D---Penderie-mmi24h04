import { Controller } from '@hotwired/stimulus';

/*
 * Le menu latéral du back-office sur un petit écran : caché, il s'ouvre par
 * le bouton « Menu » et se referme par « Échap » ou en touchant le voile.
 * Sur grand écran, il reste affiché (classes lg: dans le gabarit).
 *
 *   <div data-controller="sidebar">
 *     <button data-action="sidebar#open">…
 *     <nav data-sidebar-target="panel">…
 *     <div data-sidebar-target="veil" data-action="click->sidebar#close">
 */
export default class extends Controller {
    static targets = ['panel', 'veil', 'toggle'];

    open() {
        this.#set(true);
    }

    close() {
        this.#set(false);
    }

    closeOnEscape(event) {
        if (event.key === 'Escape') this.close();
    }

    #set(open) {
        this.panelTarget.classList.toggle('-translate-x-full', !open);
        this.veilTarget.classList.toggle('hidden', !open);
        if (this.hasToggleTarget) this.toggleTarget.setAttribute('aria-expanded', String(open));
        if (open) this.panelTarget.querySelector('a, button')?.focus();
    }
}
