export class FoulplayProductShowcase extends HTMLElement {
	static htmlSelector = 'foulplay-product-showcase'

	connectedCallback() {
		this.querySelectorAll<HTMLButtonElement>(
			'[data-product-filter]'
		).forEach((button) => {
			button.addEventListener('click', this.selectFilter)
		})
		this.updateFilterCounts()
		this.applyFilter(this.dataset.defaultFilter || 'featured', false)
	}

	disconnectedCallback() {
		this.querySelectorAll<HTMLButtonElement>(
			'[data-product-filter]'
		).forEach((button) => {
			button.removeEventListener('click', this.selectFilter)
		})
	}

	private selectFilter = (event: Event) => {
		const button = event.currentTarget as HTMLButtonElement
		if (button.disabled) return
		this.applyFilter(button.dataset.productFilter || 'featured', true)
	}

	private updateFilterCounts() {
		const cards = Array.from(
			this.querySelectorAll<HTMLElement>('[data-product-categories]')
		)
		this.querySelectorAll<HTMLButtonElement>(
			'[data-product-filter]'
		).forEach((button) => {
			const category = button.dataset.productFilter || ''
			const count = cards.filter((card) =>
				(card.dataset.productCategories || '').includes(`,${category},`)
			).length
			const countLabel = button.querySelector<HTMLElement>(
				'.foulplay-product-module__count'
			)
			if (countLabel) countLabel.textContent = String(count)
			button.disabled = count === 0
			button.setAttribute('aria-disabled', String(count === 0))
		})
	}

	private applyFilter(category: string, announce: boolean) {
		let visibleCount = 0
		this.querySelectorAll<HTMLElement>('[data-product-categories]').forEach(
			(card) => {
				const visible = (card.dataset.productCategories || '').includes(
					`,${category},`
				)
				const wrapper =
					card.closest<HTMLElement>('.shopify-block') || card
				wrapper.hidden = !visible
				if (visible) visibleCount += 1
			}
		)

		this.querySelectorAll<HTMLButtonElement>(
			'[data-product-filter]'
		).forEach((button) => {
			button.setAttribute(
				'aria-pressed',
				String(button.dataset.productFilter === category)
			)
		})

		if (announce) {
			const status = this.querySelector<HTMLElement>(
				'[data-product-status]'
			)
			if (status) status.textContent = `${visibleCount} products shown`
		}
	}
}

export class FoulplayScienceSwitcher extends HTMLElement {
	static htmlSelector = 'foulplay-science-switcher'

	connectedCallback() {
		this.querySelectorAll<HTMLButtonElement>(
			'[data-science-filter]'
		).forEach((button) => {
			button.addEventListener('click', this.selectGroup)
		})
		this.querySelectorAll<HTMLButtonElement>(
			'[data-science-benefit-trigger]'
		).forEach((button) => {
			button.addEventListener('click', this.selectBenefit)
			button.addEventListener('focus', this.selectBenefit)
			button.addEventListener('pointerenter', this.selectBenefitOnHover)
		})
		this.updateGroupAvailability()
		this.applyGroup('creatine')
	}

	disconnectedCallback() {
		this.querySelectorAll<HTMLButtonElement>(
			'[data-science-filter]'
		).forEach((button) => {
			button.removeEventListener('click', this.selectGroup)
		})
		this.querySelectorAll<HTMLButtonElement>(
			'[data-science-benefit-trigger]'
		).forEach((button) => {
			button.removeEventListener('click', this.selectBenefit)
			button.removeEventListener('focus', this.selectBenefit)
			button.removeEventListener(
				'pointerenter',
				this.selectBenefitOnHover
			)
		})
	}

	private selectGroup = (event: Event) => {
		const button = event.currentTarget as HTMLButtonElement
		if (button.disabled) return
		this.applyGroup(button.dataset.scienceFilter || 'creatine')
	}

	private updateGroupAvailability() {
		const benefits = Array.from(
			this.querySelectorAll<HTMLElement>('[data-foulplay-panel-item]')
		)
		this.querySelectorAll<HTMLButtonElement>(
			'[data-science-filter]'
		).forEach((button) => {
			const group = button.dataset.scienceFilter || ''
			const available = benefits.some(
				(benefit) => benefit.dataset.foulplayPanelItem === group
			)
			button.disabled = !available
			button.setAttribute('aria-disabled', String(!available))
		})
	}

