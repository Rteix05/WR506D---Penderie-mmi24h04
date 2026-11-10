import { Controller } from '@hotwired/stimulus';

/*
 * Une confirmation (maquette « Confirmation · Suspendre un compte ») sur
 * l'élément <dialog> natif : showModal() piège le focus et ferme sur
 * « Échap ». Un clic sur le fond referme aussi.
 *
 *   <div data-controller="dialog">
 *     <button data-action="dialog#open">…
 *     <dialog data-dialog-target="dialog" data-action="click->dialog#backdrop">
 *       … <button data-action="dialog#close">Annuler</button>
 */
export default class extends Controller {
    static targets = ['dialog'];

    open() {
        this.dialogTarget.showModal();
    }

    close() {
        this.dialogTarget.close();
    }

    backdrop(event) {
        if (event.target === this.dialogTarget) this.close();
    }
}
