import { AppDataSource } from '../config/database'
import { Character } from '../models/Character'
import { DualCultivationSession, SoulBond, HehuanSoulSlave, SoulBattle } from '../models/DualCultivation'
import {
  HEHUAN_SECT_ID,
  BASIC_DUAL_CULTIVATION,
  SOUL_BOND,
  NOURISH_CULTIVATION,
  SOUL_IMPRINT,
  HARVEST_CULTIVATION,
  ESCAPE_SOUL_IMPRINT,
  meetsRealmRequirement,
  calculateRealmDifference,
  calculateSoulBattleSuccessRate,
  calculateEscapeSuccessRate,
  DualCultivationResult,
  SoulBattleResult,
  EscapeResult
} from '../game/constants/hehuanDualCultivation'
import { LessThan, MoreThan } from 'typeorm'
import { COOLDOWN_REDUCTION } from '../game/constants/fengxi'

const characterRepository = AppDataSource.getRepository(Character)
const sessionRepository = AppDataSource.getRepository(DualCultivationSession)
const bondRepository = AppDataSource.getRepository(SoulBond)
const slaveRepository = AppDataSource.getRepository(HehuanSoulSlave)
const battleRepository = AppDataSource.getRepository(SoulBattle)

class DualCultivationService {
  // ==================== 第一层：凡尘缘 (闭关双修) ====================

  /**
   * 发起闭关双修邀请
   */
  async inviteBasicDualCultivation(
    initiatorId: string,
    partnerId: string
  ): Promise<{ success: boolean; message: string; sessionId?: string }> {
    const initiator = await characterRepository.findOne({
      where: { id: initiatorId },
      relations: ['realm']
    })

    const partner = await characterRepository.findOne({
      where: { id: partnerId },
      relations: ['realm']
    })

    if (!initiator || !partner) {
      return { success: false, message: '角色不存在' }
    }

    // 检查是否对自己发起
    if (initiatorId === partnerId) {
      return { success: false, message: '不能对自己发起双修' }
    }

    // 检查发起者是否被奴役
    if (initiator.enslavedBy) {
      return { success: false, message: '身陷心印，无法发起双修' }
    }

    // 检查境界要求
    if (
      !meetsRealmRequirement(
        initiator.realm.tier,
        initiator.realm.subTier,
        BASIC_DUAL_CULTIVATION.minRealmTier,
        BASIC_DUAL_CULTIVATION.minRealmSubTier
      )
    ) {
      return { success: false, message: '需要达到炼气四层才能使用闭关双修' }
    }

    if (
      !meetsRealmRequirement(
        partner.realm.tier,
        partner.realm.subTier,
        BASIC_DUAL_CULTIVATION.minRealmTier,
        BASIC_DUAL_CULTIVATION.minRealmSubTier
      )
    ) {
      return { success: false, message: '对方境界不足，需要达到炼气四层' }
    }

    // 检查是否有待处理的邀请
    const pendingSession = await sessionRepository.findOne({
      where: [
        { initiatorId, status: 'pending', expiresAt: MoreThan(Date.now()) },
        { partnerId: initiatorId, status: 'pending', expiresAt: MoreThan(Date.now()) }
      ]
    })

    if (pendingSession) {
      return { success: false, message: '已有待处理的双修邀请' }
    }

    // 检查冷却时间（风雷翅装备时缩减30%）
    const lastSession = await sessionRepository.findOne({
      where: { initiatorId, status: 'completed' },
      order: { endedAt: 'DESC' }
    })

    if (lastSession && lastSession.endedAt) {
      const baseCooldown = BASIC_DUAL_CULTIVATION.cooldownMs
      const cooldownReduction = initiator.windThunderWingsEquipped ? COOLDOWN_REDUCTION.dualCultivation.reduction : 0
      const actualCooldown = Math.floor(baseCooldown * (1 - cooldownReduction))
      const cooldownEnd = lastSession.endedAt + actualCooldown
      if (Date.now() < cooldownEnd) {
        const remaining = Math.ceil((cooldownEnd - Date.now()) / 60000)
        return { success: false, message: `双修冷却中，还需 ${remaining} 分钟` }
      }
    }

    // 创建邀请
    const session = sessionRepository.create({
      initiatorId,
      partnerId,
      cultivationType: 'basic',
      status: 'pending',
      expiresAt: Date.now() + BASIC_DUAL_CULTIVATION.inviteExpiresMs
    })

    await sessionRepository.save(session)

    return { success: true, message: '已发送双修邀请', sessionId: session.id }
  }

