const focusableSelector = [
	'a[href]',
	'button:not([disabled])',
	'input:not([disabled])',
	'select:not([disabled])',
	'textarea:not([disabled])',
	'[tabindex]:not([tabindex="-1"])',
].join(',')

export class FoulplayHeader extends HTMLElement {
	static htmlSelector = 'foulplay-header'

	private shopTrigger: HTMLButtonElement | null = null
	private shopMenu: HTMLElement | null = null
	private backdrop: HTMLElement | null = null
	private activeDrawer: HTMLElement | null = null
	private lastTrigger: HTMLElement | null = null
	private backdropTimer: number | undefined

	connectedCallback() {
		this.shopTrigger = this.querySelector('[data-shop-trigger]')
		this.shopMenu = this.querySelector('[data-shop-menu]')
		this.backdrop = this.querySelector('[data-drawer-backdrop]')

		this.shopTrigger?.addEventListener('click', this.toggleShop)
		this.shopTrigger?.addEventListener('pointerenter', this.openShopOnHover)
		this.querySelector('[data-header-shell]')?.addEventListener(
			'pointerleave',
			this.closeShopOnLeave
		)
		this.querySelectorAll<HTMLElement>('[data-drawer-trigger]').forEach(
			(trigger) => {
				trigger.addEventListener('click', this.openDrawer)
			}
		)
		this.querySelectorAll<HTMLElement>('[data-drawer-close]').forEach(
			(button) => {
				button.addEventListener('click', this.closeDrawer)
			}
		)
		this.backdrop?.addEventListener('click', this.closeDrawer)
		this.querySelectorAll<HTMLButtonElement>('[data-offer-dot]').forEach(
			(button) => {
				button.addEventListener('click', this.selectOffer)
				button.addEventListener('pointerenter', this.selectOfferOnHover)
			}
		)

		window.addEventListener('scroll', this.updateCompactState, {
			passive: true,
		})
		window.addEventListener('resize', this.updateCompactState, {
			passive: true,
		})
		document.addEventListener('keydown', this.handleKeydown)
		this.updateCompactState()
	}

	disconnectedCallback() {
		this.shopTrigger?.removeEventListener('click', this.toggleShop)
		this.shopTrigger?.removeEventListener(
			'pointerenter',
			this.openShopOnHover
		)
		this.querySelector('[data-header-shell]')?.removeEventListener(
			'pointerleave',
			this.closeShopOnLeave
		)
		window.removeEventListener('scroll', this.updateCompactState)
		window.removeEventListener('resize', this.updateCompactState)
		document.removeEventListener('keydown', this.handleKeydown)
	}

	private updateCompactState = () => {
		const opening = document.querySelector<HTMLElement>('.home-opening')
		const compactAfter = opening
			? opening.offsetTop + opening.offsetHeight
			: 16
		const compact =
			!this.classList.contains('fp-header--home') ||
			window.scrollY >= compactAfter
		this.classList.toggle('is-compact', compact)
		const headerProbe = 38
		const themedSections = document.querySelectorAll<HTMLElement>(
			'[data-header-theme="dark"]'
		)
		const overDarkSection = Array.from(themedSections).some((section) => {
			const bounds = section.getBoundingClientRect()
			return bounds.top <= headerProbe && bounds.bottom > headerProbe
		})
		this.classList.toggle('is-over-dark', overDarkSection)
	}

	private openShopOnHover = (event: PointerEvent) => {
		if (
			event.pointerType !== 'touch' &&
			window.matchMedia('(hover: hover)').matches
		) {
			this.setShopState(true)
		}
	}

	private closeShopOnLeave = (event: PointerEvent) => {
		if (!this.contains(event.relatedTarget as Node | null))
			this.setShopState(false)
	}

	private toggleShop = () => {
		this.setShopState(!this.classList.contains('is-shop-open'))
	}

	private setShopState(open: boolean) {
		if (!this.shopTrigger || !this.shopMenu) return
		this.classList.toggle('is-shop-open', open)
		this.shopTrigger.setAttribute('aria-expanded', String(open))
		this.shopMenu.setAttribute('aria-hidden', String(!open))
	}

	private openDrawer = (event: Event) => {
		const trigger = event.currentTarget as HTMLElement
		const name = trigger.dataset.drawerTrigger
		const drawer = this.querySelector<HTMLElement>(
			`[data-drawer="${name}"]`
		)
		if (!drawer || !this.backdrop) return

		window.clearTimeout(this.backdropTimer)
		this.closeActiveDrawer(false)
		this.setShopState(false)
		this.activeDrawer = drawer
		this.lastTrigger = trigger
		this.backdrop.hidden = false
		drawer.setAttribute('aria-hidden', 'false')
		trigger.setAttribute('aria-expanded', 'true')
		document.body.classList.add('fp-header-drawer-open')

		requestAnimationFrame(() => {
			drawer.classList.add('is-open')
			const firstFocusable =
				drawer.querySelector<HTMLElement>(focusableSelector)
			firstFocusable?.focus({ preventScroll: true })
		})
	}

	private closeDrawer = () => {
		this.closeActiveDrawer(true)
	}

	private closeActiveDrawer(returnFocus: boolean) {
		if (!this.activeDrawer) return
		const drawer = this.activeDrawer
		const trigger = this.lastTrigger
		drawer.classList.remove('is-open')
		drawer.setAttribute('aria-hidden', 'true')
		trigger?.setAttribute('aria-expanded', 'false')
		document.body.classList.remove('fp-header-drawer-open')
		this.activeDrawer = null
		this.lastTrigger = null

		const motionSlow =
			Number.parseFloat(
				getComputedStyle(this).getPropertyValue('--fp-motion-slow')
			) || 600
		this.backdropTimer = window.setTimeout(() => {
			if (this.backdrop && !this.activeDrawer) this.backdrop.hidden = true
		}, motionSlow)

		if (returnFocus) trigger?.focus({ preventScroll: true })
	}

	private handleKeydown = (event: KeyboardEvent) => {
		if (event.key === 'Escape') {
			if (this.activeDrawer) this.closeActiveDrawer(true)
			else if (this.classList.contains('is-shop-open')) {
				this.setShopState(false)
				this.shopTrigger?.focus({ preventScroll: true })
			}
			return
		}

		if (event.key !== 'Tab' || !this.activeDrawer) return
		const focusable = Array.from(
			this.activeDrawer.querySelectorAll<HTMLElement>(focusableSelector)
		).filter((element) => element.offsetParent !== null)
		if (!focusable.length) return

		const first = focusable[0]
		const last = focusable[focusable.length - 1]
		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault()
			last.focus()
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault()
			first.focus()
		}
	}

	private selectOffer = (event: Event) => {
		const button = event.currentTarget as HTMLButtonElement
		const index = Number(button.dataset.offerDot)
		const messages = this.querySelectorAll<HTMLElement>(
			'[data-offer-message]'
		)
		const dots =
			this.querySelectorAll<HTMLButtonElement>('[data-offer-dot]')

		messages.forEach((message, messageIndex) =>
			message.classList.toggle('is-active', messageIndex === index)
		)
		dots.forEach((dot, dotIndex) => {
			const active = dotIndex === index
			dot.classList.toggle('is-active', active)
			if (active) dot.setAttribute('aria-current', 'true')
			else dot.removeAttribute('aria-current')
		})
	}

	private selectOfferOnHover = (event: PointerEvent) => {
		if (
			event.pointerType !== 'touch' &&
			window.matchMedia('(hover: hover) and (pointer: fine)').matches
		) {
			this.selectOffer(event)
		}
	}
}
