const BASE_URL = "https://ecommerce.tepuia.com";

const BROWSER_HEADERS = {
  "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
  "X-Requested-With": "XMLHttpRequest",
  Accept: "application/json, text/javascript, */*; q=0.01",
};

export interface RawEventSeriesEvent {
  id: number;
  description: string;
  startDateTime: string;
  maxQuantity: string;
}

export interface RawEventSeries {
  id: number;
  title: string;
  displayText: string;
  paxQuantity: number;
  events: RawEventSeriesEvent[];
}

export interface RawProductDetails {
  productId: number;
  Success: boolean;
  Price: string;
  PriceValue: number;
  OldPrice: string;
  stockAvailability: string;
  stockError: string;
  PreventSaleMessage: string;
}

function toDdMmYyyy(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

/**
 * The storefront's own JS submits the *entire page's* form state (every
 * product on the page) as `productForm`. Live traffic capture only showed
 * that shape; whether the server accepts a minimal single-product form is
 * unverified until we can test against the live endpoint. Confirm this
 * before relying on it in production.
 */
function buildMinimalProductForm(params: {
  productId: number;
  attributeId: number;
  dateDdMmYyyy: string;
}): string {
  const { productId, attributeId, dateDdMmYyyy } = params;
  const fields = new URLSearchParams({
    [`selected_client_id_${productId}`]: String(productId),
    [`selected_excursion_id_${productId}`]: "",
    [`product_attribute_${attributeId}_proxy`]: dateDdMmYyyy,
    [`addtocart_${productId}.EnteredQuantity`]: "1",
  });
  return fields.toString();
}

/**
 * Calls the undocumented `intouchProductEventSeries/list` endpoint, which
 * returns the bookable time-slot bundles (and their remaining capacity) for
 * a product on a given date. Discovered via live traffic capture on
 * 2026-09-22 (see docs/investigation.md) — no authentication required.
 */
export async function fetchEventSeries(params: {
  productId: number;
  attributeId: number;
  isoDate: string;
  /** Override with a full page-form snapshot if the minimal form is rejected. */
  rawProductForm?: string;
}): Promise<RawEventSeries[]> {
  const dateDdMmYyyy = toDdMmYyyy(params.isoDate);
  const productForm =
    params.rawProductForm ??
    buildMinimalProductForm({
      productId: params.productId,
      attributeId: params.attributeId,
      dateDdMmYyyy,
    });

  const body = new URLSearchParams({
    productId: String(params.productId),
    attributeId: String(params.attributeId),
    isComponentAttribute: "False",
    productForm,
    startDateString: dateDdMmYyyy,
  });

  const res = await fetch(`${BASE_URL}/intouchProductEventSeries/list`, {
    method: "POST",
    headers: BROWSER_HEADERS,
    body,
  });

  if (!res.ok) {
    throw new Error(
      `intouchProductEventSeries/list responded ${res.status} for productId=${params.productId}`,
    );
  }

  return res.json() as Promise<RawEventSeries[]>;
}

/**
 * Calls `shoppingcart/productdetails_attributechange` for current price and
 * stock messaging on a product/date combination.
 */
export async function fetchProductDetails(params: {
  productId: number;
  attributeId: number;
  isoDate: string;
  rawProductForm?: string;
}): Promise<RawProductDetails> {
  const dateDdMmYyyy = toDdMmYyyy(params.isoDate);
  const productForm =
    params.rawProductForm ??
    buildMinimalProductForm({
      productId: params.productId,
      attributeId: params.attributeId,
      dateDdMmYyyy,
    });

  const url = new URL(`${BASE_URL}/shoppingcart/productdetails_attributechange`);
  url.searchParams.set("productId", String(params.productId));
  url.searchParams.set("validateAttributeConditions", "False");
  url.searchParams.set("loadPicture", "True");
  url.searchParams.set("getStockLevel", "True");

  const res = await fetch(url, {
    method: "POST",
    headers: BROWSER_HEADERS,
    body: productForm,
  });

  if (!res.ok) {
    throw new Error(
      `productdetails_attributechange responded ${res.status} for productId=${params.productId}`,
    );
  }

  return res.json() as Promise<RawProductDetails>;
}
