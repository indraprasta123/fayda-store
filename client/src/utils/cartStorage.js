const CART_STORAGE_KEY = "cart_items";
const LEGACY_CART_KEYS = ["cart"];

const normalizeCart = (value) => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const parsedStock = Number(item?.stock);
      const hasKnownStock = Number.isFinite(parsedStock) && parsedStock >= 0;

      if (hasKnownStock && parsedStock === 0) {
        return null;
      }

      const normalizedQuantity = Math.max(1, Number(item?.quantity || 1));

      return {
        id: item?.id,
        name: item?.name || "",
        price: Number(item?.price || 0),
        image: item?.image || "",
        stock: hasKnownStock ? parsedStock : null,
        quantity: hasKnownStock
          ? Math.min(normalizedQuantity, parsedStock)
          : normalizedQuantity,
      };
    })
    .filter((item) => item && item.id !== undefined && item.id !== null);
};

export const readCartItems = () => {
  try {
    const primary = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]");
    const normalizedPrimary = normalizeCart(primary);

    if (normalizedPrimary.length > 0) {
      return normalizedPrimary;
    }

    for (const key of LEGACY_CART_KEYS) {
      const legacy = JSON.parse(localStorage.getItem(key) || "[]");
      const normalizedLegacy = normalizeCart(legacy);

      if (normalizedLegacy.length > 0) {
        localStorage.setItem(
          CART_STORAGE_KEY,
          JSON.stringify(normalizedLegacy),
        );
        return normalizedLegacy;
      }
    }

    return [];
  } catch {
    return [];
  }
};

export const writeCartItems = (items) => {
  const normalizedItems = normalizeCart(items);
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(normalizedItems));
  window.dispatchEvent(new Event("cart-updated"));
};

export const getCartCount = (items) =>
  normalizeCart(items).reduce((acc, item) => acc + item.quantity, 0);

export const addToCart = (product) => {
  const currentCart = readCartItems();
  const productId = product?.id;
  const parsedStock = Number(product?.stock);
  const hasKnownStock = Number.isFinite(parsedStock) && parsedStock >= 0;

  if (productId === undefined || productId === null) return currentCart;

  if (hasKnownStock && parsedStock < 1) {
    return currentCart;
  }

  const existingIndex = currentCart.findIndex((item) => item.id === productId);

  if (existingIndex >= 0) {
    const existingItem = currentCart[existingIndex];
    const effectiveStock = hasKnownStock ? parsedStock : existingItem.stock;
    const nextQuantity = existingItem.quantity + 1;

    currentCart[existingIndex] = {
      ...existingItem,
      stock: effectiveStock ?? null,
      quantity:
        Number.isFinite(effectiveStock) && effectiveStock > 0
          ? Math.min(nextQuantity, effectiveStock)
          : nextQuantity,
    };
  } else {
    currentCart.push({
      id: productId,
      name: product?.name || "",
      price: Number(product?.price || 0),
      image: product?.image || "",
      stock: hasKnownStock ? parsedStock : null,
      quantity: 1,
    });
  }

  writeCartItems(currentCart);
  return currentCart;
};
