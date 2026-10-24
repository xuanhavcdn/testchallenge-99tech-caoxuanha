/**
 * Selectors and texts shared by several pages and components.
 * Page files build their own selectors from these, so a change to shared
 * markup is made in one place.
 */
export const globalLocator = {
  /** Main content container: product grid (home), product details (product), cart table body (cart). */
  content: '#tbodyid',
  /** Footer of a Bootstrap modal (login, place order), which holds its action buttons. */
  modalFooter: '.modal-footer',
} as const;

export const globalTexts = {
  closeButton: 'Close',
} as const;
