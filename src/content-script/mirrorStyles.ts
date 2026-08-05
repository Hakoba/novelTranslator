/**
 * PrimeVue всегда инжектит стили темы в document.head (styleContainer в v4 нет),
 * а в Shadow DOM они не долетают. Зеркалим их внутрь и следим за догрузкой:
 * стиль компонента появляется в момент его первого рендера.
 */
const SELECTOR = "style[data-primevue-style-id]"

export function mirrorPrimeVueStyles(root: ShadowRoot): () => void {
  const copies = new Map<Element, HTMLStyleElement>()

  function sync(source: Element): void {
    const existing = copies.get(source)
    const copy = existing ?? document.createElement("style")

    copy.textContent = source.textContent
    if (!existing) {
      copies.set(source, copy)
      root.append(copy)
    }
  }

  document.head.querySelectorAll(SELECTOR).forEach(sync)

  // новые <style> появляются при первом рендере каждого компонента, содержимое — при смене темы
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "characterData") {
        const owner = mutation.target.parentElement
        if (owner?.matches(SELECTOR)) sync(owner)
        continue
      }

      mutation.addedNodes.forEach((node) => {
        if (node instanceof Element && node.matches(SELECTOR)) sync(node)
      })
    }
  })

  observer.observe(document.head, {
    childList: true,
    subtree: true,
    characterData: true,
  })

  return () => {
    observer.disconnect()
    copies.forEach((copy) => copy.remove())
    copies.clear()
  }
}
