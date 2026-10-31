export const getPriceDomain = <T>(data: readonly T[], getValue: (item: T) => number | null) => {
  const prices = data
    .map(getValue)
    .filter((value): value is number => value !== null && Number.isFinite(value));

  if (prices.length === 0) {
    return null;
  }

  let minPrice = Infinity;
  let maxPrice = -Infinity;

  for (const price of prices) {
    minPrice = Math.min(minPrice, price);
    maxPrice = Math.max(maxPrice, price);
  }

  if (minPrice === maxPrice) {
    minPrice -= 1;
    maxPrice += 1;
  }

  return {
    prices,
    maxPrice,
    minPrice,
  }
};
