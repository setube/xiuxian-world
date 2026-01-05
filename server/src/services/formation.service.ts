import { AppDataSource } from '../config/database'
import { Character } from '../models/Character'
import {
  FORMATIONS,
  FormationTemplate,
  FormationEffects,
  getFormationById,
  getLearnableFormations,
  FORMATION_TIER_NAMES
} from '../game/constants/formations'

const characterRepository = AppDataSource.getRepository(Character)

export interface FormationStatus {
  // 已学习的阵法
  learnedFormations: FormationInfo[]
  // 可学习的阵法
  availableFormations: FormationInfo[]
  // 当前激活的阵法
  activeFormation: ActiveFormationInfo | null
}

export interface FormationInfo {
  id: string
  name: string
  description: string
  tier: number
  tierName: string
  effects: FormationEffects
  learnCost: { spiritStones: number }
  activationCost: { spiritStones: number; cultivation: number }
  duration: number
  requiredRealmTier: number
  isLearned: boolean
  canLearn: boolean
  canActivate: boolean
}

export interface ActiveFormationInfo extends FormationInfo {
  expiresAt: number
  remainingTime: number
}

/**
 * 阵法服务
 * 管理洞府防护阵法的学习、激活、撤销
 */
class FormationService {
  /**
   * 获取阵法状态
   */
  async getStatus(characterId: string): Promise<FormationStatus> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm']
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    const now = Date.now()
    const realmTier = character.realm?.tier || 1
    const learnedIds = character.learnedFormations || []

    // 检查阵法是否过期
    if (character.activeFormationId && character.formationExpiresAt) {
      if (now > character.formationExpiresAt) {
        // 阵法已过期，自动清除
        character.activeFormationId = null
        character.formationExpiresAt = null
        await characterRepository.save(character)
      }
    }

    // 构建已学习阵法列表
    const learnedFormations: FormationInfo[] = learnedIds
      .map(id => {
        const template = getFormationById(id)
        if (!template) return null
        return this.buildFormationInfo(template, character, learnedIds)
      })
      .filter((f): f is FormationInfo => f !== null)

    // 构建可学习阵法列表（未学习且满足境界要求的）
    const availableFormations: FormationInfo[] = getLearnableFormations(realmTier)
      .filter(t => !learnedIds.includes(t.id))
      .map(t => this.buildFormationInfo(t, character, learnedIds))

    // 构建当前激活阵法信息
    let activeFormation: ActiveFormationInfo | null = null
    if (character.activeFormationId && character.formationExpiresAt) {
      const template = getFormationById(character.activeFormationId)
      if (template) {
        const baseInfo = this.buildFormationInfo(template, character, learnedIds)
        activeFormation = {
          ...baseInfo,
          expiresAt: character.formationExpiresAt,
          remainingTime: Math.max(0, character.formationExpiresAt - now)
        }
      }
    }

