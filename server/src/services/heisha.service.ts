/**
 * 黑煞教魔道禁术服务 - 夺舍魔功、魔染红尘、煞气淬体
 */
import { AppDataSource } from '../config/database'
import { EntityManager } from 'typeorm'
import { Character } from '../models/Character'
import { SoulPuppet } from '../models/SoulPuppet'
import { StolenConsort } from '../models/StolenConsort'
import { Consort } from '../models/Consort'
import {
  HEISHA_SECT_ID,
  SOUL_SEIZE_CONFIG,
  CONSORT_THEFT_CONFIG,
  SHA_ENERGY_CONFIG,
  type HeishaStatus,
  type ShaEnergyStatus,
  type PuppetInfo,
  type StolenConsortInfo,
  type SeizeResult
} from '../game/constants/heisha'
import { STAR_PALACE_SECT_ID } from '../game/constants/starpalace'
import { ERROR_CODES } from '../utils/errorCodes'

const characterRepository = AppDataSource.getRepository(Character)
const soulPuppetRepository = AppDataSource.getRepository(SoulPuppet)
const stolenConsortRepository = AppDataSource.getRepository(StolenConsort)
const consortRepository = AppDataSource.getRepository(Consort)

// ==================== 服务类 ====================

class HeishaService {
  /**
   * 验证是否为黑煞教弟子
   */
  private async validateMember(characterId: string): Promise<Character> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm']
    })

    if (!character) {
      throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
    }

    if (character.sectId !== HEISHA_SECT_ID) {
      throw { code: ERROR_CODES.HEISHA_NOT_MEMBER, message: '只有黑煞教弟子才能使用魔道禁术' }
    }

    return character
  }

  /**
   * 检查角色是否被奴役
   */
  async checkEnslaved(characterId: string): Promise<{ enslaved: boolean; masterName?: string; remainingMs?: number }> {
    const character = await characterRepository.findOne({
      where: { id: characterId }
    })

    if (!character) {
      return { enslaved: false }
    }

    const now = Date.now()
    if (character.enslavedUntil && character.enslavedUntil > now) {
      // 查找主人信息
      let masterName = '未知'
      if (character.enslavedBy) {
        const master = await characterRepository.findOne({
          where: { id: character.enslavedBy }
        })
        if (master) masterName = master.name
      }
      return {
        enslaved: true,
        masterName,
        remainingMs: character.enslavedUntil - now
      }
    }

    // 清理过期的奴役状态
    if (character.enslavedUntil && character.enslavedUntil <= now) {
      character.enslavedUntil = null
      character.enslavedBy = null
      await characterRepository.save(character)
    }

    return { enslaved: false }
  }

  /**
   * 获取黑煞教系统完整状态
   */
  async getStatus(characterId: string): Promise<HeishaStatus> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm']
    })

    if (!character) {
      throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
    }

    const isMember = character.sectId === HEISHA_SECT_ID

    if (!isMember) {
      return {
        isMember: false,
        realm: character.realmId,
        shaEnergy: { current: 0, max: 0, bonusPercent: 0, nextDecay: 0, decayAmount: 0 },
        soulSeize: { canUse: false, cooldownMs: 0, puppetCount: 0, maxPuppets: 0, puppetBonus: 0 },
        consortTheft: { canUse: false, cooldownMs: 0, hasStolenConsort: false },
        extractBuff: { active: false, expiresAt: null, bonus: null }
      }
    }

    const now = Date.now()

    // 清理过期傀儡
    await this.cleanExpiredPuppets()

    // 获取煞气状态
    const shaEnergy = this.getShaEnergyStatus(character)

    // 获取傀儡状态
    const activePuppets = await soulPuppetRepository.find({
      where: { masterId: characterId, status: 'active' }
    })
    const puppetBonus = Math.min(activePuppets.length * SOUL_SEIZE_CONFIG.puppetCombatBonusPercent, SOUL_SEIZE_CONFIG.maxPuppetBonus)

    // 夺舍冷却
    const lastSeizeTime = character.lastSoulSeizeTime ? Number(character.lastSoulSeizeTime) : 0
    const seizeCooldownMs = Math.max(0, SOUL_SEIZE_CONFIG.cooldownMs - (now - lastSeizeTime))
    const canSeize =
      character.realmId >= SOUL_SEIZE_CONFIG.minRealm && seizeCooldownMs === 0 && activePuppets.length < SOUL_SEIZE_CONFIG.maxPuppets

    // 侍妾窃取冷却
    const lastTheftTime = character.lastConsortTheftTime ? Number(character.lastConsortTheftTime) : 0
    const theftCooldownMs = Math.max(0, CONSORT_THEFT_CONFIG.cooldownMs - (now - lastTheftTime))
    const stolenConsort = await stolenConsortRepository.findOne({
      where: { thieverId: characterId, status: 'active' }
    })
    const canTheft = character.realmId >= CONSORT_THEFT_CONFIG.minRealm && theftCooldownMs === 0 && !stolenConsort

    // 强索元阴buff状态
    const extractBuffActive = character.extractBuffExpiresAt && character.extractBuffExpiresAt > now ? true : false
    const extractBonus = extractBuffActive ? character.extractBuff : null

    return {
      isMember: true,
      realm: character.realmId,
      shaEnergy,
      soulSeize: {
        canUse: canSeize,
        cooldownMs: seizeCooldownMs,
        puppetCount: activePuppets.length,
        maxPuppets: SOUL_SEIZE_CONFIG.maxPuppets,
        puppetBonus
      },
      consortTheft: {
        canUse: canTheft,
        cooldownMs: theftCooldownMs,
        hasStolenConsort: !!stolenConsort
      },
      extractBuff: {
        active: extractBuffActive,
        expiresAt: extractBuffActive ? character.extractBuffExpiresAt : null,
        bonus: extractBonus
      }
    }
  }

  // ==================== 煞气系统 ====================

  /**
   * 获取煞气状态
   */
  private getShaEnergyStatus(character: Character): ShaEnergyStatus {
    const now = Date.now()
    const lastDecay = character.lastShaDecayTime ? Number(character.lastShaDecayTime) : 0

    // 计算下次衰减时间（每日衰减）
    const dayMs = 24 * 60 * 60 * 1000
    const nextDecay = lastDecay ? lastDecay + dayMs : now + dayMs

    const bonusPercent = Math.min(character.shaEnergy * SHA_ENERGY_CONFIG.bonusPerPoint, SHA_ENERGY_CONFIG.maxBonusPercent)

    return {
      current: character.shaEnergy,
      max: SHA_ENERGY_CONFIG.maxShaEnergy,
      bonusPercent,
      nextDecay,
      decayAmount: SHA_ENERGY_CONFIG.dailyDecay
    }
  }

  /**
   * 增加煞气
   */
  async addShaEnergy(characterId: string, amount: number): Promise<number> {
    const character = await this.validateMember(characterId)

    character.shaEnergy = Math.min(character.shaEnergy + amount, SHA_ENERGY_CONFIG.maxShaEnergy)
    await characterRepository.save(character)

    return character.shaEnergy
  }

  /**
   * 煞气衰减（定时任务调用）
   */
  async decayShaEnergy(): Promise<number> {
    const now = Date.now()
    const dayMs = 24 * 60 * 60 * 1000

    // 查找需要衰减的黑煞教弟子
    const characters = await characterRepository
      .createQueryBuilder('c')
      .where('c.sectId = :sectId', { sectId: HEISHA_SECT_ID })
      .andWhere('c.shaEnergy > 0')
      .andWhere('(c.lastShaDecayTime IS NULL OR c.lastShaDecayTime < :threshold)', {
        threshold: now - dayMs
      })
      .getMany()

    for (const char of characters) {
      char.shaEnergy = Math.max(0, char.shaEnergy - SHA_ENERGY_CONFIG.dailyDecay)
      char.lastShaDecayTime = now
    }

    if (characters.length > 0) {
      await characterRepository.save(characters)
    }

    return characters.length
  }

  // ==================== 夺舍魔功 ====================

  /**
   * 获取傀儡列表
   */
  async getPuppets(characterId: string): Promise<PuppetInfo[]> {
    await this.validateMember(characterId)

    const now = Date.now()
    const puppets = await soulPuppetRepository.find({
      where: { masterId: characterId, status: 'active' }
    })

    return puppets.map(p => ({
      id: p.id,
      puppetId: p.puppetId,
      puppetName: p.puppetName,
      enslaveStartAt: p.enslaveStartAt,
      enslaveExpiresAt: p.enslaveExpiresAt,
      remainingMs: Math.max(0, p.enslaveExpiresAt - now)
    }))
  }

  /**
   * 发动夺舍
   */
  async soulSeize(characterId: string, targetId: string): Promise<SeizeResult> {
    const character = await this.validateMember(characterId)
    const now = Date.now()

    // 检查自己
    if (characterId === targetId) {
      throw { code: ERROR_CODES.HEISHA_SEIZE_TARGET_SELF, message: '不能对自己施展夺舍魔功' }
    }

    // 检查境界
    if (character.realmId < SOUL_SEIZE_CONFIG.minRealm) {
      throw { code: ERROR_CODES.HEISHA_SEIZE_REALM_LOW, message: `需要筑基期以上才能使用夺舍魔功` }
    }

    // 检查冷却
    const lastSeizeTime = character.lastSoulSeizeTime ? Number(character.lastSoulSeizeTime) : 0
    if (now - lastSeizeTime < SOUL_SEIZE_CONFIG.cooldownMs) {
      throw { code: ERROR_CODES.HEISHA_SEIZE_COOLDOWN, message: '夺舍魔功冷却中' }
    }

    // 检查傀儡数量
    const activePuppets = await soulPuppetRepository.count({
      where: { masterId: characterId, status: 'active' }
    })
    if (activePuppets >= SOUL_SEIZE_CONFIG.maxPuppets) {
      throw { code: ERROR_CODES.HEISHA_SEIZE_MAX_PUPPETS, message: '傀儡数量已满' }
    }

    // 获取目标
    const target = await characterRepository.findOne({
      where: { id: targetId },
      relations: ['realm']
    })

    if (!target) {
      throw { code: ERROR_CODES.HEISHA_TARGET_NOT_FOUND, message: '目标不存在' }
    }

    // 检查同门
    if (target.sectId === HEISHA_SECT_ID) {
      throw { code: ERROR_CODES.HEISHA_SEIZE_TARGET_SAME_SECT, message: '不能对同门使用夺舍魔功' }
    }

    // 检查目标境界
    if (target.realmId > character.realmId) {
      throw { code: ERROR_CODES.HEISHA_SEIZE_TARGET_HIGHER, message: '无法对境界高于自己的目标使用夺舍魔功' }
    }

    // 检查目标是否已被奴役
    if (target.enslavedUntil && target.enslavedUntil > now) {
      throw { code: ERROR_CODES.HEISHA_SEIZE_ALREADY_ENSLAVED, message: '目标已被其他人奴役' }
    }

    // 计算成功率
    const realmDiff = character.realmId - target.realmId
    const successRate = Math.min(95, SOUL_SEIZE_CONFIG.baseSuccessRate + realmDiff * SOUL_SEIZE_CONFIG.realmBonusRate)

    const roll = Math.random() * 100

    // 使用事务保护所有写操作
    return await AppDataSource.transaction(async (manager: EntityManager) => {
      const charRepo = manager.getRepository(Character)
      const puppetRepo = manager.getRepository(SoulPuppet)

      // 锁定角色和目标
      const lockedChar = await charRepo.findOne({
        where: { id: characterId },
        lock: { mode: 'pessimistic_write' }
      })
      const lockedTarget = await charRepo.findOne({
        where: { id: targetId },
        lock: { mode: 'pessimistic_write' }
      })

      if (!lockedChar || !lockedTarget) {
        throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
      }

      // 更新冷却时间
      lockedChar.lastSoulSeizeTime = now

      if (roll <= successRate) {
        // 成功：创建傀儡记录
        const puppet = puppetRepo.create({
          masterId: lockedChar.id,
          masterName: lockedChar.name,
          puppetId: lockedTarget.id,
          puppetName: lockedTarget.name,
          puppetRealmId: lockedTarget.realmId,
          enslaveStartAt: now,
          enslaveExpiresAt: now + SOUL_SEIZE_CONFIG.enslaveDurationMs,
          status: 'active'
        })

        // 更新目标被奴役状态
        lockedTarget.enslavedUntil = now + SOUL_SEIZE_CONFIG.enslaveDurationMs
        lockedTarget.enslavedBy = lockedChar.id

        // 一次性保存所有更改
        await charRepo.save(lockedChar)
        await puppetRepo.save(puppet)
        await charRepo.save(lockedTarget)

        return {
          success: true,
          message: `成功夺舍${lockedTarget.name}！获得傀儡一枚，持续35分钟`,
          puppet: {
            id: puppet.id,
            puppetId: puppet.puppetId,
            puppetName: puppet.puppetName,
            enslaveStartAt: puppet.enslaveStartAt,
            enslaveExpiresAt: puppet.enslaveExpiresAt,
            remainingMs: SOUL_SEIZE_CONFIG.enslaveDurationMs
          }
        }
      } else {
        // 失败：遭受反噬
        const hpLost = Math.floor((lockedChar.hp * SOUL_SEIZE_CONFIG.backlashHpPercent) / 100)
        lockedChar.hp = Math.max(1, lockedChar.hp - hpLost)
        await charRepo.save(lockedChar)

        return {
          success: false,
          message: `夺舍失败！遭受反噬，损失${hpLost}点生命`,
          backlash: {
            hpLost,
            currentHp: lockedChar.hp
          }
        }
      }
    })
  }

  /**
   * 释放傀儡
   */
  async releasePuppet(characterId: string, puppetId: string): Promise<void> {
    await this.validateMember(characterId)

    const puppet = await soulPuppetRepository.findOne({
      where: { id: puppetId, masterId: characterId, status: 'active' }
    })

    if (!puppet) {
      throw { code: ERROR_CODES.HEISHA_PUPPET_NOT_FOUND, message: '傀儡不存在' }
    }

    // 使用事务保护所有写操作
    await AppDataSource.transaction(async (manager: EntityManager) => {
      const charRepo = manager.getRepository(Character)
      const puppetRepo = manager.getRepository(SoulPuppet)

      // 锁定傀儡记录和目标角色
      const lockedPuppet = await puppetRepo.findOne({
        where: { id: puppetId },
        lock: { mode: 'pessimistic_write' }
      })
      const lockedTarget = await charRepo.findOne({
        where: { id: puppet.puppetId },
        lock: { mode: 'pessimistic_write' }
      })

      if (!lockedPuppet) {
        throw { code: ERROR_CODES.HEISHA_PUPPET_NOT_FOUND, message: '傀儡不存在' }
      }

      // 标记傀儡为过期
      lockedPuppet.status = 'expired'
      await puppetRepo.save(lockedPuppet)

      // 清除目标的被奴役状态
      if (lockedTarget && lockedTarget.enslavedBy === characterId) {
        lockedTarget.enslavedUntil = null
        lockedTarget.enslavedBy = null
        await charRepo.save(lockedTarget)
      }
    })
  }

  /**
   * 清理过期傀儡
   */
  async cleanExpiredPuppets(): Promise<number> {
    const now = Date.now()

    // 查找过期的活跃傀儡
    const expiredPuppets = await soulPuppetRepository
      .createQueryBuilder('p')
      .where('p.status = :status', { status: 'active' })
      .andWhere('p.enslaveExpiresAt < :now', { now })
      .getMany()

    if (expiredPuppets.length === 0) {
      return 0
    }

    // 使用事务保护所有写操作
    await AppDataSource.transaction(async (manager: EntityManager) => {
      const charRepo = manager.getRepository(Character)
      const puppetRepo = manager.getRepository(SoulPuppet)

      for (const puppet of expiredPuppets) {
        // 锁定傀儡和目标
        const lockedPuppet = await puppetRepo.findOne({
          where: { id: puppet.id },
          lock: { mode: 'pessimistic_write' }
        })
        const lockedTarget = await charRepo.findOne({
          where: { id: puppet.puppetId },
          lock: { mode: 'pessimistic_write' }
        })

        if (lockedPuppet) {
          lockedPuppet.status = 'expired'
          await puppetRepo.save(lockedPuppet)
        }

        // 清除目标的被奴役状态
        if (lockedTarget && lockedTarget.enslavedBy === puppet.masterId) {
          lockedTarget.enslavedUntil = null
          lockedTarget.enslavedBy = null
          await charRepo.save(lockedTarget)
        }
      }
    })

    return expiredPuppets.length
  }

  // ==================== 魔染红尘（侍妾窃取） ====================

  /**
   * 获取窃取的侍妾
   */
  async getStolenConsort(characterId: string): Promise<StolenConsortInfo | null> {
    await this.validateMember(characterId)

    const now = Date.now()
    const stolen = await stolenConsortRepository.findOne({
      where: { thieverId: characterId, status: 'active' }
    })

    if (!stolen) return null

    // 检查是否过期
    if (stolen.expiresAt < now) {
      await this.returnConsort(stolen)
      return null
    }

    // 检查是否需要重置每日次数
    const todayDate = new Date().toISOString().split('T')[0]
    const lastResetDate = new Date(stolen.lastActionResetAt).toISOString().split('T')[0]
    if (lastResetDate !== todayDate) {
      stolen.brainwashCount = 0
      stolen.extractCount = 0
      stolen.lastActionResetAt = now
      await stolenConsortRepository.save(stolen)
    }

    return {
      id: stolen.id,
      consortId: stolen.consortId,
      consortName: stolen.consortName,
      originalOwnerName: stolen.originalOwnerName,
      stolenAt: stolen.stolenAt,
      expiresAt: stolen.expiresAt,
      remainingMs: Math.max(0, stolen.expiresAt - now),
      brainwashCount: stolen.brainwashCount,
      brainwashMaxCount: CONSORT_THEFT_CONFIG.brainwash.maxCount,
      extractCount: stolen.extractCount,
      extractMaxCount: CONSORT_THEFT_CONFIG.extract.maxCount
    }
  }

  /**
   * 窃取侍妾
   */
  async stealConsort(characterId: string, targetId: string): Promise<StolenConsortInfo> {
    const character = await this.validateMember(characterId)
    const now = Date.now()

    // 检查境界
    if (character.realmId < CONSORT_THEFT_CONFIG.minRealm) {
      throw { code: ERROR_CODES.HEISHA_THEFT_REALM_LOW, message: '需要结丹期以上才能使用魔染红尘' }
    }

    // 检查冷却
    const lastTheftTime = character.lastConsortTheftTime ? Number(character.lastConsortTheftTime) : 0
    if (now - lastTheftTime < CONSORT_THEFT_CONFIG.cooldownMs) {
      throw { code: ERROR_CODES.HEISHA_THEFT_COOLDOWN, message: '魔染红尘冷却中' }
    }

    // 检查是否已有窃取的侍妾
    const existing = await stolenConsortRepository.findOne({
      where: { thieverId: characterId, status: 'active' }
    })
    if (existing) {
      throw { code: ERROR_CODES.HEISHA_THEFT_ALREADY_STOLEN, message: '你已窃取了一位侍妾' }
    }

    // 获取目标
    const target = await characterRepository.findOne({
      where: { id: targetId }
    })

    if (!target) {
      throw { code: ERROR_CODES.HEISHA_TARGET_NOT_FOUND, message: '目标不存在' }
    }

    // 检查目标是否为星宫弟子
    if (target.sectId !== STAR_PALACE_SECT_ID) {
      throw { code: ERROR_CODES.HEISHA_THEFT_TARGET_NOT_STAR, message: '只能窃取星宫弟子的侍妾' }
    }

    // 获取目标的侍妾
    const consort = await consortRepository.findOne({
      where: { characterId: targetId }
    })

    if (!consort) {
      throw { code: ERROR_CODES.HEISHA_THEFT_TARGET_NO_CONSORT, message: '目标没有侍妾' }
    }

    // 检查侍妾是否已被窃取
    const alreadyStolen = await stolenConsortRepository.findOne({
      where: { consortId: consort.id, status: 'active' }
    })
    if (alreadyStolen) {
      throw { code: ERROR_CODES.HEISHA_THEFT_ALREADY_STOLEN, message: '该侍妾已被其他人窃取' }
    }

    // 使用事务保护所有写操作
    return await AppDataSource.transaction(async (manager: EntityManager) => {
      const charRepo = manager.getRepository(Character)
      const stolenRepo = manager.getRepository(StolenConsort)

      // 锁定角色
      const lockedChar = await charRepo.findOne({
        where: { id: characterId },
        lock: { mode: 'pessimistic_write' }
      })

      if (!lockedChar) {
        throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '角色不存在' }
      }

      // 创建窃取记录
      const stolen = stolenRepo.create({
        thieverId: lockedChar.id,
        thieverName: lockedChar.name,
        originalOwnerId: target.id,
        originalOwnerName: target.name,
        consortId: consort.id,
        consortName: consort.name,
        stolenAt: now,
        expiresAt: now + CONSORT_THEFT_CONFIG.stolenDurationMs,
        brainwashCount: 0,
        extractCount: 0,
        lastActionResetAt: now,
        status: 'active'
      })

      // 更新冷却时间
      lockedChar.lastConsortTheftTime = now

      // 一次性保存所有更改
      await stolenRepo.save(stolen)
      await charRepo.save(lockedChar)

      return {
        id: stolen.id,
        consortId: stolen.consortId,
        consortName: stolen.consortName,
        originalOwnerName: stolen.originalOwnerName,
        stolenAt: stolen.stolenAt,
        expiresAt: stolen.expiresAt,
        remainingMs: CONSORT_THEFT_CONFIG.stolenDurationMs,
        brainwashCount: 0,
        brainwashMaxCount: CONSORT_THEFT_CONFIG.brainwash.maxCount,
        extractCount: 0,
        extractMaxCount: CONSORT_THEFT_CONFIG.extract.maxCount
      }
    })
  }

  /**
   * 魔音灌脑 - 获得修为
   */
  async brainwash(characterId: string): Promise<{ cultivationGain: number; remainingCount: number }> {
    await this.validateMember(characterId)

    const stolen = await stolenConsortRepository.findOne({
      where: { thieverId: characterId, status: 'active' }
    })

    if (!stolen) {
      throw { code: ERROR_CODES.HEISHA_NO_STOLEN_CONSORT, message: '你没有窃取的侍妾' }
    }

    // 检查过期
    const now = Date.now()
    if (stolen.expiresAt < now) {
      await this.returnConsort(stolen)
      throw { code: ERROR_CODES.HEISHA_NO_STOLEN_CONSORT, message: '侍妾已归还原主' }
    }

    // 重置每日次数
    const todayDate = new Date().toISOString().split('T')[0]
    const lastResetDate = new Date(stolen.lastActionResetAt).toISOString().split('T')[0]
    let brainwashCount = stolen.brainwashCount
    let extractCount = stolen.extractCount
    let lastActionResetAt = stolen.lastActionResetAt
    if (lastResetDate !== todayDate) {
      brainwashCount = 0
      extractCount = 0
      lastActionResetAt = now
    }

    // 检查次数
    if (brainwashCount >= CONSORT_THEFT_CONFIG.brainwash.maxCount) {
      throw { code: ERROR_CODES.HEISHA_BRAINWASH_LIMIT, message: '今日魔音灌脑次数已用尽' }
    }

    const gain = CONSORT_THEFT_CONFIG.brainwash.cultivationGain

    // 使用事务保护所有写操作
    return await AppDataSource.transaction(async (manager: EntityManager) => {
      const charRepo = manager.getRepository(Character)
      const stolenRepo = manager.getRepository(StolenConsort)

      // 锁定角色和窃取记录
      const lockedChar = await charRepo.findOne({
        where: { id: characterId },
        lock: { mode: 'pessimistic_write' }
      })
      const lockedStolen = await stolenRepo.findOne({
        where: { id: stolen.id },
        lock: { mode: 'pessimistic_write' }
      })

      if (!lockedChar || !lockedStolen) {
        throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '数据不存在' }
      }

      // 增加修为
      lockedChar.experience = Number(lockedChar.experience) + gain

      // 增加使用次数
      lockedStolen.brainwashCount = brainwashCount + 1
      lockedStolen.extractCount = extractCount
      lockedStolen.lastActionResetAt = lastActionResetAt

      // 一次性保存所有更改
      await charRepo.save(lockedChar)
      await stolenRepo.save(lockedStolen)

      return {
        cultivationGain: gain,
        remainingCount: CONSORT_THEFT_CONFIG.brainwash.maxCount - lockedStolen.brainwashCount
      }
    })
  }

  /**
   * 强索元阴 - 获得属性加成
   */
  async extract(characterId: string): Promise<{ bonus: { attack: number; defense: number }; remainingCount: number }> {
    await this.validateMember(characterId)

    const stolen = await stolenConsortRepository.findOne({
      where: { thieverId: characterId, status: 'active' }
    })

    if (!stolen) {
      throw { code: ERROR_CODES.HEISHA_NO_STOLEN_CONSORT, message: '你没有窃取的侍妾' }
    }

    // 检查过期
    const now = Date.now()
    if (stolen.expiresAt < now) {
      await this.returnConsort(stolen)
      throw { code: ERROR_CODES.HEISHA_NO_STOLEN_CONSORT, message: '侍妾已归还原主' }
    }

    // 重置每日次数
    const todayDate = new Date().toISOString().split('T')[0]
    const lastResetDate = new Date(stolen.lastActionResetAt).toISOString().split('T')[0]
    let brainwashCount = stolen.brainwashCount
    let extractCount = stolen.extractCount
    let lastActionResetAt = stolen.lastActionResetAt
    if (lastResetDate !== todayDate) {
      brainwashCount = 0
      extractCount = 0
      lastActionResetAt = now
    }

    // 检查次数
    if (extractCount >= CONSORT_THEFT_CONFIG.extract.maxCount) {
      throw { code: ERROR_CODES.HEISHA_EXTRACT_LIMIT, message: '今日强索元阴次数已用尽' }
    }

    const bonus = CONSORT_THEFT_CONFIG.extract.attributeBonus

    // 使用事务保护所有写操作
    return await AppDataSource.transaction(async (manager: EntityManager) => {
      const charRepo = manager.getRepository(Character)
      const stolenRepo = manager.getRepository(StolenConsort)

      // 锁定角色和窃取记录
      const lockedChar = await charRepo.findOne({
        where: { id: characterId },
        lock: { mode: 'pessimistic_write' }
      })
      const lockedStolen = await stolenRepo.findOne({
        where: { id: stolen.id },
        lock: { mode: 'pessimistic_write' }
      })

      if (!lockedChar || !lockedStolen) {
        throw { code: ERROR_CODES.PLAYER_CHARACTER_NOT_FOUND, message: '数据不存在' }
      }

      // 设置buff
      lockedChar.extractBuff = bonus
      lockedChar.extractBuffExpiresAt = now + CONSORT_THEFT_CONFIG.extract.durationMs

      // 增加使用次数
      lockedStolen.brainwashCount = brainwashCount
      lockedStolen.extractCount = extractCount + 1
      lockedStolen.lastActionResetAt = lastActionResetAt

      // 一次性保存所有更改
      await charRepo.save(lockedChar)
      await stolenRepo.save(lockedStolen)

      return {
        bonus,
        remainingCount: CONSORT_THEFT_CONFIG.extract.maxCount - lockedStolen.extractCount
      }
    })
  }

  /**
   * 归还侍妾
   */
  private async returnConsort(stolen: StolenConsort): Promise<void> {
    stolen.status = 'returned'
    await stolenConsortRepository.save(stolen)
  }

  /**
   * 清理过期的被窃取侍妾
   */
  async cleanExpiredStolenConsorts(): Promise<number> {
    const now = Date.now()

    const expiredStolen = await stolenConsortRepository
      .createQueryBuilder('s')
      .where('s.status = :status', { status: 'active' })
      .andWhere('s.expiresAt < :now', { now })
      .getMany()

    for (const stolen of expiredStolen) {
      stolen.status = 'returned'
    }

    if (expiredStolen.length > 0) {
      await stolenConsortRepository.save(expiredStolen)
    }

    return expiredStolen.length
  }

  /**
   * 获取傀儡战力加成百分比
   */
  async getPuppetBonus(characterId: string): Promise<number> {
    const activePuppets = await soulPuppetRepository.count({
      where: { masterId: characterId, status: 'active' }
    })

    return Math.min(activePuppets * SOUL_SEIZE_CONFIG.puppetCombatBonusPercent, SOUL_SEIZE_CONFIG.maxPuppetBonus)
  }
}

export const heishaService = new HeishaService()
