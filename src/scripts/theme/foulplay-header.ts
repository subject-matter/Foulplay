import { PUB_SUB_EVENTS, subscribe } from '@/scripts/core/global'

const focusableSelector = [
	'a[href]',
	'button:not([disabled])',
	'input:not([disabled])',
	'select:not([disabled])',
	'textarea:not([disabled])',
	'[tabindex]:not([tabindex="-1"])',
].join(',')

type HeaderProductData = {
	variants: Array<{
		id: number
		available: boolean
		price: string
		sellingPlans: Record<string, string>
	}>
}

export class FoulplayHeader extends HTMLElement {
	static htmlSelector = 'foulplay-header'

	private shopTrigger: HTMLButtonElement | null = null
	private shopMenu: HTMLElement | null = null
	private backdrop: HTMLElement | null = null
	private activeDrawer: HTMLElement | null = null
	private lastTrigger: HTMLElement | null = null
	private backdropTimer: number | undefined
	private activeProductHandle: string | undefined
	private cartUpdateUnsubscriber: (() => void) | undefined

	connectedCallback() {
		this.mountProductForms()
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
		this.addEventListener('change', this.handleProductChange)
		this.cartUpdateUnsubscriber = subscribe(
			PUB_SUB_EVENTS.cartUpdate,
			this.refreshCustomCart
		)
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
		document.addEventListener(
			'shopify:section:load',
			this.handleSectionLoad
		)
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
		document.removeEventListener(
			'shopify:section:load',
			this.handleSectionLoad
		)
		this.removeEventListener('change', this.handleProductChange)
		this.cartUpdateUnsubscriber?.()
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
		const productSections = document.querySelectorAll<HTMLElement>(
			'[data-header-product]'
		)
		const activeProductSection = Array.from(productSections).find(
			(section) => {
				const bounds = section.getBoundingClientRect()
				return bounds.top <= headerProbe && bounds.bottom > headerProbe
			}
		)
		const activeProductHandle = activeProductSection?.dataset.headerProduct
		const productForm = activeProductHandle
			? this.querySelector<HTMLElement>(
					`[data-header-product-form="${CSS.escape(activeProductHandle)}"]`
				)
			: null
		const productActive = Boolean(
			productForm && window.matchMedia('(min-width: 1000px)').matches
		)

		this.classList.toggle('is-product', productActive)
		this.setActiveProductForm(
			productActive ? activeProductHandle : undefined
		)

		const themedSections = document.querySelectorAll<HTMLElement>(
			'[data-header-theme="dark"]'
		)
		const overDarkSection = Array.from(themedSections).some((section) => {
			const bounds = section.getBoundingClientRect()
			return bounds.top <= headerProbe && bounds.bottom > headerProbe
		})
		this.classList.toggle('is-over-dark', overDarkSection)
	}

	private setActiveProductForm(handle?: string) {
		if (this.activeProductHandle === handle) return
		this.activeProductHandle = handle

		this.querySelectorAll<HTMLElement>(
			'[data-header-product-form]'
		).forEach((form) => {
			const active = form.dataset.headerProductForm === handle
			form.hidden = !active
			if (active) this.updateProductForm(form)
		})
	}

	private mountProductForms() {
		const productRow = this.querySelector<HTMLElement>(
			'[data-header-product-row]'
		)
		if (!productRow) return

		document
			.querySelectorAll<HTMLTemplateElement>(
				'template[data-header-product-source]'
			)
			.forEach((source) => {
				if (!source.content.childElementCount) return
				const slot = source.dataset.headerProductSource
				if (!slot) return

				productRow
					.querySelectorAll<HTMLElement>(
						`[data-header-product-slot="${CSS.escape(slot)}"], [data-header-product-ui="${CSS.escape(slot)}"]`
					)
					.forEach((element) => element.remove())

				productRow.append(source.content.cloneNode(true))
			})
	}

	private handleSectionLoad = () => {
		this.activeProductHandle = undefined
		this.mountProductForms()
		this.updateCompactState()
	}

	private handleProductChange = (event: Event) => {
		const target = event.target as HTMLElement
		const productForm = target.closest<HTMLElement>(
			'[data-header-product-form]'
		)
		if (!productForm) return

		if (target.matches('[data-header-purchase-option]')) {
			const subscriptionSelected =
				(target as HTMLInputElement).value === 'subscription'
			const sellingPlan = productForm.querySelector<HTMLSelectElement>(
				'[data-header-selling-plan]'
			)
			if (sellingPlan) sellingPlan.disabled = !subscriptionSelected
		}

		this.updateProductForm(productForm)
	}

	private updateProductForm(productForm: HTMLElement) {
		const dataElement = productForm.querySelector<HTMLScriptElement>(
			'[data-header-product-data]'
		)
		const variantSelect = productForm.querySelector<HTMLSelectElement>(
			'[data-header-variant]'
		)
		const sellingPlan = productForm.querySelector<HTMLSelectElement>(
			'[data-header-selling-plan]'
		)
		const subscription = productForm.querySelector<HTMLInputElement>(
			'[data-header-purchase-option][value="subscription"]'
		)
		const price = productForm.querySelector<HTMLElement>(
			'[data-header-product-price]'
		)
		const button = productForm.querySelector<HTMLButtonElement>(
			'[data-header-product-submit]'
		)
		const buttonLabel = productForm.querySelector<HTMLElement>(
			'[data-header-submit-label]'
		)
		const status = productForm.querySelector<HTMLElement>(
			'[data-header-product-status]'
		)
		if (!dataElement || !variantSelect || !price || !button || !buttonLabel)
			return

		let data: HeaderProductData
		try {
			data = JSON.parse(
				dataElement.textContent || '{}'
			) as HeaderProductData
		} catch {
			return
		}

		const variant = data.variants.find(
			(item) => item.id === Number(variantSelect.value)
		)
		if (!variant) return

		const subscriptionActive = Boolean(
			subscription?.checked && sellingPlan && !sellingPlan.disabled
		)
		const planPrice = subscriptionActive
			? variant.sellingPlans[sellingPlan?.value || '']
			: undefined
		const available =
			variant.available && (!subscriptionActive || Boolean(planPrice))

		price.textContent = planPrice || variant.price
		button.disabled = !available
		button.setAttribute('aria-disabled', String(!available))
		buttonLabel.textContent = available ? 'Add to Cart' : 'Sold Out'
		if (status) {
			status.textContent = `${buttonLabel.textContent}, ${price.textContent}`
		}
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
