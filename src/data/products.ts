/** Catalogue entries the suites rely on (from GET /entries). */
export const products = {
  samsungGalaxyS6: { id: 1, title: 'Samsung galaxy s6', price: 360 },
  nokiaLumia1520: { id: 2, title: 'Nokia lumia 1520', price: 820 },
  nexus6: { id: 3, title: 'Nexus 6', price: 650 },
  sonyVaioI5: { id: 8, title: 'Sony vaio i5', price: 790 },
} as const;

export type ProductRef = (typeof products)[keyof typeof products];
