import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AVAILABLE_VALUE,
  PROP,
  BitrixEnum,
  CatalogProduct,
  NormalizedUnit,
  ProductDetail,
  UnitFilter,
} from './types';

const num = (s?: string) => Number(String(s ?? '').replace(/,/g, '')) || 0;

/** Simple in-memory cache for slow-changing enum lists (projects, types, floors). */
const enumCache = new Map<string, { at: number; data: BitrixEnum[] }>();
const ENUM_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class BitrixService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BitrixService.name);
  private readonly webhookUrl: string;

  // ── Full inventory cache ──────────────────────────────────────
  private _inventoryCache = new Map<string, NormalizedUnit[]>();
  private _allUnitsFlat: NormalizedUnit[] = [];
  private _cacheReady = false;
  private _cacheAge = 0;
  private _refreshTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private configService: ConfigService) {
    const url = this.configService.get<string>('BITRIX_WEBHOOK_URL') || this.configService.get<string>('BITRIX_API_BASE');
    if (!url) {
      this.logger.warn('BITRIX_WEBHOOK_URL is not defined in the environment. Bitrix integration will fail.');
    }
    this.webhookUrl = url?.replace(/\/$/, '') || '';
  }

  async onApplicationBootstrap() {
    if (this.webhookUrl) {
      await this.warmCache();
      this.startCacheRefresh();
    }
  }

  get cacheReady(): boolean { return this._cacheReady; }
  get cacheAge(): number { return this._cacheAge; }
  get cacheStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const [pid, units] of this._inventoryCache) {
      const proj = units[0]?.projectName ?? pid;
      stats[proj] = units.length;
    }
    return stats;
  }
  get totalCachedUnits(): number { return this._allUnitsFlat.length; }

  private async callApi<T>(method: string, body: unknown = {}, timeoutMs = 30_000): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${this.webhookUrl}/${method}.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Bitrix ${method} -> ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(`Bitrix API Error: ${data.error_description || data.error}`);
      return data as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  /** Fetch properties to extract enum VALUES. Native Bitrix endpoint. */
  private async listPropertyEnums(propertyId: number): Promise<BitrixEnum[]> {
    return this.cachedEnum(`prop-${propertyId}`, async () => {
      const data = await this.callApi<{ result: any[] }>('crm.product.property.list', {
        filter: { ID: propertyId }
      });
      
      const prop = data.result?.[0];
      if (!prop || !prop.VALUES) return [];

      // Bitrix returns VALUES as an object with enum IDs as keys or an array
      const valuesObj = prop.VALUES;
      const enums: BitrixEnum[] = [];
      
      for (const key of Object.keys(valuesObj)) {
        const val = valuesObj[key];
        enums.push({
          id: Number(val.ID),
          value: val.VALUE,
          sort: Number(val.SORT || 0),
          xmlId: val.XML_ID
        });
      }
      
      return enums.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    });
  }

  async listProjects(): Promise<BitrixEnum[]> { return this.listPropertyEnums(PROP.PROJECT); }
  listTypes() { return this.listPropertyEnums(PROP.TYPE); }
  listFloors() { return this.listPropertyEnums(PROP.FLOOR); }
  listCategories() { return this.listPropertyEnums(PROP.CATEGORY); }

  /**
   * Search LIVE units natively. We can filter directly on PROPERTY_X.
   */
  async searchUnits(filter: UnitFilter = {}): Promise<CatalogProduct[]> {
    const nativeFilter: any = {
      // Only available units (if we want to force it at API level, but we usually fetch all in warmup)
    };
    
    if (filter.project) nativeFilter[`PROPERTY_${PROP.PROJECT}`] = filter.project;
    if (filter.propertyType) nativeFilter[`PROPERTY_${PROP.TYPE}`] = filter.propertyType;
    if (filter.propertyCategory) nativeFilter[`PROPERTY_${PROP.CATEGORY}`] = filter.propertyCategory;
    if (filter.propertyFloor) nativeFilter[`PROPERTY_${PROP.FLOOR}`] = filter.propertyFloor;

    const data = await this.callApi<{ result: CatalogProduct[] }>('crm.product.list', {
      filter: nativeFilter,
      select: ["ID", "NAME", "PRICE", `PROPERTY_${PROP.PROJECT}`, `PROPERTY_${PROP.TYPE}`, `PROPERTY_${PROP.CATEGORY}`, `PROPERTY_${PROP.FLOOR}`, `PROPERTY_${PROP.AVAILABILITY}`, `PROPERTY_${PROP.BASE_RATE}`, `PROPERTY_${PROP.GROSS_AREA}`, `PROPERTY_${PROP.NET_AREA}`]
    }, 60_000); 
    
    return data.result ?? [];
  }

  /** Full product detail. */
  async getProduct(productId: string): Promise<ProductDetail | null> {
    try {
      const data = await this.callApi<{ result: ProductDetail }>('crm.product.get', { id: productId }, 15_000);
      return data.result ?? null;
    } catch (err) {
      this.logger.error(`Bitrix getProduct failed for ID ${productId}:`, err);
      return null;
    }
  }

  /**
   * Fetch a unit's detail and normalize it into a bot-friendly shape with
   * resolved project/type/floor names and computed price (baseRate * grossArea).
   */
  async getNormalizedUnit(productId: string): Promise<NormalizedUnit | null> {
    if (this._cacheReady) {
      const cached = this._allUnitsFlat.find(u => u.id === productId);
      if (cached) return cached;
    }

    const [p, projects, types, floors, categories] = await Promise.all([
      this.getProduct(productId),
      this.listProjects(),
      this.listTypes(),
      this.listFloors(),
      this.listCategories(),
    ]);
    if (!p) return null;

    return this.normalizeProduct(p, projects, types, floors, categories);
  }

  private normalizeProduct(
    p: ProductDetail,
    projects: BitrixEnum[],
    types: BitrixEnum[],
    floors: BitrixEnum[],
    categories: BitrixEnum[],
  ): NormalizedUnit {
    const nameOf = (list: BitrixEnum[], id?: string) =>
      list.find((e) => String(e.id) === String(id))?.value;

    const projectId = p[`PROPERTY_${PROP.PROJECT}`]?.valueId || p[`PROPERTY_${PROP.PROJECT}`]?.value;
    const typeId = p[`PROPERTY_${PROP.TYPE}`]?.valueId || p[`PROPERTY_${PROP.TYPE}`]?.value;
    const categoryId = p[`PROPERTY_${PROP.CATEGORY}`]?.valueId || p[`PROPERTY_${PROP.CATEGORY}`]?.value;
    const floorId = p[`PROPERTY_${PROP.FLOOR}`]?.valueId || p[`PROPERTY_${PROP.FLOOR}`]?.value;
    const baseRate = num(p[`PROPERTY_${PROP.BASE_RATE}`]?.value);
    const grossArea = num(p[`PROPERTY_${PROP.GROSS_AREA}`]?.value);
    const netArea = num(p[`PROPERTY_${PROP.NET_AREA}`]?.value);

    const useNetArea =
      projectId === '673' && ['299', '301', '249'].includes(floorId ?? '');
    const areaForPrice = useNetArea ? netArea : grossArea;

    return {
      id: p.ID,
      name: p.NAME,
      projectId,
      projectName: nameOf(projects, projectId),
      typeId,
      typeName: nameOf(types, typeId),
      categoryId,
      categoryName: nameOf(categories, categoryId),
      floorId,
      floorName: nameOf(floors, floorId),
      baseRate,
      grossArea,
      netArea,
      totalPrice: baseRate * areaForPrice,
      available: (p[`PROPERTY_${PROP.AVAILABILITY}`]?.valueId || p[`PROPERTY_${PROP.AVAILABILITY}`]?.value) === AVAILABLE_VALUE,
    };
  }

  // ── Cached search (instant, no API calls) ────────────────────
  searchCached(filter: {
    projectId?: string;
    type?: string;
    floor?: string;
    category?: string;
  }): NormalizedUnit[] {
    if (!this._cacheReady) return [];

    let pool = filter.projectId
      ? this._inventoryCache.get(filter.projectId) ?? []
      : this._allUnitsFlat;

    const fuzzy = (a: string | undefined, b: string) =>
      a ? a.toLowerCase().includes(b.toLowerCase()) || b.toLowerCase().includes(a.toLowerCase()) : false;

    if (filter.type) {
      pool = pool.filter(u => fuzzy(u.typeName, filter.type!));
    }
    if (filter.floor) {
      pool = pool.filter(u => fuzzy(u.floorName, filter.floor!));
    }
    if (filter.category) {
      pool = pool.filter(u => fuzzy(u.categoryName, filter.category!));
    }

    return pool.filter(u => u.available);
  }

  // ── Cache warmup ──────────────────────────────────────────────
  /**
   * Fetch ALL units from Bitrix natively using pagination.
   */
  async warmCache(): Promise<void> {
    const startTime = Date.now();
    this.logger.log('Warming Bitrix inventory cache natively...');

    try {
      const [projects, types, floors, categories] = await Promise.all([
        this.listProjects(),
        this.listTypes(),
        this.listFloors(),
        this.listCategories(),
      ]);

      const newCache = new Map<string, NormalizedUnit[]>();
      let totalUnits = 0;
      let totalAvailable = 0;

      // Bitrix native batch fetching with start token
      let nextStart = 0;
      let keepFetching = true;
      const allRawProducts: ProductDetail[] = [];

      while (keepFetching) {
        const data = await this.callApi<{ result: ProductDetail[], next?: number }>('crm.product.list', {
          start: nextStart,
          select: ["*", "PROPERTY_*"] // Fetch everything for warmup to avoid 1000s of getProduct calls
        });

        const products = data.result || [];
        allRawProducts.push(...products);

        if (data.next) {
          nextStart = data.next;
        } else {
          keepFetching = false;
        }
      }

      for (const p of allRawProducts) {
        const unit = this.normalizeProduct(p, projects, types, floors, categories);
        if (unit.projectId) {
          if (!newCache.has(unit.projectId)) newCache.set(unit.projectId, []);
          newCache.get(unit.projectId)!.push(unit);
        }
        totalUnits++;
        if (unit.available) totalAvailable++;
      }

      this._inventoryCache = newCache;
      this._allUnitsFlat = [...newCache.values()].flat();
      this._cacheReady = true;
      this._cacheAge = Date.now();

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      this.logger.log(
        `Native Inventory cache warm: ${totalAvailable} available / ${totalUnits} total units across ${newCache.size} projects (${elapsed}s)`,
      );
    } catch (err) {
      this.logger.error('Cache warmup failed:', err);
    }
  }

  startCacheRefresh(intervalMs = 10 * 60 * 1000): void {
    if (this._refreshTimer) clearInterval(this._refreshTimer);
    this._refreshTimer = setInterval(() => {
      this.warmCache().catch((e) => this.logger.error('Background cache refresh failed', e));
    }, intervalMs);
  }

  async resolveProjectId(nameOrId: string): Promise<string | null> {
    if (/^\d+$/.test(nameOrId)) return nameOrId;
    const projects = await this.listProjects();
    const q = nameOrId.trim().toLowerCase();

    const hit =
      projects.find((p) => p.value.toLowerCase() === q) ??
      projects.find((p) => p.value.toLowerCase().includes(q));
    return hit ? String(hit.id) : null;
  }

  private async cachedEnum(
    key: string,
    loader: () => Promise<BitrixEnum[]>,
  ): Promise<BitrixEnum[]> {
    const hit = enumCache.get(key);
    if (hit && Date.now() - hit.at < ENUM_TTL_MS) return hit.data;
    try {
      const data = await loader();
      enumCache.set(key, { at: Date.now(), data });
      return data;
    } catch (err) {
      this.logger.error(`Bitrix enum '${key}' fetch failed`, err);
      return hit?.data ?? [];
    }
  }
}
