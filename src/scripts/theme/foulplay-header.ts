import { PUB_SUB_EVENTS, subscribe } from '@/scripts/core/global'

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
	private offerTimer: number | undefined
	private cartUpdateUnsubscriber: (() => void) | undefined

	connectedCallback() {
		this.addEventListener('click', this.handleShopCategoryClick)
		this.addEventListener('keydown', this.handleShopCategoryKeydown)
		this.addEventListener('shopify:block:select', this.handleShopBlockSelect)
		this.mountProductForms()
		this.shopTrigger = this.querySelector('[data-shop-trigger]')
		this.shopMenu = this.querySelector('[data-shop-menu]')
		this.backdrop = this.querySelector('[data-drawer-backdrop]')

		this.shopTrigger?.addEventListener('click', this.toggleShop)
		this.shopTrigger?.addEventListener('pointerenter', this.openShopOnHover)
		this.querySelector<HTMLElement>('[data-header-shell]')?.addEventListener(
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
		this.cartUpdateUnsubscriber = subscribe(
			PUB_SUB_EVENTS.cartUpdate,
			this.refreshCustomCart
		)
		this.querySelectorAll<HTMLButtonElement>('[data-offer-dot]').forEach(
			(button) => {
				button.addEventListener('click', this.selectOffer)
			}
		)

		window.addEventListener('scroll', this.updateCompactState, {
			passive: true,
		})
		window.addEventListener('resize', this.updateCompactState, {
			passive: true,
		})
		document.addEventListener('keydown', this.handleKeydown)
		document.addEventListener(
			'shopify:section:load',
			this.handleSectionLoad
		)
		this.updateCompactState()
		this.startOfferCycle()
	}

	disconnectedCallback() {
		this.removeEventListener('click', this.handleShopCategoryClick)
		this.removeEventListener('keydown', this.handleShopCategoryKeydown)
		this.removeEventListener('shopify:block:select', this.handleShopBlockSelect)
		window.clearInterval(this.offerTimer)
		this.querySelectorAll<HTMLButtonElement>('[data-offer-dot]').forEach(
			(button) => button.removeEventListener('click', this.selectOffer)
		)
		this.shopTrigger?.removeEventListener('click', this.toggleShop)
		this.shopTrigger?.removeEventListener(
			'pointerenter',
			this.openShopOnHover
		)
		this.querySelector<HTMLElement>('[data-header-shell]')?.removeEventListener(
			'pointerleave',
			this.closeShopOnLeave
		)
		window.removeEventListener('scroll', this.updateCompactState)
		window.removeEventListener('resize', this.updateCompactState)
		document.removeEventListener('keydown', this.handleKeydown)
		document.removeEventListener(
			'shopify:section:load',
			this.handleSectionLoad
		)
		this.cartUpdateUnsubscriber?.()
	}

	private updateCompactState = () => {
		const opening = document.querySelector<HTMLElement>('.homepage-showcase .foulplay-scene, .home-opening')
		const compactAfter = opening && !opening.hasAttribute('data-header-product')
			? opening.getBoundingClientRect().bottom + window.scrollY
			: 16
		const compact =
			!this.classList.contains('fp-header--home') ||
			window.scrollY >= compactAfter
		this.classList.toggle('is-compact', compact)
		const headerProbe = 38
		const grid = this.querySelector<HTMLElement>('[data-header-grid]')
		const headerTop = grid?.getBoundingClientRect().top ?? 16
		const rowTop = headerTop + 39
		const rowHeight = 106
		const headerBottom = rowTop + rowHeight
		const desktop = window.matchMedia('(min-width: 1000px)').matches
		const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-header-product]'))
		const intersections = sections.map(section => ({ section, bounds: section.getBoundingClientRect() }))
			.filter(({ bounds }) => desktop && bounds.top < headerBottom && bounds.bottom > headerTop)
		this.classList.toggle('is-product', intersections.length > 0)
		this.querySelectorAll<HTMLElement>('[data-header-product-form]').forEach(form => {
			const match = intersections.find(({ section }) => section.dataset.headerProductSlot === form.dataset.headerProductSlot)
			const top = match ? Math.max(0, match.bounds.top - rowTop) : rowHeight
			const bottom = match ? Math.max(0, headerBottom - match.bounds.bottom) : 0
			form.hidden = !match || top + bottom >= rowHeight
			form.inert = top > 0 || bottom > 0
			form.style.clipPath = `inset(${Math.min(top, rowHeight)}px 0 ${Math.min(bottom, rowHeight)}px 0)`
		})
		const expanded = this.querySelector<HTMLElement>('.fp-header__expanded-row')
		if (expanded) {
			const rowIntersections = intersections.filter(({ bounds }) => bounds.top < headerBottom && bounds.bottom > rowTop)
			const first = rowIntersections[0]?.bounds
			const last = rowIntersections.at(-1)?.bounds
			expanded.inert = Boolean(first && last)
			if (!first || !last) expanded.style.clipPath = ''
			else if (first.top > rowTop) expanded.style.clipPath = `inset(0 0 ${headerBottom - first.top}px 0)`
			else expanded.style.clipPath = `inset(${Math.min(rowHeight, last.bottom - rowTop)}px 0 0 0)`
		}

		const themedSections = document.querySelectorAll<HTMLElement>(
			'[data-header-theme="dark"]'
		)
		const overDarkSection = Array.from(themedSections).some((section) => {
			const bounds = section.getBoundingClientRect()
			return bounds.top <= headerProbe && bounds.bottom > headerProbe
		})
		this.classList.toggle('is-over-dark', overDarkSection)
		this.positionShopCategoryLine()
	}

	private positionShopCategoryLine() {
		const tab = this.querySelector<HTMLElement>('[data-shop-tab].is-active')
		const line = this.querySelector<HTMLElement>('[data-shop-category-line]')
		if (!tab || !line) return
		line.style.transform = `translateX(${tab.offsetLeft}px) scaleX(${tab.offsetWidth})`
	}

	private handleShopCategoryClick = (event: MouseEvent) => {
		const tab = (event.target as Element).closest<HTMLButtonElement>('[data-shop-tab]')
		if (tab && this.contains(tab)) this.selectShopCategory(tab, event.detail !== 0)
	}

	private handleShopCategoryKeydown = (event: KeyboardEvent) => {
		const tab = (event.target as Element).closest<HTMLButtonElement>('[data-shop-tab]')
		if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
		event.preventDefault()
		const tabs = Array.from(this.querySelectorAll<HTMLButtonElement>('[data-shop-tab]'))
		const index = tabs.indexOf(tab)
		const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
			: (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
		this.selectShopCategory(tabs[next], false)
		tabs[next].focus()
	}

	private selectShopCategory(selected: HTMLButtonElement, animate: boolean) {
		if (selected.classList.contains('is-active')) return
		const tabs = Array.from(this.querySelectorAll<HTMLButtonElement>('[data-shop-tab]'))
		const positions = tabs.map((tab) => tab.getBoundingClientRect().left)
		const line = this.querySelector<HTMLElement>('[data-shop-category-line]')
		const previousLine = line ? getComputedStyle(line).transform : ''
		tabs.forEach((tab) => {
			tab.getAnimations().forEach((animation) => animation.cancel())
			const active = tab === selected
			tab.classList.toggle('is-active', active)
			tab.setAttribute('aria-selected', String(active))
			tab.tabIndex = active ? 0 : -1
		})
		this.querySelectorAll<HTMLElement>('[data-shop-panel]').forEach((panel) => {
			panel.hidden = panel.dataset.shopPanel !== selected.dataset.shopTab
		})
		line?.getAnimations().forEach((animation) => animation.cancel())
		this.positionShopCategoryLine()
		if (!animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
		const timing = { duration: 300, easing: 'cubic-bezier(0.75, 0, 0.12, 1)' }
		tabs.forEach((tab, index) => {
			const shift = positions[index] - tab.getBoundingClientRect().left
			if (shift) tab.animate([{ transform: `translateX(${shift}px)` }, { transform: 'translateX(0)' }], timing)
		})
		if (line) line.animate([{ transform: previousLine }, { transform: line.style.transform }], timing)
	}

	private mountProductForms() {
		const productRow = this.querySelector<HTMLElement>(
			'[data-header-product-row]'
		)
		if (!productRow) return
		productRow.replaceChildren()

		document
			.querySelectorAll<HTMLTemplateElement>(
				'template[data-header-product-source]'
			)
			.forEach((source) => {
				if (!source.content.childElementCount) return
				const slot = source.dataset.headerProductSource
				if (!slot) return

				productRow.append(source.content.cloneNode(true))
			})
	}

	private handleShopBlockSelect = (event: Event) => {
		const tab = (event.target as Element).closest<HTMLButtonElement>('[data-shop-tab]')
		if (!tab) return
		this.setShopState(true)
		this.selectShopCategory(tab, false)
	}

	private handleSectionLoad = () => {
		this.mountProductForms()
		this.updateCompactState()
	}

	private refreshCustomCart = async () => {
		const sectionId = this.dataset.sectionId
		if (!sectionId) return

		const url = new URL(window.location.href)
		url.searchParams.set('section_id', sectionId)

		try {
			const response = await fetch(url.toString(), {
				headers: { 'X-Requested-With': 'XMLHttpRequest' },
			})
			if (!response.ok) return

			const documentFragment = new DOMParser().parseFromString(
				await response.text(),
				'text/html'
			)
			const nextHeader = documentFragment.querySelector('foulplay-header')
			if (!nextHeader) return

			const currentTrigger = this.querySelector<HTMLElement>(
				'[data-header-cart-trigger]'
			)
			const nextTrigger = nextHeader.querySelector<HTMLElement>(
				'[data-header-cart-trigger]'
			)
			if (currentTrigger && nextTrigger) {
				currentTrigger.textContent = nextTrigger.textContent
				const nextLabel = nextTrigger.getAttribute('aria-label')
				if (nextLabel)
					currentTrigger.setAttribute('aria-label', nextLabel)
			}

			const currentHeading = this.querySelector<HTMLElement>(
				'[data-header-cart-heading]'
			)
			const nextHeading = nextHeader.querySelector<HTMLElement>(
				'[data-header-cart-heading]'
			)
			if (currentHeading && nextHeading) {
				currentHeading.textContent = nextHeading.textContent
			}

			const currentBody = this.querySelector<HTMLElement>(
				'[data-header-cart-body]'
			)
			const nextBody = nextHeader.querySelector<HTMLElement>(
				'[data-header-cart-body]'
			)
			if (currentBody && nextBody) {
				currentBody.innerHTML = nextBody.innerHTML
			}
		} catch (error) {
			console.error('Unable to refresh the custom cart drawer.', error)
		}
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
		this.classList.add('is-shop-switching')
		this.classList.toggle('is-shop-open', open)
		this.shopTrigger.setAttribute('aria-expanded', String(open))
		this.shopMenu.setAttribute('aria-hidden', String(!open))
		// Resolve the new header geometry before restoring scroll transitions.
		void this.offsetHeight
		this.classList.remove('is-shop-switching')
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
		this.showOffer(Number(button.dataset.offerDot))
		this.startOfferCycle()
	}

	private showOffer(index: number) {
		const messages = this.querySelectorAll<HTMLElement>(
			'[data-offer-message]'
		)
		const dots =
			this.querySelectorAll<HTMLButtonElement>('[data-offer-dot]')

		messages.forEach((message, messageIndex) => {
			message.classList.toggle('is-active', messageIndex === index)
			message.setAttribute('aria-hidden', String(messageIndex !== index))
		})
		dots.forEach((dot, dotIndex) => {
			const active = dotIndex === index
			dot.classList.toggle('is-active', active)
			if (active) dot.setAttribute('aria-current', 'true')
			else dot.removeAttribute('aria-current')
		})
	}

	private startOfferCycle() {
		window.clearInterval(this.offerTimer)
		const duration = Number(this.dataset.offerDuration ?? 5)
		const messages = this.querySelectorAll<HTMLElement>('[data-offer-message]')
		if (messages.length < 2 || !Number.isFinite(duration) || duration <= 0) return
		this.offerTimer = window.setInterval(() => {
			const offer = this.querySelector<HTMLElement>('.fp-header__offer')
			if (
				document.hidden ||
				!offer?.getClientRects().length ||
				getComputedStyle(offer).visibility === 'hidden' ||
				offer.matches(':hover, :focus-within') ||
				window.matchMedia('(prefers-reduced-motion: reduce)').matches
			) return
			const current = Array.from(messages).findIndex((message) =>
				message.classList.contains('is-active')
			)
			this.showOffer((current + 1) % messages.length)
		}, duration * 1000)
	}
}
