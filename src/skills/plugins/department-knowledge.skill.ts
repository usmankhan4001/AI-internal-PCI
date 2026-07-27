import { Injectable, OnModuleInit } from '@nestjs/common';
import { Type, Schema } from '@google/genai';
import { ISkill, SkillContext, SkillTool } from '../interfaces/skill.interface';
import { SkillRegistryService } from '../skill-registry.service';
import { KnowledgeService } from '../../knowledge/knowledge.service';

@Injectable()
export class DepartmentKnowledgeSkill implements ISkill, OnModuleInit {
  readonly id = 'department_knowledge';
  readonly name = 'Company SSOT Knowledge Base Skill';
  readonly description = 'Queries official PCI company knowledge: project brochures, layout maps, floor plans, HR policies, legal rules, construction progress, and payment terms.';

  readonly systemPromptSnippet = `
- **Company Knowledge Base (SSOT)**: Always use search_company_knowledge to answer queries regarding project layout plans, brochures, amenities, specifications, or company background.
- If a user asks for brochures, layout plans, or amenities for Buraq Heights, River Courtyard, Grand Orchard, or Box Park 3, call search_company_knowledge immediately.
  `.trim();

  constructor(
    private readonly registry: SkillRegistryService,
    private readonly knowledgeService: KnowledgeService,
  ) {}

  onModuleInit() {
    this.registry.registerSkill(this);
  }

  isEligible(): boolean {
    return true;
  }

  getTools(): SkillTool[] {
    return [
      {
        declaration: {
          name: 'search_company_knowledge',
          description: 'Search official PCI company knowledge base for project brochures, floor layout plans, amenities, specifications, or payment plan policies.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              query: { type: Type.STRING, description: 'Search question or topic (e.g. Buraq Heights brochure layout plans)' },
              department: { type: Type.STRING, description: 'Optional department filter' },
              project: { type: Type.STRING, description: 'Optional project filter (e.g. Buraq Heights, River Courtyard, Grand Orchard)' },
            },
            required: ['query'],
          } as Schema,
        },
        handler: async (args, context) => {
          let deptFilter = args.department;
          if (deptFilter?.toLowerCase() === 'hr' && context.userRole === 'PUBLIC_CLIENT') {
            return { error: 'Internal HR policies are restricted to authorized team members.' };
          }

          let results = await this.knowledgeService.search(args.query, 6, {
            department: deptFilter,
            project: args.project,
          });

          // Fallback: If filtered search returned no results, retry without rigid project filter
          if (results.length === 0 && args.project) {
            results = await this.knowledgeService.search(`${args.project} ${args.query}`, 6, {
              department: deptFilter,
            });
          }

          return {
            query: args.query,
            matchCount: results.length,
            results: results.map((r) => ({
              category: r.category,
              topic: r.topic,
              content: r.content,
              metadata: r.metadata,
            })),
          };
        },
      },
      {
        declaration: {
          name: 'get_company_departments_overview',
          description: 'Get an overview of available departments and knowledge categories in PCI.',
          parameters: {
            type: Type.OBJECT,
            properties: {},
          } as Schema,
        },
        handler: async () => {
          const stats = await this.knowledgeService.getDepartmentStats();
          return { departments: stats };
        },
      },
    ];
  }
}