  /**
   * 接受双修邀请
   */
  async acceptDualCultivation(sessionId: string, partnerId: string): Promise<DualCultivationResult> {
    const session = await sessionRepository.findOne({
      where: { id: sessionId, partnerId, status: 'pending' },
      relations: ['initiator', 'partner', 'initiator.realm', 'partner.realm']
    })

    if (!session) {
      return { success: false, message: '邀请不存在或已过期' }
    }

    if (session.expiresAt && Date.now() > session.expiresAt) {
      session.status = 'expired'
      await sessionRepository.save(session)
      return { success: false, message: '邀请已过期' }
    }

    // 更新状态
    session.status = 'accepted'
    session.startedAt = Date.now()
    await sessionRepository.save(session)

    // 计算收益
    const result = await this.executeDualCultivation(session)

    return result
  }

  /**
   * 执行双修（计算收益）
   */
  private async executeDualCultivation(session: DualCultivationSession): Promise<DualCultivationResult> {
    const initiator = await characterRepository.findOne({
      where: { id: session.initiatorId },
      relations: ['realm']
    })

    const partner = await characterRepository.findOne({
      where: { id: session.partnerId },
      relations: ['realm']
    })

    if (!initiator || !partner) {
      return { success: false, message: '角色数据异常' }
    }

    let baseExp = BASIC_DUAL_CULTIVATION.baseExpGain
    let enlightenmentChance = BASIC_DUAL_CULTIVATION.enlightenmentChance

    // 根据双修类型调整
    if (session.cultivationType === 'nourish') {
      baseExp = NOURISH_CULTIVATION.baseExpGain
      enlightenmentChance = NOURISH_CULTIVATION.enlightenmentChance
    }

    // 计算发起者收益
    let initiatorExp = baseExp
    if (initiator.sectId === HEHUAN_SECT_ID) {
      const bonus = session.cultivationType === 'nourish' ? NOURISH_CULTIVATION.hehuanBonus : BASIC_DUAL_CULTIVATION.hehuanBonus
      initiatorExp = Math.floor(baseExp * (1 + bonus))
    }

    // 计算参与者收益
    let partnerExp = baseExp
    if (partner.sectId === HEHUAN_SECT_ID) {
      const bonus = session.cultivationType === 'nourish' ? NOURISH_CULTIVATION.hehuanBonus : BASIC_DUAL_CULTIVATION.hehuanBonus
      partnerExp = Math.floor(baseExp * (1 + bonus))
    }

    // 同参加成
    if (session.cultivationType === 'nourish') {
      const bond = await this.getActiveBond(initiator.id, partner.id)
      if (bond) {
        initiatorExp = Math.floor(initiatorExp * (1 + NOURISH_CULTIVATION.bondBonus))
        partnerExp = Math.floor(partnerExp * (1 + NOURISH_CULTIVATION.bondBonus))
      }
    }

    // 顿悟判定
    const hadEnlightenment = Math.random() < enlightenmentChance
    if (hadEnlightenment) {
      const multiplier =
        session.cultivationType === 'nourish' ? NOURISH_CULTIVATION.enlightenmentMultiplier : BASIC_DUAL_CULTIVATION.enlightenmentMultiplier
      initiatorExp = Math.floor(initiatorExp * multiplier)
      partnerExp = Math.floor(partnerExp * multiplier)
    }

    // 更新角色修为
    initiator.experience = Number(initiator.experience) + initiatorExp
    partner.experience = Number(partner.experience) + partnerExp

    await characterRepository.save([initiator, partner])

    // 更新双修记录
    session.status = 'completed'
    session.endedAt = Date.now()
    session.initiatorExpGain = initiatorExp
    session.partnerExpGain = partnerExp
    session.hadEnlightenment = hadEnlightenment

    await sessionRepository.save(session)

    // 宗门贡献
    let contributionGain = 0
    if (session.cultivationType === 'nourish') {
      contributionGain = NOURISH_CULTIVATION.contributionGain
      if (initiator.sectId === HEHUAN_SECT_ID) {
        initiator.sectContribution += contributionGain
        await characterRepository.save(initiator)
      }
      if (partner.sectId === HEHUAN_SECT_ID) {
        partner.sectContribution += contributionGain
        await characterRepository.save(partner)
      }

      // 更新同参记录
      const bond = await this.getActiveBond(initiator.id, partner.id)
      if (bond) {
        bond.nourishCount++
        bond.totalContributionGain += contributionGain * 2
        await bondRepository.save(bond)
      }
    }

    return {
      success: true,
      message: hadEnlightenment ? '双修大成！触发顿悟！' : '双修完成',
      initiatorExpGain: initiatorExp,
      partnerExpGain: partnerExp,
      hadEnlightenment,
      contributionGain
    }
  }

