// Helper module to fetch and cache price list data from the backend

export interface PriceItem {
  Component: string;
  Price: number;
  [key: string]: any;
}

let priceList: PriceItem[] = [];
let loaded = false;

export async function loadPriceList(): Promise<void> {
  if (loaded) return;
  const res = await fetch('/api/pricelist');
  if (!res.ok) throw new Error('Failed to fetch price list');
  priceList = await res.json();
  loaded = true;
}

export function getAllComponents(): string[] {
  return priceList.map(item => item.Component || item.component || item.name);
}

export function getComponentPrice(name: string): number | undefined {
  const item = priceList.find(i => (i.Component || i.component || i.name) === name);
  if (!item) return undefined;
  return Number(item.Price ?? item.price);
}

