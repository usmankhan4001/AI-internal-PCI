import { Injectable, Logger } from '@nestjs/common';
import { FunctionDeclaration } from '@google/genai';
import { ISkill, SkillContext, SkillTool } from './interfaces/skill.interface';

@Injectable()
export class SkillRegistryService {
  private readonly logger = new Logger(SkillRegistryService.name);
  private readonly skills = new Map<string, ISkill>();

  registerSkill(skill: ISkill): void {
    if (this.skills.has(skill.id)) {
      this.logger.warn(`Overwriting skill registration for ID: ${skill.id}`);
    }
    this.skills.set(skill.id, skill);
    this.logger.log(`Registered Skill Plugin: [${skill.id}] - ${skill.name}`);
  }

  getActiveSkills(context: SkillContext): ISkill[] {
    return Array.from(this.skills.values()).filter((skill) =>
      skill.isEligible(context),
    );
  }

  getToolDeclarations(context: SkillContext): FunctionDeclaration[] {
    const activeSkills = this.getActiveSkills(context);
    const declarations: FunctionDeclaration[] = [];

    for (const skill of activeSkills) {
      for (const tool of skill.getTools()) {
        if (tool.allowedRoles && !tool.allowedRoles.includes(context.userRole)) {
          continue;
        }
        if (tool.allowedChannels && !tool.allowedChannels.includes(context.channel)) {
          continue;
        }
        declarations.push(tool.declaration);
      }
    }

    return declarations;
  }

  getSystemPromptSnippets(context: SkillContext): string {
    return this.getActiveSkills(context)
      .map((s) => s.systemPromptSnippet)
      .filter(Boolean)
      .join('\n\n');
  }

  async executeTool(
    toolName: string,
    args: Record<string, any>,
    context: SkillContext,
  ): Promise<any> {
    for (const skill of this.getActiveSkills(context)) {
      const tool = skill.getTools().find((t) => t.declaration.name === toolName);
      if (tool) {
        if (tool.allowedRoles && !tool.allowedRoles.includes(context.userRole)) {
          throw new Error(`Unauthorized tool execution: ${toolName} for role ${context.userRole}`);
        }
        this.logger.log(`Executing tool [${toolName}] from skill [${skill.id}]`);
        return await tool.handler(args, context);
      }
    }
    throw new Error(`Tool handler not found or unauthorized: ${toolName}`);
  }
}
