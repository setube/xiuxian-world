/**
 * 夺宝服务 - 掠夺其他玩家灵石
 */
import { AppDataSource } from '../config/database'
import { Character } from '../models/Character'
import { rankingService } from './ranking.service'
import { formationService } from './formation.service'
import { SPIRIT_ROOTS, getCounterBonus } from '../game/constants/spiritRoots'
import { ERROR_CODES } from '../utils/errorCodes'
import { diplomacyService } from './diplomacy.service'

const characterRepository = AppDataSource.getRepository(Character)

// 夺宝配置
const LOOT_CONFIG = {
  cooldown: 10 * 60 * 1000, // 10分钟冷却
  dailyLimit: 5, // 每日夺宝次数限制
  minRealm: 2, // 最低境界要求（筑基期）
  baseLootPercent: 10, // 基础掠夺比例（%）
  maxLootPercent: 30, // 最大掠夺比例（%）
  minLoot: 100, // 最低掠夺数量
  maxLoot: 100000, // 最高掠夺数量
  evilPointsGain: 10, // 成功掠夺获得恶人值
  powerVariance: 0.15 // 战力随机浮动
}

export interface LootStatus {
  canLoot: boolean
  cooldownRemaining: number
  dailyLoots: number
  maxDailyLoots: number
  lastLootTime: number | null
}

export interface LootTarget {
  id: string
  name: string
  realmTier: number
  realmName: string
  power: number
  spiritStones: number
  sectId: string | null
  sectName: string | null
  hasFormation: boolean
}

export interface LootResult {
  success: boolean
  message: string
  lootedAmount: number
  attackerPower: number
  defenderPower: number
  formationBlocked: boolean
  evilPointsGain: number
}

class LootService {
  /**
   * 获取夺宝状态
   */
  async getStatus(characterId: string): Promise<LootStatus> {
    const character = await characterRepository.findOne({
      where: { id: characterId }
    })

    if (!character) {
      throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
    }

    const now = Date.now()
    const lastTime = character.lastLootTime || 0
    const cooldownRemaining = Math.max(0, LOOT_CONFIG.cooldown - (now - lastTime))

    // 重置每日次数
    await this.resetDailyCountIfNeeded(character)

    return {
      canLoot: cooldownRemaining === 0 && character.dailyLoots < LOOT_CONFIG.dailyLimit,
      cooldownRemaining,
      dailyLoots: character.dailyLoots,
      maxDailyLoots: LOOT_CONFIG.dailyLimit,
      lastLootTime: character.lastLootTime
    }
  }