  // ==================== 第二层：同参道 (缔结同参) ====================

  /**
   * 发起缔结同参邀请
   */
  async inviteSoulBond(initiatorId: string, partnerId: string): Promise<{ success: boolean; message: string; bondId?: string }> {
    const initiator = await characterRepository.findOne({
      where: { id: initiatorId },
      relations: ['realm']
    })

    const partner = await characterRepository.findOne({
      where: { id: partnerId },
      relations: ['realm']
    })

    if (!initiator || !partner) {
      return { success: false, message: '角色不存在' }
    }

    // 检查是否对自己发起
    if (initiatorId === partnerId) {
      return { success: false, message: '不能与自己缔结同参' }
    }

    // 检查发起者是否被奴役
    if (initiator.enslavedBy) {
      return { success: false, message: '身陷心印，无法缔结同参' }
    }

    // 只有合欢宗弟子可以发起
    if (initiator.sectId !== HEHUAN_SECT_ID) {
      return { success: false, message: '只有合欢宗弟子才能缔结同参' }
    }

    // 检查境界要求
    if (!meetsRealmRequirement(initiator.realm.tier, initiator.realm.subTier, SOUL_BOND.minRealmTier, SOUL_BOND.minRealmSubTier)) {
      return { success: false, message: '需要达到筑基初期才能缔结同参' }
    }

    // 检查是否已有活跃的同参关系
    const activeBond = await bondRepository.findOne({
      where: [
        { initiatorId, status: 'active' },
        { partnerId: initiatorId, status: 'active' }
      ]
    })

    if (activeBond) {
      return { success: false, message: '已有活跃的同参契约' }
    }

    // 检查对方是否已有同参
    const partnerBond = await bondRepository.findOne({
      where: [
        { initiatorId: partnerId, status: 'active' },
        { partnerId, status: 'active' }
      ]
    })

    if (partnerBond) {
      return { success: false, message: '对方已有同参契约' }
    }

    // 创建邀请
    const bond = bondRepository.create({
      initiatorId,
      partnerId,
      status: 'pending',
      inviteExpiresAt: Date.now() + SOUL_BOND.inviteExpiresMs
    })

    await bondRepository.save(bond)

    return { success: true, message: '已发送同参契约邀请', bondId: bond.id }
  }