    return {
      learnedFormations,
      availableFormations,
      activeFormation
    }
  }

  /**
   * 学习阵法
   */
  async learnFormation(characterId: string, formationId: string): Promise<{ success: boolean; message: string }> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm']
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    const template = getFormationById(formationId)
    if (!template) {
      throw new Error('阵法不存在')
    }

    // 检查是否已学习
    const learnedIds = character.learnedFormations || []
    if (learnedIds.includes(formationId)) {
      throw new Error('已学习该阵法')
    }

    // 检查境界要求
    const realmTier = character.realm?.tier || 1
    if (realmTier < template.requiredRealmTier) {
      throw new Error(`需要达到${this.getRealmName(template.requiredRealmTier)}才能学习此阵法`)
    }

    // 检查灵石
    const cost = template.learnCost.spiritStones
    if (Number(character.spiritStones) < cost) {
      throw new Error(`灵石不足，需要 ${cost} 灵石`)
    }

    // 扣除灵石，学习阵法
    character.spiritStones = Number(character.spiritStones) - cost
    character.learnedFormations = [...learnedIds, formationId]
    await characterRepository.save(character)

    return {
      success: true,
      message: `成功学习【${template.name}】！`
    }
  }

  /**
   * 激活阵法
   */
  async activateFormation(characterId: string, formationId: string): Promise<{ success: boolean; message: string }> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm']
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    const template = getFormationById(formationId)
    if (!template) {
      throw new Error('阵法不存在')
    }

    // 检查是否已学习
    const learnedIds = character.learnedFormations || []
    if (!learnedIds.includes(formationId)) {
      throw new Error('尚未学习该阵法')
    }

    // 检查是否已有激活的阵法
    if (character.activeFormationId) {
      const currentFormation = getFormationById(character.activeFormationId)
      throw new Error(`已激活【${currentFormation?.name || '未知阵法'}】，请先撤阵`)
    }

    // 检查灵石消耗
    const stoneCost = template.activationCost.spiritStones
    if (Number(character.spiritStones) < stoneCost) {
      throw new Error(`灵石不足，需要 ${stoneCost} 灵石`)
    }

    // 检查修为消耗（使用经验值）
    const cultivationCost = template.activationCost.cultivation
    if (Number(character.experience) < cultivationCost) {
      throw new Error(`修为不足，需要 ${cultivationCost} 修为`)
    }

    // 扣除资源，激活阵法
    const now = Date.now()
    const duration = template.duration * 60 * 60 * 1000 // 转换为毫秒

    character.spiritStones = Number(character.spiritStones) - stoneCost
    character.experience = Number(character.experience) - cultivationCost
    character.activeFormationId = formationId
    character.formationExpiresAt = now + duration

    await characterRepository.save(character)

    return {
      success: true,
      message: `成功激活【${template.name}】！持续 ${template.duration} 小时`
    }
  }

  /**
   * 撤销阵法
   */
  async deactivateFormation(characterId: string): Promise<{ success: boolean; message: string }> {
    const character = await characterRepository.findOne({
      where: { id: characterId }
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    if (!character.activeFormationId) {
      throw new Error('当前没有激活的阵法')
    }

    const template = getFormationById(character.activeFormationId)
    const formationName = template?.name || '未知阵法'

    // 清除阵法状态
    character.activeFormationId = null
    character.formationExpiresAt = null
    await characterRepository.save(character)

    return {
      success: true,
      message: `已撤销【${formationName}】`
    }
  }

  /**
   * 获取角色当前生效的阵法效果
   * 供 PvP 战斗时调用
   */
  async getActiveFormationEffects(characterId: string): Promise<FormationEffects | null> {
    const character = await characterRepository.findOne({
      where: { id: characterId }
    })

    if (!character || !character.activeFormationId) {
      return null
    }

    // 检查是否过期
    const now = Date.now()
    if (character.formationExpiresAt && now > character.formationExpiresAt) {
      // 已过期，清除
      character.activeFormationId = null
      character.formationExpiresAt = null
      await characterRepository.save(character)
      return null
    }

    const template = getFormationById(character.activeFormationId)
    return template?.effects || null
  }

  /**
   * 获取所有阵法模板
   */
  getAllFormations(): FormationTemplate[] {
    return FORMATIONS
  }

  /**
   * 构建阵法信息
   */
  private buildFormationInfo(
    template: FormationTemplate,
    character: Character,
    learnedIds: string[]
  ): FormationInfo {
    const realmTier = character.realm?.tier || 1
    const isLearned = learnedIds.includes(template.id)
    const canLearn = !isLearned && realmTier >= template.requiredRealmTier
    const canActivate = isLearned && !character.activeFormationId

    return {
      id: template.id,
      name: template.name,
      description: template.description,
      tier: template.tier,
      tierName: FORMATION_TIER_NAMES[template.tier] || `${template.tier}阶`,
      effects: template.effects,
      learnCost: template.learnCost,
      activationCost: template.activationCost,
      duration: template.duration,
      requiredRealmTier: template.requiredRealmTier,
      isLearned,
      canLearn,
      canActivate
    }
  }

  /**
   * 获取境界名称
   */
  private getRealmName(tier: number): string {
    const names = ['炼气期', '筑基期', '结丹期', '元婴期', '化神期', '炼虚期', '合体期', '大乘期', '渡劫期']
    return names[tier - 1] || `${tier}阶`
  }
}

export const formationService = new FormationService()
