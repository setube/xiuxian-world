/**
 * 宗门外交系统常量配置
 *
 * 外交状态：
 * - friendly (友好): 善意为先，战利品掉落几率降低5%
 * - hostile (敌对): 战意高涨，额外夺取15%修为和15%宗门贡献
 * - allied (结盟): 盟友的祝福，斗法时基础战力提升5%
 * - neutral (中立): 无特殊影响
 */

import type { DiplomacyStatus } from '../../models/SectDiplomacy'

// ========== 外交配置 ==========

export const DIPLOMACY_CONFIG = {
  // 冷却时间
  statusChangeCooldownMs: 24 * 60 * 60 * 1000, // 24小时冷却
  allianceProposalExpiryMs: 60 * 60 * 1000, // 结盟请求1小时有效期
  alliancePenaltyMs: 72 * 60 * 60 * 1000, // 背盟惩罚72小时

  // 战斗加成
  hostileCultivationBonus: 0.15, // 敌对：+15%修为
  hostileContributionBonus: 0.15, // 敌对：+15%宗门贡献
  friendlyLootPenalty: 0.05, // 友好：-5%掠夺
  alliancePowerBonus: 0.05, // 结盟：+5%战力（被动，只要有盟友即生效）

  // 掌门选举条件
  masterMinRealmTier: 3, // 结丹期 (tier >= 3)
  masterMinRealmSubTier: 3, // 后期 (subTier >= 3，当tier == masterMinRealmTier时)
  masterSelectionHour: 0, // 00:15 上海时间
  masterSelectionMinute: 15
} as const

// ========== 外交状态配置 ==========

export interface DiplomacyStatusInfo {
  id: DiplomacyStatus
  name: string
  description: string
  color: string
  icon: string
}

export const DIPLOMACY_STATUS_CONFIG: Record<DiplomacyStatus, DiplomacyStatusInfo> = {
  friendly: {
    id: 'friendly',
    name: '友好',
    description: '善意为先，战利品掉落几率降低5%',
    color: '#22c55e', // green
    icon: 'Heart'
  },
  hostile: {
    id: 'hostile',
    name: '敌对',
    description: '战意高涨，额外夺取15%修为与15%宗门贡献',
    color: '#ef4444', // red
    icon: 'Swords'
  },
  allied: {
    id: 'allied',
    name: '结盟',
    description: '盟友的祝福，斗法时基础战力永久提升5%',
    color: '#3b82f6', // blue
    icon: 'Handshake'
  },
  neutral: {
    id: 'neutral',
    name: '中立',
    description: '公事公办，无特殊影响',
    color: '#9ca3af', // gray
    icon: 'Minus'
  }
}

// ========== 类型定义 ==========

export interface DiplomacyRelation {
  sectId: string
  sectName: string
  status: DiplomacyStatus
  lastChangedAt: number | null
  canChange: boolean // 是否可以变更（24h冷却）
  cooldownRemainingMs: number | null // 剩余冷却时间
}

export interface PendingAllianceRequest {
  fromSectId: string
  fromSectName: string
  proposedAt: number
  expiresAt: number
  remainingMs: number
}

export interface DiplomacyStatusResponse {
  isMaster: boolean // 是否是掌门
  masterId: string | null
  masterName: string | null
  sectId: string | null
  sectName: string | null
  hasAnyAlliance: boolean // 是否有任何盟友（用于战力加成判断）
  alliancePenaltyUntil: number | null // 背盟惩罚截止时间
  relations: DiplomacyRelation[] // 我方对各宗门的态度
  incomingRelations: DiplomacyRelation[] // 各宗门对我方的态度
  pendingAllianceRequests: PendingAllianceRequest[] // 待处理的结盟请求
}

export interface WorldSituationItem {
  sourceSectId: string
  sourceSectName: string
  targetSectId: string
  targetSectName: string
  status: 'allied' | 'hostile' // 只公开结盟和敌对
  createdAt: number
}

export interface WorldSituationResponse {
  alliances: WorldSituationItem[] // 所有同盟
  hostilities: WorldSituationItem[] // 所有敌对
  lastUpdated: number
}

export interface SetDiplomacyResult {
  success: boolean
  message: string
  newStatus?: DiplomacyStatus
  announcement?: string // 全服公告内容（如有）
}

export interface MasterInfo {
  sectId: string
  sectName: string
  masterId: string | null
  masterName: string | null
  masterExperience: number | null
  masterRealmTier: number | null
  masterRealmSubTier: number | null
  updatedAt: number
}