  /**
   * 接受同参契约
   */
  async acceptSoulBond(bondId: string, partnerId: string): Promise<{ success: boolean; message: string }> {
    const bond = await bondRepository.findOne({
      where: { id: bondId, partnerId, status: 'pending' }
    })

    if (!bond) {
      return { success: false, message: '邀请不存在' }
    }

    if (bond.inviteExpiresAt && Date.now() > bond.inviteExpiresAt) {
      bond.status = 'expired'
      await bondRepository.save(bond)
      return { success: false, message: '邀请已过期' }
    }

    bond.status = 'active'
    bond.bondStartedAt = Date.now()
    bond.bondExpiresAt = Date.now() + SOUL_BOND.bondDurationMs

    await bondRepository.save(bond)

    return { success: true, message: '同参契约已缔结，有效期7天' }
  }

  /**
   * 获取活跃的同参关系
   */
  async getActiveBond(char1Id: string, char2Id: string): Promise<SoulBond | null> {
    const now = Date.now()

    const bond = await bondRepository.findOne({
      where: [
        { initiatorId: char1Id, partnerId: char2Id, status: 'active', bondExpiresAt: MoreThan(now) },
        { initiatorId: char2Id, partnerId: char1Id, status: 'active', bondExpiresAt: MoreThan(now) }
      ]
    })

    return bond
  }

  /**
   * 发起双修温养（需要同参关系）
   */
  async initiateNourishCultivation(initiatorId: string): Promise<{ success: boolean; message: string; sessionId?: string }> {
    const initiator = await characterRepository.findOne({
      where: { id: initiatorId },
      relations: ['realm']
    })

    if (!initiator) {
      return { success: false, message: '角色不存在' }
    }

    // 检查发起者是否被奴役
    if (initiator.enslavedBy) {
      return { success: false, message: '身陷心印，无法发起温养' }
    }

    if (initiator.sectId !== HEHUAN_SECT_ID) {
      return { success: false, message: '只有合欢宗弟子才能使用双修温养' }
    }

    // 查找活跃的同参
    const bond = await bondRepository.findOne({
      where: [
        { initiatorId, status: 'active', bondExpiresAt: MoreThan(Date.now()) },
        { partnerId: initiatorId, status: 'active', bondExpiresAt: MoreThan(Date.now()) }
      ]
    })

    if (!bond) {
      return { success: false, message: '需要先缔结同参契约' }
    }

    const partnerId = bond.initiatorId === initiatorId ? bond.partnerId : bond.initiatorId

    // 检查冷却（风雷翅装备时缩减30%）
    const lastSession = await sessionRepository.findOne({
      where: { initiatorId, cultivationType: 'nourish', status: 'completed' },
      order: { endedAt: 'DESC' }
    })

    if (lastSession && lastSession.endedAt) {
      const baseCooldown = NOURISH_CULTIVATION.cooldownMs
      const cooldownReduction = initiator.windThunderWingsEquipped ? COOLDOWN_REDUCTION.dualCultivation.reduction : 0
      const actualCooldown = Math.floor(baseCooldown * (1 - cooldownReduction))
      const cooldownEnd = lastSession.endedAt + actualCooldown
      if (Date.now() < cooldownEnd) {
        const remaining = Math.ceil((cooldownEnd - Date.now()) / 60000)
        return { success: false, message: `温养冷却中，还需 ${remaining} 分钟` }
      }
    }

    // 创建双修会话
    const session = sessionRepository.create({
      initiatorId,
      partnerId,
      cultivationType: 'nourish',
      status: 'pending',
      expiresAt: Date.now() + BASIC_DUAL_CULTIVATION.inviteExpiresMs
    })

    await sessionRepository.save(session)

    return { success: true, message: '已发送温养邀请给同参道友', sessionId: session.id }
  }

  // ==================== 第三层：魔染道 (种下心印 & 双修采补) ====================

