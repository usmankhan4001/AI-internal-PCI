import { Injectable, OnModuleInit } from '@nestjs/common';
import { Type, Schema } from '@google/genai';
import { ISkill, SkillContext, SkillTool } from '../interfaces/skill.interface';
import { SkillRegistryService } from '../skill-registry.service';
import { KnowledgeService } from '../../knowledge/knowledge.service';

@Injectable()
export class DepartmentKnowledgeSkill implements ISkill, OnModuleInit {
  readonly id = 'department_knowledge';
  readonly name = 'Company SSOT Knowledge Base Skill';
  readonly description = 'Queries official PCI company knowledge: sales scripts, project brochures, HR policies, legal/registry rules, construction progress, and payment plans.';

  readonly systemPromptSnippet = `
- **Company Knowledge Base (SSOT)**: Search structured company knowledge across departments (Sales, Marketing, HR, Legal, Construction, Accounts).
- Provide accurate, verified, policy-backed answers using search_company_knowledge.
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
          description: 'Search official PCI company knowledge base for policies, project specs, floor layouts, payment plans, or FAQs.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              query: { type: Type.STRING, description: 'Search question or topic' },
              department: { type: Type.STRING, description: 'Optional department filter (sales, marketing, hr, legal, projects)' },
              project: { type: Type.STRING, description: 'Optional project filter (River Courtyard, Grand Orchard, Box Park 3, Buraq Heights)' },
            },
            required: ['query'],
          } as Schema,
        },
        handler: async (args, context) => {
          // Security restriction: Don't show HR internal policies to public WhatsApp leads
          let deptFilter = args.department;
          if (deptFilter?.toLowerCase() === 'hr' && context.userRole === 'PUBLIC_CLIENT') {
            return { error: 'Internal HR policies are restricted to authorized team members.' };
          }

          const results = await this.knowledgeService.search(args.query, 5, {
            department: deptFilter,
            project: args.project,
          });

          return {
            query: args.query,
            matchCount: results.length,
            results: results.map((r) => ({
              category: r.category,
              topic: r.topic,
              content: r.content,
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
