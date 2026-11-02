import { apiService } from "../services/apiService";
import type { GroomingService, PetSupply, ShopPet } from "../types";
import { FALLBACK_SUPPLIES } from "../data/fallbackSupplies";

/** Shared in-memory cache so homepage → Pets / Grooming / Supplies feels instant. */

let shopPetsCache: ShopPet[] | null = null;
let shopPetsInflight: Promise<ShopPet[]> | null = null;

let suppliesCache: PetSupply[] | null = null;
let suppliesInflight: Promise<PetSupply[]> | null = null;

let groomingCache: GroomingService[] | null = null;
let groomingInflight: Promise<GroomingService[]> | null = null;

export const getShopPetsCache = (): ShopPet[] | null => shopPetsCache;

export const clearShopPetsCache = () => {
  shopPetsCache = null;
  shopPetsInflight = null;
};

export const prefetchShopPets = async (opts?: {
  force?: boolean;
}): Promise<ShopPet[]> => {
  if (!opts?.force && shopPetsCache) return shopPetsCache;
  if (shopPetsInflight) return shopPetsInflight;

  shopPetsInflight = (async () => {
    try {
      const data = (await apiService.shopPets.getAll()) as ShopPet[];
      shopPetsCache = Array.isArray(data) ? data : [];
      return shopPetsCache;
    } finally {
      shopPetsInflight = null;
    }
  })();

  return shopPetsInflight;
};

export const getSuppliesCache = (): PetSupply[] | null => suppliesCache;

export const clearSuppliesCache = () => {
  suppliesCache = null;
  suppliesInflight = null;
};

export const prefetchSupplies = async (opts?: {
  force?: boolean;
}): Promise<PetSupply[]> => {
  if (!opts?.force && suppliesCache) return suppliesCache;
  if (suppliesInflight) return suppliesInflight;

  suppliesInflight = (async () => {
    try {
      const data = await apiService.supplies.getActive();
      suppliesCache =
        Array.isArray(data) && data.length > 0
          ? (data as PetSupply[])
          : FALLBACK_SUPPLIES;
      return suppliesCache;
    } catch {
      if (!suppliesCache) suppliesCache = FALLBACK_SUPPLIES;
      return suppliesCache;
    } finally {
      suppliesInflight = null;
    }
  })();

  return suppliesInflight;
};

export const getGroomingServicesCache = (): GroomingService[] | null =>
  groomingCache;

export const clearGroomingServicesCache = () => {
  groomingCache = null;
  groomingInflight = null;
};

export const prefetchGroomingServices = async (opts?: {
  force?: boolean;
}): Promise<GroomingService[]> => {
  if (!opts?.force && groomingCache) return groomingCache;
  if (groomingInflight) return groomingInflight;

  groomingInflight = (async () => {
    try {
      const data = await apiService.services.getGroomingServices();
      groomingCache = Array.isArray(data) ? (data as GroomingService[]) : [];
      return groomingCache;
    } finally {
      groomingInflight = null;
    }
  })();

  return groomingInflight;
};

/** Warm caches for the three slow public pages (safe to call on hover). */
export const prefetchPublicPages = () => {
  void prefetchShopPets();
  void prefetchSupplies();
  void prefetchGroomingServices();
};