  /**
   * 发起心神之战（尝试种下心印）
   */
  async initiateSoulBattle(attackerId: string, targetId: string): Promise<SoulBattleResult> {
    const attacker = await characterRepository.findOne({
      where: { id: attackerId },
      relations: ['realm']
    })

    const target = await characterRepository.findOne({
      where: { id: targetId },
      relations: ['realm']
    })

    if (!attacker || !target) {
      return { success: false, attackerWon: false, message: '角色不存在', battleLog: [] }
    }

    // 检查是否对自己发起
    if (attackerId === targetId) {
      return { success: false, attackerWon: false, message: '不能对自己发起心神之战', battleLog: [] }
    }

    // 只有合欢宗弟子可以发起
    if (attacker.sectId !== HEHUAN_SECT_ID) {
      return { success: false, attackerWon: false, message: '只有合欢宗弟子才能使用心印秘法', battleLog: [] }
    }

    // 检查境界要求
    if (!meetsRealmRequirement(attacker.realm.tier, attacker.realm.subTier, SOUL_IMPRINT.minRealmTier, SOUL_IMPRINT.minRealmSubTier)) {
      return { success: false, attackerWon: false, message: '需要达到金丹初期才能使用心印秘法', battleLog: [] }
    }

    // 检查目标境界不能高于自己
    const realmDiff = calculateRealmDifference(attacker.realm.tier, attacker.realm.subTier, target.realm.tier, target.realm.subTier)
    if (realmDiff < 0) {
      return { success: false, attackerWon: false, message: '不能对境界高于自己的修士使用心印秘法', battleLog: [] }
    }

    // 检查目标是否已被奴役
    if (target.enslavedBy) {
      return { success: false, attackerWon: false, message: '目标已被其他修士奴役', battleLog: [] }
    }

    // 检查目标和平模式
    if (target.peaceMode) {
      return { success: false, attackerWon: false, message: '目标处于和平模式', battleLog: [] }
    }

    // 检查当前炉鼎数量
    const currentSlaves = await slaveRepository.count({
      where: { masterId: attackerId, status: 'active', expiresAt: MoreThan(Date.now()) }
    })

    if (currentSlaves >= SOUL_IMPRINT.maxSlaves) {
      return { success: false, attackerWon: false, message: `已达到炉鼎上限（${SOUL_IMPRINT.maxSlaves}个）`, battleLog: [] }
    }

    // 检查冷却
    const lastBattle = await battleRepository.findOne({
      where: { attackerId },
      order: { createdAt: 'DESC' }
    })

    if (lastBattle) {
      const cooldownEnd = new Date(lastBattle.createdAt).getTime() + SOUL_IMPRINT.cooldownMs
      if (Date.now() < cooldownEnd) {
        const remaining = Math.ceil((cooldownEnd - Date.now()) / 3600000)
        return { success: false, attackerWon: false, message: `心印秘法冷却中，还需 ${remaining} 小时`, battleLog: [] }
      }
    }

    // 执行心神之战
    const successRate = calculateSoulBattleSuccessRate(attacker.realm.tier, attacker.realm.subTier, target.realm.tier, target.realm.subTier)

    const battleLog: string[] = []
    battleLog.push(`${attacker.name} 对 ${target.name} 发动心神之战`)
    battleLog.push(`成功率: ${(successRate * 100).toFixed(1)}%`)

    const roll = Math.random()
    const attackerWon = roll < successRate

    battleLog.push(attackerWon ? '心神之战成功！' : '心神之战失败...')

    // 记录战斗
    const battle = battleRepository.create({
      attackerId,
      targetId,
      result: attackerWon ? 'attacker_win' : 'target_win',
      battleLogJson: JSON.stringify(battleLog),
      enslavementSuccess: attackerWon
    })

    await battleRepository.save(battle)

    // 如果成功，创建奴役关系
    if (attackerWon) {
      const slave = slaveRepository.create({
        masterId: attackerId,
        slaveId: targetId,
        status: 'active',
        enslavedAt: Date.now(),
        expiresAt: Date.now() + SOUL_IMPRINT.enslaveDurationMs
      })

      await slaveRepository.save(slave)

      // 更新目标的奴役状态
      target.enslavedBy = attackerId
      target.enslavedUntil = Date.now() + SOUL_IMPRINT.enslaveDurationMs
      await characterRepository.save(target)

      battleLog.push(`${target.name} 已成为炉鼎，持续3天`)
    } else {
      // 心神之战失败惩罚：攻击者损失修为，目标获得部分修为
      const penaltyExp = SOUL_IMPRINT.failurePenaltyExp
      const targetGain = SOUL_IMPRINT.failureTargetGain

      attacker.experience = Math.max(0, Number(attacker.experience) - penaltyExp)
      target.experience = Number(target.experience) + targetGain

      await characterRepository.save([attacker, target])

      battleLog.push(`心神反噬！损失 ${penaltyExp} 修为`)
      battleLog.push(`${target.name} 获得 ${targetGain} 修为`)
    }

    return {
      success: true,
      attackerWon,
      message: attackerWon ? '心印种下成功！' : `心神之战失败，损失 ${SOUL_IMPRINT.failurePenaltyExp} 修为`,
      battleLog,
      enslavementSuccess: attackerWon
    }
  }

