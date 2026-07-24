import { Injectable, OnModuleInit } from '@nestjs/common';
import { Type, Schema } from '@google/genai';
import { ISkill, SkillContext, SkillTool } from '../interfaces/skill.interface';
import { SkillRegistryService } from '../skill-registry.service';
import { BitrixService } from '../../bitrix/bitrix.service';
import { UnitStatus } from '../../bitrix/types';

@Injectable()
export class InventorySkill implements ISkill, OnModuleInit {
  readonly id = 'inventory_management';
  readonly name = 'PCI Project Inventory & Availability Skill';
  readonly description = 'Provides live inventory tracking, unit availability, hold/sold status breakdown, and unit pricing details from Bitrix24 CRM.';

  readonly systemPromptSnippet = `
- **Bitrix Inventory Knowledge**: Real-time access to PCI real-estate unit inventory.
- You can query unit status (*Available*, *Hold*, *Sold*), filter by floor or property type (Commercial/Residential), and provide exact pricing calculations.
- Always communicate prices in PKR formatted nicely (e.g., 25,000,000 PKR or 2.5 Crore PKR).
  `.trim();

  constructor(
    private readonly registry: SkillRegistryService,
    private readonly bitrixService: BitrixService,
  ) {}

  onModuleInit() {
    this.registry.registerSkill(this);
  }

  isEligible(): boolean {
    return true; // Available across all roles and channels
  }

  getTools(): SkillTool[] {
    return [
      {
        declaration: {
          name: 'get_inventory_summary',
          description: 'Get inventory stats breakdown (Total Units, Available, On Hold, Sold) across all PCI projects or for a specific project.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              projectName: { type: Type.STRING, description: 'Optional project name filter (e.g., Box Park 2, River Courtyard, Grand Orchard)' },
            },
          } as Schema,
        },
        handler: async (args) => {
          let pid: string | null = null;
          if (args.projectName) {
            pid = await this.bitrixService.resolveProjectId(args.projectName);
          }

          const units = this.bitrixService.searchCached({
            projectId: pid || undefined,
            includeUnavailable: true,
          });

          const total = units.length;
          const available = units.filter((u) => u.status === 'AVAILABLE').length;
          const hold = units.filter((u) => u.status === 'HOLD').length;
          const sold = units.filter((u) => u.status === 'SOLD').length;

          return {
            projectName: args.projectName || 'All PCI Projects',
            totalUnits: total,
            availableUnits: available,
            holdUnits: hold,
            soldUnits: sold,
            cacheReady: this.bitrixService.cacheReady,
          };
        },
      },
      {
        declaration: {
          name: 'search_units',
          description: 'Search PCI property inventory by project, property type (COMMERCIAL/RESIDENTIAL), floor, status (AVAILABLE/HOLD/SOLD), or unit name.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              projectName: { type: Type.STRING, description: 'Project name (e.g. River Courtyard, Grand Orchard, Box Park 3)' },
              propertyType: { type: Type.STRING, description: 'COMMERCIAL or RESIDENTIAL' },
              floor: { type: Type.STRING, description: 'Floor name (e.g., 1st Floor, Ground Floor, 2nd Floor)' },
              status: { type: Type.STRING, description: 'AVAILABLE, HOLD, or SOLD' },
              unitName: { type: Type.STRING, description: 'Specific unit identifier (e.g. RCY-102)' },
            },
          } as Schema,
        },
        handler: async (args) => {
          let pid: string | null = null;
          if (args.projectName) {
            pid = await this.bitrixService.resolveProjectId(args.projectName);
          }

          const units = this.bitrixService.searchCached({
            projectId: pid || undefined,
            type: args.propertyType,
            floor: args.floor,
            status: args.status as UnitStatus,
            unitName: args.unitName,
            includeUnavailable: !!args.status,
          });

          return {
            count: units.length,
            units: units.slice(0, 15).map((u) => ({
              id: u.id,
              name: u.name,
              project: u.projectName,
              type: u.typeName,
              floor: u.floorName,
              grossAreaSqFt: u.grossArea,
              baseRatePkr: u.baseRate,
              totalPricePkr: u.totalPrice,
              status: u.status,
            })),
          };
        },
      },
      {
        declaration: {
          name: 'get_unit_details',
          description: 'Get full pricing, area, and status details for a specific unit ID or unit name.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              unitIdOrName: { type: Type.STRING, description: 'Unit ID or Name (e.g., RCY-101 or unit ID string)' },
            },
            required: ['unitIdOrName'],
          } as Schema,
        },
        handler: async (args) => {
          const unit = await this.bitrixService.getNormalizedUnit(args.unitIdOrName);
          if (!unit) {
            // Try searching by name in cached inventory
            const hits = this.bitrixService.searchCached({
              unitName: args.unitIdOrName,
              includeUnavailable: true,
            });
            if (hits.length > 0) {
              const u = hits[0];
              return {
                id: u.id,
                name: u.name,
                project: u.projectName,
                type: u.typeName,
                floor: u.floorName,
                grossArea: u.grossArea,
                netArea: u.netArea,
                baseRate: u.baseRate,
                totalPrice: u.totalPrice,
                status: u.status,
              };
            }
            return { error: `Unit '${args.unitIdOrName}' not found in Bitrix catalog.` };
          }

          return {
            id: unit.id,
            name: unit.name,
            project: unit.projectName,
            type: unit.typeName,
            floor: unit.floorName,
            grossArea: unit.grossArea,
            netArea: unit.netArea,
            baseRate: unit.baseRate,
            totalPrice: unit.totalPrice,
            status: unit.status,
          };
        },
      },
    ];
  }
}
