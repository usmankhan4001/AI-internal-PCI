import { FunctionDeclaration } from '@google/genai';

export enum UserRole {
  PUBLIC_CLIENT = 'PUBLIC_CLIENT',
  SALES_AGENT = 'SALES_AGENT',
  HR_STAFF = 'HR_STAFF',
  LEGAL_OFFICER = 'LEGAL_OFFICER',
  SITE_ENGINEER = 'SITE_ENGINEER',
  ADMIN = 'ADMIN',
}

export enum ChannelType {
  WHATSAPP_CLIENT = 'WHATSAPP_CLIENT',
  WHATSAPP_INTERNAL = 'WHATSAPP_INTERNAL',
  TEAM_CHAT = 'TEAM_CHAT',
}

export interface SkillContext {
  userId: string;
  userRole: UserRole;
  channel: ChannelType;
  phoneNumber?: string;
  bitrixContactId?: string;
  department?: string;
  metadata?: Record<string, any>;
}

export interface SkillTool {
  declaration: FunctionDeclaration;
  handler: (args: Record<string, any>, context: SkillContext) => Promise<any>;
  allowedRoles?: UserRole[];
  allowedChannels?: ChannelType[];
}

export interface ISkill {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly systemPromptSnippet?: string;
  
  /** Determines if this skill should be active for a specific call context */
  isEligible(context: SkillContext): boolean;

  /** Returns all tools provided by this skill */
  getTools(): SkillTool[];
}