  /**
   * 采补炉鼎
   */
  async harvestSlave(masterId: string, slaveId: string): Promise<{ success: boolean; message: string; expGain?: number }> {
    const slave = await slaveRepository.findOne({
      where: { masterId, slaveId, status: 'active', expiresAt: MoreThan(Date.now()) }
    })

    if (!slave) {
      return { success: false, message: '该炉鼎不存在或已失效' }
    }

    // 检查冷却
    if (slave.lastHarvestTime) {
      const cooldownEnd = slave.lastHarvestTime + HARVEST_CULTIVATION.cooldownMs
      if (Date.now() < cooldownEnd) {
        const remaining = Math.ceil((cooldownEnd - Date.now()) / 60000)
        return { success: false, message: `采补冷却中，还需 ${remaining} 分钟` }
      }
    }

    const master = await characterRepository.findOne({
      where: { id: masterId },
      relations: ['realm']
    })

    const victim = await characterRepository.findOne({
      where: { id: slaveId },
      relations: ['realm']
    })

    if (!master || !victim) {
      return { success: false, message: '角色数据异常' }
    }

    // 计算采补收益
    let expGain = HARVEST_CULTIVATION.harvestExpBase
    expGain += (victim.realm.tier - 1) * HARVEST_CULTIVATION.bonusPerRealmTier

    if (master.sectId === HEHUAN_SECT_ID) {
      expGain = Math.floor(expGain * (1 + HARVEST_CULTIVATION.hehuanBonus))
    }

    // 更新修为
    master.experience = Number(master.experience) + expGain
    victim.experience = Math.max(0, Number(victim.experience) - Math.floor(expGain * 0.5)) // 炉鼎损失一半

    await characterRepository.save([master, victim])

    // 更新采补记录
    slave.harvestCount++
    slave.totalHarvestedExp += expGain
    slave.lastHarvestTime = Date.now()

    await slaveRepository.save(slave)

    return {
      success: true,
      message: `采补成功，获得 ${expGain} 点修为`,
      expGain
    }
  }