	private applyGroup(group: string) {
		const visibleBenefits: HTMLElement[] = []
		this.querySelectorAll<HTMLElement>(
			'[data-foulplay-panel-item]'
		).forEach((benefit) => {
			const visible = benefit.dataset.foulplayPanelItem === group
			const wrapper =
				benefit.closest<HTMLElement>('.shopify-block') || benefit
			wrapper.hidden = !visible
			if (visible) visibleBenefits.push(benefit)
		})

		this.querySelectorAll<HTMLButtonElement>(
			'[data-science-filter]'
		).forEach((button) => {
			button.setAttribute(
				'aria-pressed',
				String(button.dataset.scienceFilter === group)
			)
		})

		const firstTrigger =
			visibleBenefits[0]?.querySelector<HTMLButtonElement>(
				'[data-science-benefit-trigger]'
			)
		if (firstTrigger) this.applyBenefit(firstTrigger)
	}

	private selectBenefit = (event: Event) => {
		this.applyBenefit(event.currentTarget as HTMLButtonElement)
	}

	private selectBenefitOnHover = (event: PointerEvent) => {
		if (
			event.pointerType !== 'touch' &&
			window.matchMedia('(hover: hover) and (pointer: fine)').matches
		) {
			this.applyBenefit(event.currentTarget as HTMLButtonElement)
		}
	}

	private applyBenefit(activeTrigger: HTMLButtonElement) {
		this.querySelectorAll<HTMLButtonElement>(
			'[data-science-benefit-trigger]'
		).forEach((trigger) => {
			const active = trigger === activeTrigger
			trigger.setAttribute('aria-pressed', String(active))
			const panelId = trigger.getAttribute('aria-controls')
			const panel = panelId
				? this.querySelector<HTMLElement>(`#${CSS.escape(panelId)}`)
				: null
			panel?.classList.toggle('is-active', active)
			panel?.setAttribute('aria-hidden', String(!active))
		})
	}
}

export class FoulplayBundleShowcase extends HTMLElement {
	static htmlSelector = 'foulplay-bundle-showcase'

	connectedCallback() {
		const source = this.querySelector<HTMLElement>('[data-bundle-source]')
		const tabs = this.querySelector<HTMLElement>('[data-bundle-tabs]')
		const panels = this.querySelector<HTMLElement>('[data-bundle-panels]')
		if (!source || !tabs || !panels || tabs.children.length) return

		source
			.querySelectorAll<HTMLElement>('.shopify-block')
			.forEach((wrapper) => {
				const tab =
					wrapper.querySelector<HTMLButtonElement>(
						'[data-bundle-tab]'
					)
				const panel = wrapper.querySelector<HTMLElement>(
					'[data-bundle-panel]'
				)
				if (tab) tabs.append(tab)
				if (panel) panels.append(panel)
				wrapper.remove()
			})

		this.addEventListener('click', this.handleClick)
		this.addEventListener('keydown', this.handleKeydown)
		this.addEventListener('change', this.handleChange)
		const firstTab =
			this.querySelector<HTMLButtonElement>('[data-bundle-tab]')
		if (firstTab) this.selectBundle(firstTab.dataset.bundleTab || '', false)
	}

	disconnectedCallback() {
		this.removeEventListener('click', this.handleClick)
		this.removeEventListener('keydown', this.handleKeydown)
		this.removeEventListener('change', this.handleChange)
	}

	private handleClick = (event: Event) => {
		const tab = (event.target as HTMLElement).closest<HTMLButtonElement>(
			'[data-bundle-tab]'
		)
		if (tab) this.selectBundle(tab.dataset.bundleTab || '', true)
	}

	private handleKeydown = (event: KeyboardEvent) => {
		const current = (
			event.target as HTMLElement
		).closest<HTMLButtonElement>('[data-bundle-tab]')
		if (!current) return
		const tabs = Array.from(
			this.querySelectorAll<HTMLButtonElement>('[data-bundle-tab]')
		)
		const currentIndex = tabs.indexOf(current)
		let nextIndex = currentIndex
		if (event.key === 'ArrowRight')
			nextIndex = (currentIndex + 1) % tabs.length
		else if (event.key === 'ArrowLeft')
			nextIndex = (currentIndex - 1 + tabs.length) % tabs.length
		else if (event.key === 'Home') nextIndex = 0
		else if (event.key === 'End') nextIndex = tabs.length - 1
		else return
		event.preventDefault()
		const next = tabs[nextIndex]
		this.selectBundle(next.dataset.bundleTab || '', true)
		next.focus()
	}

	private handleChange = (event: Event) => {
		const select = (event.target as HTMLElement).closest<HTMLSelectElement>(
			'[data-bundle-option]'
		)
		if (!select) return
		const option = select.selectedOptions[0]
		const control = select.closest<HTMLElement>(
			'.foulplay-bundle-option__control'
		)
		const flavour = control?.querySelector<HTMLElement>(
			'[data-option-flavour]'
		)
		const size = control?.querySelector<HTMLElement>('[data-option-size]')
		if (flavour) flavour.textContent = option.dataset.flavour || ''
		if (size) size.textContent = option.dataset.size || ''
	}

