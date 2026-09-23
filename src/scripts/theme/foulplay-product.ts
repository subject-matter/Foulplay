// MARK:- Foulplay PDP buy area from Figma node 1287:42495

type FoulplayVariant = {
	id: number
	available: boolean
	option1: string | null
	option2: string | null
	option3: string | null
	price: string
	compareAtPrice: string | null
	sellingPlans: Record<string, string>
	mediaId: string | null
}

type FoulplayProductData = {
	variants: FoulplayVariant[]
}

export class FoulplayProduct extends HTMLElement {
	static htmlSelector = 'foulplay-product'

	private data: FoulplayProductData = { variants: [] }
	private selected: [string | null, string | null, string | null] = [
		null,
		null,
		null,
	]

	connectedCallback() {
		const dataEl = this.querySelector<HTMLScriptElement>(
			'[data-fp-product-data]'
		)
		if (dataEl) {
			try {
				this.data = JSON.parse(dataEl.textContent || '{}')
			} catch {
				this.data = { variants: [] }
			}
		}

		const current = this.currentVariant()
		this.selected = [
			current?.option1 ?? null,
			current?.option2 ?? null,
			current?.option3 ?? null,
		]

		this.addEventListener('click', this.handleClick)
		this.addEventListener('change', this.handleChange)
		this.syncUi(false)
	}

	disconnectedCallback() {
		this.removeEventListener('click', this.handleClick)
		this.removeEventListener('change', this.handleChange)
	}

	private currentVariant(): FoulplayVariant | undefined {
		const idInput = this.querySelector<HTMLInputElement>('[data-fp-variant-id]')
		const id = Number(idInput?.value)
		return (
			this.data.variants.find((variant) => variant.id === id) ||
			this.data.variants.find((variant) => variant.available) ||
			this.data.variants[0]
		)
	}

	private handleClick = (event: Event) => {
		const thumb = (event.target as HTMLElement).closest<HTMLButtonElement>(
			'[data-fp-thumb]'
		)
		if (thumb) {
			event.preventDefault()
			this.showMedia(thumb.dataset.fpThumb || null)
			this.querySelectorAll<HTMLButtonElement>('[data-fp-thumb]').forEach(
				(item) =>
					item.setAttribute(
						'aria-pressed',
						String(item === thumb)
					)
			)
			return
		}

		const swatch = (event.target as HTMLElement).closest<HTMLButtonElement>(
			'[data-fp-swatch]'
		)
		if (!swatch) return
		event.preventDefault()
		const position = Number(swatch.dataset.fpSwatchPosition || '1') - 1
		this.selected[position] = swatch.dataset.fpSwatch || null
		this.resolveVariant()
		this.syncUi(true)
	}

	private showMedia(mediaId: string | number | null) {
		if (mediaId === null || mediaId === undefined || mediaId === '') return
		const target = String(mediaId)
		const stage = this.querySelector<HTMLElement>('[data-fp-media-stage]')
		if (!stage) return
		stage.querySelectorAll<HTMLElement>('[data-fp-media]').forEach((item) => {
			item.hidden = item.dataset.fpMedia !== target
		})
	}

	private handleChange = (event: Event) => {
		const target = event.target as HTMLElement
		if (target.matches('[data-fp-option-select]')) {
			const position = Number(target.dataset.fpOptionPosition || '2') - 1
			this.selected[position] = (target as HTMLSelectElement).value
			this.resolveVariant()
		}
		if (target.matches('[data-fp-purchase-option]')) {
			const subscribe =
				(target as HTMLInputElement).value === 'subscription'
			const plan = this.querySelector<HTMLSelectElement>(
				'[data-fp-selling-plan]'
			)
			if (plan) plan.disabled = !subscribe
			this.classList.toggle('is-subscription', subscribe)
		}
		this.syncUi(true)
	}

	private resolveVariant() {
		const match = this.data.variants.find(
			(variant) =>
				(this.selected[0] === null ||
					variant.option1 === this.selected[0]) &&
				(this.selected[1] === null ||
					variant.option2 === this.selected[1]) &&
				(this.selected[2] === null || variant.option3 === this.selected[2])
		)
		if (!match) return
		const idInput = this.querySelector<HTMLInputElement>('[data-fp-variant-id]')
		if (idInput) idInput.value = String(match.id)
	}

	private isSubscription(): boolean {
		const subscribe = this.querySelector<HTMLInputElement>(
			'[data-fp-purchase-option][value="subscription"]'
		)
		const plan = this.querySelector<HTMLSelectElement>(
			'[data-fp-selling-plan]'
		)
		return Boolean(subscribe?.checked && plan && !plan.disabled)
	}

	private syncUi(announce: boolean) {
		const variant = this.currentVariant()
		if (!variant) return

		// Swatch pressed state
		this.querySelectorAll<HTMLButtonElement>('[data-fp-swatch]').forEach(
			(swatch) => {
				const position = Number(swatch.dataset.fpSwatchPosition || '1') - 1
				swatch.setAttribute(
					'aria-pressed',
					String(swatch.dataset.fpSwatch === this.selected[position])
				)
			}
		)

		// Selected flavour label
		const flavourLabel = this.querySelector<HTMLElement>('[data-fp-flavour-label]')
		if (flavourLabel && variant.option1) flavourLabel.textContent = variant.option1

		// Main media swap follows the selected variant
		if (variant.mediaId) this.showMedia(variant.mediaId)

		// Price
		const subscription = this.isSubscription()
		const plan = this.querySelector<HTMLSelectElement>(
			'[data-fp-selling-plan]'
		)
		const planPrice = subscription
			? variant.sellingPlans[plan?.value || '']
			: undefined
		const price = planPrice || variant.price
		const available =
			variant.available && (!subscription || Boolean(planPrice))

		this.querySelectorAll<HTMLElement>('[data-fp-price]').forEach((el) => {
			el.textContent = price
		})
		const compare = this.querySelector<HTMLElement>('[data-fp-compare]')
		if (compare) {
			const compareValue = subscription
				? variant.price
				: variant.compareAtPrice
			compare.textContent = compareValue || ''
			compare.hidden = !compareValue || compareValue === price
		}

		// Submit button
		const button = this.querySelector<HTMLButtonElement>('[data-fp-submit]')
		const label = this.querySelector<HTMLElement>('[data-fp-submit-label]')
		if (button) {
			button.disabled = !available
			button.setAttribute('aria-disabled', String(!available))
		}
		if (label) label.textContent = available ? 'Add to Cart' : 'Sold Out'

		const status = this.querySelector<HTMLElement>('[data-fp-status]')
		if (status && announce) {
			status.textContent = `${label?.textContent}, ${price}`
		}
	}
}