  /**
   * 炉鼎尝试挣脱心印
   */
  async attemptEscape(slaveId: string): Promise<EscapeResult> {
    const slaveRecord = await slaveRepository.findOne({
      where: { slaveId, status: 'active', expiresAt: MoreThan(Date.now()) }
    })

    if (!slaveRecord) {
      return { success: false, escaped: false, message: '你并未被奴役' }
    }

    const slave = await characterRepository.findOne({
      where: { id: slaveId },
      relations: ['realm']
    })

    if (!slave) {
      return { success: false, escaped: false, message: '角色数据异常' }
    }

    // 计算挣脱成功率
    const escapeRate = calculateEscapeSuccessRate(slaveRecord.harvestCount, slaveRecord.escapeAttempts)

    const roll = Math.random()
    const escaped = roll < escapeRate

    slaveRecord.escapeAttempts++

    if (escaped) {
      // 挣脱成功
      slaveRecord.status = 'escaped'
      await slaveRepository.save(slaveRecord)

      // 清除奴役状态
      slave.enslavedBy = null
      slave.enslavedUntil = null
      await characterRepository.save(slave)

      return {
        success: true,
        escaped: true,
        message: '成功挣脱心印束缚！'
      }
    } else {
      // 挣脱失败，被采补一次作为惩罚
      await slaveRepository.save(slaveRecord)

      if (ESCAPE_SOUL_IMPRINT.failurePenalty) {
        const master = await characterRepository.findOne({
          where: { id: slaveRecord.masterId },
          relations: ['realm']
        })

        if (master) {
          let expLoss = HARVEST_CULTIVATION.harvestExpBase
          slave.experience = Math.max(0, Number(slave.experience) - expLoss)
          master.experience = Number(master.experience) + Math.floor(expLoss * 0.5)

          await characterRepository.save([slave, master])

          slaveRecord.harvestCount++
          slaveRecord.totalHarvestedExp += Math.floor(expLoss * 0.5)
          await slaveRepository.save(slaveRecord)

          return {
            success: true,
            escaped: false,
            message: '挣脱失败，反被采补！',
            harvestPenalty: true,
            expLost: expLoss
          }
        }
      }

      return {
        success: true,
        escaped: false,
        message: '挣脱失败...'
      }
    }
  }

  // ==================== 查询方法 ====================

  /**
   * 获取角色的炉鼎列表
   */
  async getSlaves(masterId: string) {
    return slaveRepository.find({
      where: { masterId, status: 'active', expiresAt: MoreThan(Date.now()) },
      relations: ['slave', 'slave.realm']
    })
  }

  /**
   * 获取角色的待处理邀请
   */
  async getPendingInvites(characterId: string) {
    const sessions = await sessionRepository.find({
      where: { partnerId: characterId, status: 'pending', expiresAt: MoreThan(Date.now()) },
      relations: ['initiator']
    })

    const bonds = await bondRepository.find({
      where: { partnerId: characterId, status: 'pending', inviteExpiresAt: MoreThan(Date.now()) },
      relations: ['initiator']
    })

    return { sessions, bonds }
  }

  /**
   * 获取角色的同参信息
   */
  async getBondInfo(characterId: string) {
    const bond = await bondRepository.findOne({
      where: [
        { initiatorId: characterId, status: 'active', bondExpiresAt: MoreThan(Date.now()) },
        { partnerId: characterId, status: 'active', bondExpiresAt: MoreThan(Date.now()) }
      ],
      relations: ['initiator', 'partner', 'initiator.realm', 'partner.realm']
    })

    return bond
  }

  /**
   * 检查并清理过期的奴役关系
   */
  async cleanupExpiredEnslaves() {
    const now = Date.now()

    // 查找过期的奴役关系
    const expiredSlaves = await slaveRepository.find({
      where: { status: 'active', expiresAt: LessThan(now) }
    })

    for (const slave of expiredSlaves) {
      slave.status = 'expired'
      await slaveRepository.save(slave)

      // 清除角色的奴役状态
      const character = await characterRepository.findOne({
        where: { id: slave.slaveId }
      })

      if (character && character.enslavedBy === slave.masterId) {
        character.enslavedBy = null
        character.enslavedUntil = null
        await characterRepository.save(character)
      }
    }

    return expiredSlaves.length
  }

  /**
   * 检查并清理过期的同参契约
   */
  async cleanupExpiredBonds() {
    const now = Date.now()

    // 查找过期的同参契约
    const expiredBonds = await bondRepository.find({
      where: { status: 'active', bondExpiresAt: LessThan(now) }
    })

    for (const bond of expiredBonds) {
      bond.status = 'expired'
      await bondRepository.save(bond)
    }

    return expiredBonds.length
  }

  /**
   * 执行所有过期清理任务
   */
  async runCleanupTasks() {
    const slavesCleared = await this.cleanupExpiredEnslaves()
    const bondsCleared = await this.cleanupExpiredBonds()
    return { slavesCleared, bondsCleared }
  }
}

export const dualCultivationService = new DualCultivationService()
