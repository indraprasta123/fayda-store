const CART_STORAGE_KEY = "cart_items";
const CART_OWNER_KEY = "cart_session_owner_id";
const LEGACY_CART_KEYS = ["cart"];
const DELIVERY_INFO_KEY = "deliveryInfo";

/** User id dari JWT, atau "guest" jika belum login */
function getSessionCartOwnerId() {
  const token = localStorage.getItem("access_token");
  if (!token) return "guest";
  try {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(normalized));
    const id = decoded?.id;
    return id != null ? String(id) : "guest";
  } catch {
    return "guest";
  }
}

/**
 * Hapus keranjang + draft pengiriman + tag pemilik (dipanggil saat logout).
 */
export function clearCheckoutSession() {
  localStorage.removeItem(CART_STORAGE_KEY);
  localStorage.removeItem(CART_OWNER_KEY);
  for (const key of LEGACY_CART_KEYS) {
    localStorage.removeItem(key);
  }
  localStorage.removeItem(DELIVERY_INFO_KEY);
  window.dispatchEvent(new Event("cart-updated"));
}

function cartAllowedForSession(storedOwner, sessionOwner, cartLength) {
  if (cartLength === 0) return true;

  // Keranjang milik user tertentu — hanya boleh dipakai saat login sebagai user itu
  if (storedOwner && storedOwner !== "guest") {
    if (sessionOwner === "guest" || sessionOwner !== storedOwner) {
      return false;
    }
    return true;
  }

  // Tanpa tag pemilik + sudah login → data lama tidak tahu siapa pemiliknya → tolak
  if (!storedOwner && sessionOwner !== "guest") {
    return false;
  }

  // "guest" atau belum ada tag + mode tamu → boleh (termasuk bawa keranjang tamu ke akun setelah login)
  return true;
}

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
    const sessionOwner = getSessionCartOwnerId();
    const storedOwner = localStorage.getItem(CART_OWNER_KEY);

    const primary = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]");
    const normalizedPrimary = normalizeCart(primary);

    if (normalizedPrimary.length > 0) {
      if (!cartAllowedForSession(storedOwner, sessionOwner, normalizedPrimary.length)) {
        clearCheckoutSession();
        return [];
      }
      if (!storedOwner && sessionOwner === "guest") {
        localStorage.setItem(CART_OWNER_KEY, "guest");
      }
      return normalizedPrimary;
    }

    for (const key of LEGACY_CART_KEYS) {
      const legacy = JSON.parse(localStorage.getItem(key) || "[]");
      const normalizedLegacy = normalizeCart(legacy);

      if (normalizedLegacy.length > 0) {
        if (!cartAllowedForSession(storedOwner, sessionOwner, normalizedLegacy.length)) {
          clearCheckoutSession();
          return [];
        }
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(normalizedLegacy));
        localStorage.setItem(
          CART_OWNER_KEY,
          storedOwner || (sessionOwner === "guest" ? "guest" : sessionOwner),
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
  localStorage.setItem(CART_OWNER_KEY, getSessionCartOwnerId());
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
