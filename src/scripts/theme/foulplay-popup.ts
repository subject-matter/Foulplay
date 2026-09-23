// MARK:- Foulplay newsletter popup from Figma node 3170:31865

export class FoulplayPopup extends HTMLElement {
	static htmlSelector = 'foulplay-popup'

	private key = 'fp-popup-newsletter'
	private timer?: number
	private dialog: HTMLElement | null = null
	private lastFocus: HTMLElement | null = null

	connectedCallback() {
		this.key = `fp-popup-${this.dataset.popupId || 'newsletter'}`
		this.dialog = this.querySelector('[role="dialog"]')
		this.addEventListener('click', this.handleClick)

		// Re-open immediately when it just posted successfully.
		if (this.dataset.popupOpen === 'true') {
			this.open()
			return
		}

		if (window.localStorage.getItem(this.key)) return
		const delay = Number(this.dataset.openAfter || '5') * 1000
		this.timer = window.setTimeout(() => this.open(), delay)
	}

	disconnectedCallback() {
		window.clearTimeout(this.timer)
		this.removeEventListener('click', this.handleClick)
		document.removeEventListener('keydown', this.handleKeydown)
	}

	private open() {
		this.hidden = false
		this.classList.add('is-open')
		this.lastFocus = document.activeElement as HTMLElement
		document.addEventListener('keydown', this.handleKeydown)
		this.dialog?.focus({ preventScroll: true })
	}

	private close() {
		this.classList.remove('is-open')
		this.hidden = true
		document.removeEventListener('keydown', this.handleKeydown)
		try {
			window.localStorage.setItem(this.key, '1')
		} catch {
			/* ignore storage errors */
		}
		this.lastFocus?.focus?.({ preventScroll: true })
	}

	private handleClick = (event: Event) => {
		const target = event.target as HTMLElement
		if (
			target.closest('[data-popup-close]') ||
			target.matches('[data-popup-overlay]')
		) {
			event.preventDefault()
			this.close()
		}
	}

	private handleKeydown = (event: KeyboardEvent) => {
		if (event.key === 'Escape') this.close()
	}
}