  /**
   * 获取可掠夺的目标
   */
  async getTargets(characterId: string, limit: number = 20): Promise<LootTarget[]> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm']
    })

    if (!character) {
      throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
    }

    // 获取有灵石的其他玩家
    const targets = await characterRepository
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.realm', 'realm')
      .where('c.id != :characterId', { characterId })
      .andWhere('c.spiritStones > :minStones', { minStones: LOOT_CONFIG.minLoot })
      .andWhere('c.peaceMode = false')
      .orderBy('c.spiritStones', 'DESC')
      .take(limit)
      .getMany()

    return targets.map(t => ({
      id: t.id,
      name: t.name,
      realmTier: t.realm?.tier || 1,
      realmName: this.getRealmName(t.realm?.tier, t.realm?.subTier),
      power: this.calculatePower(t),
      spiritStones: Number(t.spiritStones),
      sectId: t.sectId,
      sectName: this.getSectName(t.sectId),
      hasFormation: !!t.activeFormationId
    }))
  }

  /**
   * 执行夺宝
   */
  async loot(characterId: string, targetId: string): Promise<LootResult> {
    // 验证攻击者
    const attacker = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm']
    })

    if (!attacker) {
      throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
    }

    // 检查自己
    if (characterId === targetId) {
      throw { code: ERROR_CODES.LOOT_TARGET_SELF, message: '不能掠夺自己' }
    }

    // 检查境界
    if ((attacker.realm?.tier || 1) < LOOT_CONFIG.minRealm) {
      throw { code: ERROR_CODES.LOOT_REALM_TOO_LOW, message: '需要达到筑基期才能进行夺宝' }
    }

    // 检查冷却和每日次数
    const now = Date.now()
    const lastTime = attacker.lastLootTime || 0
    if (now - lastTime < LOOT_CONFIG.cooldown) {
      const remaining = Math.ceil((LOOT_CONFIG.cooldown - (now - lastTime)) / 1000)
      throw { code: ERROR_CODES.LOOT_COOLDOWN, message: `夺宝冷却中，请等待 ${remaining} 秒` }
    }

    await this.resetDailyCountIfNeeded(attacker)
    if (attacker.dailyLoots >= LOOT_CONFIG.dailyLimit) {
      throw { code: ERROR_CODES.LOOT_DAILY_LIMIT, message: '今日夺宝次数已用尽' }
    }

    // 验证目标
    const defender = await characterRepository.findOne({
      where: { id: targetId },
      relations: ['realm']
    })

    if (!defender) {
      throw { code: ERROR_CODES.LOOT_TARGET_NOT_FOUND, message: '目标不存在' }
    }

    if (defender.peaceMode) {
      throw { code: ERROR_CODES.LOOT_TARGET_PEACE_MODE, message: '目标处于和平模式，无法掠夺' }
    }

    if (Number(defender.spiritStones) < LOOT_CONFIG.minLoot) {
      throw { code: ERROR_CODES.LOOT_TARGET_NOT_ENOUGH_STONES, message: '目标灵石不足，不值得掠夺' }
    }

    // 计算战力
    let attackerPower = this.calculatePower(attacker)
    let defenderPower = this.calculatePower(defender)

    // 获取外交加成
    const diplomacyBonus = await diplomacyService.getDiplomacyBonus(attacker.sectId, defender.sectId)

    // 应用结盟战力加成（+5%）
    if (diplomacyBonus.attackerPowerBonus > 0) {
      attackerPower = Math.floor(attackerPower * (1 + diplomacyBonus.attackerPowerBonus))
    }
    if (diplomacyBonus.defenderPowerBonus > 0) {
      defenderPower = Math.floor(defenderPower * (1 + diplomacyBonus.defenderPowerBonus))
    }

    // 获取防御方阵法效果
    const formationEffects = await formationService.getActiveFormationEffects(targetId)
    let formationBlocked = false

    if (formationEffects) {
      // 阵法提供防御加成
      defenderPower = Math.floor(defenderPower * (1 + formationEffects.damageReduction / 100))

      // 闪避判定
      if (Math.random() * 100 < formationEffects.dodgeChance) {
        formationBlocked = true
      }
    }

    // 更新攻击者状态
    attacker.lastLootTime = now
    attacker.dailyLoots += 1
    await characterRepository.save(attacker)

    // 如果被阵法阻挡
    if (formationBlocked) {
      return {
        success: false,
        message: `${defender.name}的防护阵法发动，成功闪避了你的掠夺！`,
        lootedAmount: 0,
        attackerPower,
        defenderPower,
        formationBlocked: true,
        evilPointsGain: 0
      }
    }

    // 五行相克加成
    let finalAttackerPower = attackerPower
    const attackerRoot = SPIRIT_ROOTS[attacker.spiritRootId]
    const defenderRoot = SPIRIT_ROOTS[defender.spiritRootId]
    if (attackerRoot && defenderRoot) {
      const counterBonus = getCounterBonus(attackerRoot, defenderRoot)
      if (counterBonus > 0) {
        finalAttackerPower = Math.floor(finalAttackerPower * (1 + counterBonus))
      }
    }

    // 战斗计算
    const attackerActual = finalAttackerPower * (1 + (Math.random() - 0.5) * 2 * LOOT_CONFIG.powerVariance)
    const defenderActual = defenderPower * (1 + (Math.random() - 0.5) * 2 * LOOT_CONFIG.powerVariance)

    // 判定胜负
    if (attackerActual <= defenderActual) {
      return {
        success: false,
        message: `掠夺失败！${defender.name}成功抵御了你的攻击`,
        lootedAmount: 0,
        attackerPower,
        defenderPower,
        formationBlocked: false,
        evilPointsGain: 0
      }
    }

    // 计算掠夺数量
    const powerRatio = attackerActual / defenderActual
    let lootPercent = LOOT_CONFIG.baseLootPercent + (powerRatio - 1) * 10
    lootPercent = Math.min(lootPercent, LOOT_CONFIG.maxLootPercent)

    // 友好关系惩罚：掠夺量-5%
    if (diplomacyBonus.isFriendly) {
      lootPercent = lootPercent * (1 - diplomacyBonus.lootPenalty)
    }

    let lootAmount = Math.floor((Number(defender.spiritStones) * lootPercent) / 100)
    lootAmount = Math.max(LOOT_CONFIG.minLoot, Math.min(LOOT_CONFIG.maxLoot, lootAmount))
    lootAmount = Math.min(lootAmount, Number(defender.spiritStones))

    // 转移灵石
    attacker.spiritStones = Number(attacker.spiritStones) + lootAmount
    defender.spiritStones = Number(defender.spiritStones) - lootAmount

    // 增加恶人值
    attacker.evilPoints += LOOT_CONFIG.evilPointsGain
    attacker.pvpKills += 1

    // 更新掠夺统计
    attacker.totalLootedSpiritStones = Number(attacker.totalLootedSpiritStones) + lootAmount

    await characterRepository.save([attacker, defender])

    return {
      success: true,
      message: `成功掠夺了${defender.name}的${lootAmount}灵石！`,
      lootedAmount: lootAmount,
      attackerPower,
      defenderPower,
      formationBlocked: false,
      evilPointsGain: LOOT_CONFIG.evilPointsGain
    }
  }

  /**
   * 获取夺宝记录（通过排行榜服务获取）
   */
  async getMyLootStats(characterId: string) {
    return rankingService.getPlayerRank(characterId, 'loot')
  }

  /**
   * 重置每日夺宝次数
   */
  private async resetDailyCountIfNeeded(character: Character): Promise<void> {
    const todayDate = new Date().toISOString().split('T')[0]
    const lastResetTime = character.lastLootResetTime ? Number(character.lastLootResetTime) : 0
    const lastResetDate = lastResetTime > 0 ? new Date(lastResetTime).toISOString().split('T')[0] : ''

    if (lastResetDate !== todayDate) {
      character.dailyLoots = 0
      character.lastLootResetTime = Date.now()
      await characterRepository.save(character)
    }
  }

  /**
   * 计算战力
   */
  private calculatePower(character: Character): number {
    const spiritRoot = SPIRIT_ROOTS[character.spiritRootId]
    const combatBonus = spiritRoot?.combatPowerBonus || 0

    const basePower = character.maxHp * 0.5 + character.attack * 3 + character.defense * 2 + character.speed * 1.5 + character.luck * 0.5

    const realmTier = character.realm?.tier || 1
    const realmSubTier = character.realm?.subTier || 1
    const realmBonus = (realmTier - 1) * 100 + (realmSubTier - 1) * 20

    return Math.floor(basePower * (1 + combatBonus / 100) + realmBonus)
  }

  /**
   * 获取境界名称
   */
  private getRealmName(tier?: number, subTier?: number): string {
    const tierNames = ['炼气', '筑基', '结丹', '元婴', '化神', '炼虚', '合体', '大乘', '渡劫']
    const subTierNames = ['初期', '中期', '后期', '圆满']

    const tierName = tierNames[(tier || 1) - 1] || '炼气'
    const subTierName = subTierNames[(subTier || 1) - 1] || '初期'

    return `${tierName}${subTierName}`
  }

  /**
   * 获取宗门名称
   */
  private getSectName(sectId: string | null): string | null {
    if (!sectId) return null

    const sectNames: Record<string, string> = {
      huangfeng: '黄枫谷',
      taiyi: '太一门',
      starpalace: '星宫',
      heisha: '黑煞教',
      wanling: '万灵宗',
      luoyun: '落云宗',
      yuanying: '元婴宗'
    }

    return sectNames[sectId] || null
  }
}

export const lootService = new LootService()