	private selectBundle(id: string, announce: boolean) {
		this.querySelectorAll<HTMLButtonElement>('[data-bundle-tab]').forEach(
			(tab) => {
				const active = tab.dataset.bundleTab === id
				tab.setAttribute('aria-selected', String(active))
				tab.tabIndex = active ? 0 : -1
			}
		)
		let title = ''
		this.querySelectorAll<HTMLElement>('[data-bundle-panel]').forEach(
			(panel) => {
				const active = panel.dataset.bundlePanel === id
				panel.hidden = !active
				if (active) title = panel.dataset.bundleTitle || ''
			}
		)
		if (announce) {
			const status = this.querySelector<HTMLElement>(
				'[data-bundle-status]'
			)
			if (status) status.textContent = `${title} selected`
		}
	}
}

export class FoulplayRoster extends HTMLElement {
	static htmlSelector = 'foulplay-roster'
	private activeIndex = 0
	private intervalId?: number

	connectedCallback() {
		this.addEventListener('click', this.handleClick)
		this.addEventListener('mouseenter', this.stopAutoplay)
		this.addEventListener('mouseleave', this.startAutoplay)
		this.addEventListener('focusin', this.stopAutoplay)
		this.addEventListener('focusout', this.startAutoplay)
		this.showProfile(0)
		this.startAutoplay()
	}

	disconnectedCallback() {
		this.removeEventListener('click', this.handleClick)
		this.removeEventListener('mouseenter', this.stopAutoplay)
		this.removeEventListener('mouseleave', this.startAutoplay)
		this.removeEventListener('focusin', this.stopAutoplay)
		this.removeEventListener('focusout', this.startAutoplay)
		this.stopAutoplay()
	}

	private get wrappers() {
		return Array.from(
			this.querySelectorAll<HTMLElement>(
				'[data-roster-profiles] > .shopify-block'
			)
		)
	}

	private handleClick = (event: Event) => {
		const target = event.target as HTMLElement
		if (target.closest('[data-roster-previous]')) this.showProfile(-1, true)
		if (target.closest('[data-roster-next]')) this.showProfile(1, true)
	}

	private showProfile(index: number, relative = false) {
		const wrappers = this.wrappers
		if (!wrappers.length) return
		this.activeIndex = relative
			? (this.activeIndex + index + wrappers.length) % wrappers.length
			: Math.max(0, Math.min(index, wrappers.length - 1))
		wrappers.forEach((wrapper, wrapperIndex) => {
			wrapper.hidden = wrapperIndex !== this.activeIndex
		})
		const card = wrappers[this.activeIndex]?.querySelector<HTMLElement>(
			'[data-roster-card]'
		)
		const image = this.querySelector<HTMLImageElement>(
			'.foulplay-roster-section__hero img'
		)
		const nextSource = card?.dataset.rosterHero
		if (image && nextSource && image.src !== nextSource) {
			image.classList.add('is-changing')
			window.setTimeout(() => {
				image.src = nextSource
				image.onload = () => image.classList.remove('is-changing')
			}, 300)
		}
	}

	private startAutoplay = () => {
		this.stopAutoplay()
		if (
			this.wrappers.length < 2 ||
			window.matchMedia('(prefers-reduced-motion: reduce)').matches
		)
			return
		this.intervalId = window.setInterval(() => this.showProfile(1, true), 5000)
	}

	private stopAutoplay = () => {
		if (this.intervalId) window.clearInterval(this.intervalId)
		this.intervalId = undefined
	}
}

export class FoulplayJournalCarousel extends HTMLElement {
	static htmlSelector = 'foulplay-journal-carousel'

	connectedCallback() {
		this.addEventListener('click', this.handleClick)
	}

	disconnectedCallback() {
		this.removeEventListener('click', this.handleClick)
	}

	private handleClick = (event: Event) => {
		const target = event.target as HTMLElement
		if (target.closest('[data-journal-drawer]')) {
			document
				.querySelector<HTMLElement>('[data-drawer-trigger="journal"]')
				?.click()
			return
		}
		const direction = target.closest('[data-journal-previous]')
			? -1
			: target.closest('[data-journal-next]')
				? 1
				: 0
		if (!direction) return
		const track = this.querySelector<HTMLElement>('[data-journal-track]')
		const card = track?.querySelector<HTMLElement>('.shopify-block')
		if (!track || !card) return
		track.scrollBy({
			left: direction * (card.getBoundingClientRect().width + 16),
			behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
				? 'auto'
				: 'smooth',
		})
	}
}
