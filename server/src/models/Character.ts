import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { User } from './User'
import { Realm } from './Realm'

@Entity('characters')
export class Character {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid' })
  userId!: string

  @ManyToOne(() => User, user => user.characters)
  @JoinColumn({ name: 'userId' })
  user!: User

  @Column({ type: 'varchar', length: 50, unique: true })
  name!: string

  // 灵根
  @Column({ type: 'varchar', length: 50, default: 'mortal_root' })
  spiritRootId!: string

  // 基础属性
  @Column({ type: 'int', default: 1 })
  level!: number

  @Column({ type: 'bigint', default: 0 })
  experience!: number

  @Column({ type: 'bigint', default: 0 })
  spiritStones!: number // 灵石（货币）

  // 境界相关
  @Column({ type: 'int', default: 1 })
  realmId!: number

  @ManyToOne(() => Realm)
  @JoinColumn({ name: 'realmId' })
  realm!: Realm

  @Column({ type: 'int', default: 0 })
  realmProgress!: number // 当前境界修炼进度 (0-100)

  // 战斗属性
  @Column({ type: 'int', default: 100 })
  hp!: number

  @Column({ type: 'int', default: 100 })
  maxHp!: number

  @Column({ type: 'int', default: 50 })
  mp!: number // 灵力

  @Column({ type: 'int', default: 50 })
  maxMp!: number

  @Column({ type: 'int', default: 10 })
  attack!: number

  @Column({ type: 'int', default: 5 })
  defense!: number

  @Column({ type: 'int', default: 10 })
  speed!: number

  @Column({ type: 'int', default: 1 })
  luck!: number // 幸运值

  // 修炼状态
  @Column({ type: 'boolean', default: false })
  isCultivating!: boolean

  @Column({ type: 'timestamp', nullable: true })
  cultivationStartedAt!: Date | null

  @Column({ type: 'uuid', nullable: true })
  currentSkillId!: string | null // 当前修炼的功法

  // 闭关冷却
  @Column({ type: 'bigint', nullable: true })
  lastCultivationTime!: number | null

  @Column({ type: 'int', default: 600000 })
  currentCooldown!: number // 当前冷却时间（毫秒）

  // 深度闭关
  @Column({ type: 'bigint', nullable: true })
  deepCultivationStartTime!: number | null

  @Column({ type: 'bigint', nullable: true })
  deepCultivationEndTime!: number | null

  @Column({ type: 'bigint', nullable: true })
  lastDeepCultivationTime!: number | null

  // 万兽渊探渊冷却
  @Column({ type: 'bigint', nullable: true })
  lastAbyssExploreTime!: number | null

  // 活跃度系统
  @Column({ type: 'int', default: 30 })
  activityPoints!: number

  @Column({ type: 'text', default: '{}' })
  activityHistory!: string // JSON字符串

  @Column({ type: 'varchar', length: 20, nullable: true })
  lastActivityReset!: string | null

  // 丹毒
  @Column({ type: 'text', default: '[]' })
  poisonStacks!: string // JSON字符串

  // 和平模式
  @Column({ type: 'boolean', default: false })
  peaceMode!: boolean

  // 离线时间（被动修炼）
  @Column({ type: 'bigint', nullable: true })
  lastOnlineTime!: number | null

  // 最后活跃时间（用于判断在线状态）
  @Column({ type: 'bigint', nullable: true })
  lastActiveAt!: number | null

  // 宗门系统
  @Column({ type: 'varchar', length: 50, nullable: true })
  sectId!: string | null // 所属宗门ID

  @Column({ type: 'varchar', length: 20, default: 'outer' })
  sectRank!: string // 宗门职位: outer/inner/core/elder/master

  @Column({ type: 'int', default: 0 })
  sectContribution!: number // 宗门贡献度

  @Column({ type: 'bigint', nullable: true })
  sectJoinedAt!: number | null // 加入宗门时间

  @Column({ type: 'bigint', nullable: true })
  lastSalaryTime!: number | null // 上次领取俸禄时间

  @Column({ type: 'bigint', nullable: true })
  sectLeaveCooldownEnd!: number | null // 叛门冷却结束时间

  // 宗门点卯
  @Column({ type: 'bigint', nullable: true })
  lastCheckInTime!: number | null // 上次点卯时间

  @Column({ type: 'int', default: 0 })
  checkInStreak!: number // 连续点卯天数

  // 宗门传功
  @Column({ type: 'bigint', nullable: true })
  lastTeachTime!: number | null // 上次传功时间

  @Column({ type: 'int', default: 0 })
  teachCountToday!: number // 今日传功次数

  // 宗门宝库购买记录
  @Column({ type: 'text', default: '{}' })
  treasuryPurchaseRecordJson!: string // JSON字符串

  // 宝库购买记录getter/setter
  get treasuryPurchaseRecord(): Record<string, { daily: number; total: number; lastDate: string }> {
    try {
      return JSON.parse(this.treasuryPurchaseRecordJson || '{}')
    } catch {
      return {}
    }
  }

  set treasuryPurchaseRecord(value: Record<string, { daily: number; total: number; lastDate: string }>) {
    this.treasuryPurchaseRecordJson = JSON.stringify(value)
  }

  // 宗门悬赏数据
  @Column({ type: 'text', default: '{}' })
  bountyDataJson!: string // JSON字符串

  // 储物袋容量
  @Column({ type: 'int', default: 30 })
  inventoryCapacity!: number // 初始30格，可扩容

  // 已学习的配方列表
  @Column({ type: 'text', default: '[]' })
  learnedRecipesJson!: string // JSON字符串

  // 已学习配方getter/setter
  get learnedRecipes(): string[] {
    try {
      return JSON.parse(this.learnedRecipesJson || '[]')
    } catch {
      return []
    }
  }

  set learnedRecipes(value: string[]) {
    this.learnedRecipesJson = JSON.stringify(value)
  }

  // ========== 药园系统 (黄枫谷专属) ==========

  // 已解锁普通灵田数量 (初始3块，最多8块)
  @Column({ type: 'int', default: 3 })
  herbGardenUnlocked!: number

  // 是否为丹道长老 (解锁长老灵田)
  @Column({ type: 'boolean', default: false })
  isAlchemyElder!: boolean

  // 上次事件生成时间
  @Column({ type: 'bigint', nullable: true })
  lastGardenEventTime!: number | null

  // 今日探索次数 (洞天寻宝)
  @Column({ type: 'int', default: 0 })
  dailyExploreCount!: number

  // 上次探索日期 (用于重置每日次数)
  @Column({ type: 'varchar', length: 20, nullable: true })
  lastExploreDate!: string | null

  // 当前探索状态 (战斗中的状态保存)
  @Column({ type: 'text', nullable: true })
  currentExploreJson!: string | null

  // 探索状态getter/setter
  get currentExplore(): {
    inCombat: boolean
    monster?: {
      id: string
      name: string
      currentHp: number
      maxHp: number
      attack: number
      defense: number
    }
    playerHp?: number
    round?: number
    plotIndex?: number
  } | null {
    if (!this.currentExploreJson) return null
    try {
      return JSON.parse(this.currentExploreJson)
    } catch {
      return null
    }
  }

  set currentExplore(
    value: {
      inCombat: boolean
      monster?: {
        id: string
        name: string
        currentHp: number
        maxHp: number
        attack: number
        defense: number
      }
      playerHp?: number
      round?: number
      plotIndex?: number
    } | null
  ) {
    this.currentExploreJson = value ? JSON.stringify(value) : null
  }

  // ========== 太一门系统 (太一门专属) ==========

  // 神识点数
  @Column({ type: 'int', default: 0 })
  consciousness!: number

  // 上次引道时间
  @Column({ type: 'bigint', nullable: true })
  lastGuidanceTime!: number | null

  // 当前激活的引道增益元素
  @Column({ type: 'varchar', length: 20, nullable: true })
  activeBuffElement!: string | null // 'metal' | 'wood' | 'water' | 'fire' | 'earth'

  // 增益过期时间
  @Column({ type: 'bigint', nullable: true })
  buffExpiresAt!: number | null

  // 被施加的神识冲击减益 (JSON)
  @Column({ type: 'text', default: '[]' })
  consciousnessDebuffsJson!: string

  // 神识冲击减益getter/setter
  get consciousnessDebuffs(): { sourceCharacterId: string; appliedAt: number; expiresAt: number; failureRateIncrease: number }[] {
    try {
      return JSON.parse(this.consciousnessDebuffsJson || '[]')
    } catch {
      return []
    }
  }

  set consciousnessDebuffs(value: { sourceCharacterId: string; appliedAt: number; expiresAt: number; failureRateIncrease: number }[]) {
    this.consciousnessDebuffsJson = JSON.stringify(value)
  }

  // ========== 星宫系统 (星宫专属) ==========

  // 已解锁引星盘数量 (初始3个，最多6个)
  @Column({ type: 'int', default: 3 })
  starDisksUnlocked!: number

  // 上次使用周天星斗大阵时间
  @Column({ type: 'bigint', nullable: true })
  lastStarArrayTime!: number | null

  // 大阵buff过期时间
  @Column({ type: 'bigint', nullable: true })
  starArrayBuffExpiresAt!: number | null

  // 是否为大阵发起者（影响buff效果）
  @Column({ type: 'boolean', default: false })
  isArrayInitiator!: boolean

  // 上次观星时间
  @Column({ type: 'bigint', nullable: true })
  lastStargazeTime!: number | null

  // 今日观星结果（JSON字符串）
  @Column({ type: 'text', nullable: true })
  stargazeResultJson!: string | null

  // 观星结果getter/setter
  get stargazeResult(): {
    type: string
    name: string
    description: string
    bonus?: { cultivation?: number; dropRate?: number }
    penalty?: { cultivation?: number; eventChance?: number }
    generatedAt: number
  } | null {
    if (!this.stargazeResultJson) return null
    try {
      return JSON.parse(this.stargazeResultJson)
    } catch {
      return null
    }
  }

  set stargazeResult(
    value: {
      type: string
      name: string
      description: string
      bonus?: { cultivation?: number; dropRate?: number }
      penalty?: { cultivation?: number; eventChance?: number }
      generatedAt: number
    } | null
  ) {
    this.stargazeResultJson = value ? JSON.stringify(value) : null
  }

  // 上次改命时间
  @Column({ type: 'bigint', nullable: true })
  lastChangeFateTime!: number | null

  // ========== 黑煞教系统 (黑煞教专属) ==========

  // 煞气值 (0-100)
  @Column({ type: 'int', default: 0 })
  shaEnergy!: number

  // 上次煞气衰减时间
  @Column({ type: 'bigint', nullable: true })
  lastShaDecayTime!: number | null

  // 上次夺舍时间
  @Column({ type: 'bigint', nullable: true })
  lastSoulSeizeTime!: number | null

  // 上次窃取侍妾时间
  @Column({ type: 'bigint', nullable: true })
  lastConsortTheftTime!: number | null

  // 强索元阴buff过期时间
  @Column({ type: 'bigint', nullable: true })
  extractBuffExpiresAt!: number | null

  // 强索元阴buff数据（JSON）
  @Column({ type: 'text', nullable: true })
  extractBuffJson!: string | null

  // 强索元阴buff getter/setter
  get extractBuff(): { attack: number; defense: number } | null {
    if (!this.extractBuffJson) return null
    try {
      return JSON.parse(this.extractBuffJson)
    } catch {
      return null
    }
  }

  set extractBuff(value: { attack: number; defense: number } | null) {
    this.extractBuffJson = value ? JSON.stringify(value) : null
  }

  // ========== PvP系统 ==========

  // 今日发起PvP挑战次数
  @Column({ type: 'int', default: 0 })
  dailyPvpChallenges!: number

  // 上次PvP次数重置时间
  @Column({ type: 'bigint', nullable: true })
  lastPvpResetTime!: number | null

  // 恶人值（PvP击杀、掠夺积累）
  @Column({ type: 'int', default: 0 })
  evilPoints!: number

  // PvP击杀数
  @Column({ type: 'int', default: 0 })
  pvpKills!: number

  // 总掠夺灵石数
  @Column({ type: 'bigint', default: 0 })
  totalLootedSpiritStones!: number

  // ========== 阵法系统 ==========

  // 已学习的阵法ID列表（JSON字符串）
  @Column({ type: 'text', default: '[]' })
  learnedFormationsJson!: string

  // 已学习阵法getter/setter
  get learnedFormations(): string[] {
    try {
      return JSON.parse(this.learnedFormationsJson || '[]')
    } catch {
      return []
    }
  }

  set learnedFormations(value: string[]) {
    this.learnedFormationsJson = JSON.stringify(value)
  }

  // 当前激活的阵法ID
  @Column({ type: 'varchar', length: 50, nullable: true })
  activeFormationId!: string | null

  // 阵法过期时间
  @Column({ type: 'bigint', nullable: true })
  formationExpiresAt!: number | null

  // ========== 木人阁系统 ==========

  // 上次木人阁切磋时间
  @Column({ type: 'bigint', nullable: true })
  lastWoodenDummyTime!: number | null

  // ========== 夺宝系统 ==========

  // 上次夺宝时间
  @Column({ type: 'bigint', nullable: true })
  lastLootTime!: number | null

  // 今日夺宝次数
  @Column({ type: 'int', default: 0 })
  dailyLoots!: number

  // 上次夺宝次数重置时间
  @Column({ type: 'bigint', nullable: true })
  lastLootResetTime!: number | null

  // ========== 被奴役状态（所有玩家通用） ==========

  // 被奴役结束时间（null表示未被奴役）
  @Column({ type: 'bigint', nullable: true })
  enslavedUntil!: number | null

  // 被谁奴役（奴役者角色ID）
  @Column({ type: 'uuid', nullable: true })
  enslavedBy!: string | null

  // ========== 万灵宗系统 (万灵宗专属) ==========

  // 上次寻觅灵兽时间
  @Column({ type: 'bigint', nullable: true })
  lastBeastSearchTime!: number | null

  // 今日寻觅次数
  @Column({ type: 'int', default: 0 })
  dailyBeastSearches!: number

  // 上次寻觅日期（用于重置每日次数）
  @Column({ type: 'varchar', length: 20, nullable: true })
  lastBeastSearchDate!: string | null

  // 上次偷菜时间
  @Column({ type: 'bigint', nullable: true })
  lastBeastRaidTime!: number | null

  // 今日偷菜次数
  @Column({ type: 'int', default: 0 })
  dailyBeastRaids!: number

  // 上次偷菜日期（用于重置每日次数）
  @Column({ type: 'varchar', length: 20, nullable: true })
  lastBeastRaidDate!: string | null

  // ========== 落云宗系统 (落云宗专属) ==========

  // 是否已使用灵眼之液升级灵根（终身仅限一次）
  @Column({ type: 'boolean', default: false })
  lingyanLiquidUsedForRoot!: boolean

  // 叛教惩罚结束时间
  @Column({ type: 'bigint', nullable: true })
  luoyunBetrayalPenaltyUntil!: number | null

  // 灵眼之液催熟灵草buff过期时间
  @Column({ type: 'bigint', nullable: true })
  lingyanLiquidHerbBuffExpires!: number | null

  // ========== 元婴宗系统 (元婴宗专属) ==========

  // 上次问道寻真时间
  @Column({ type: 'bigint', nullable: true })
  lastSeekTruthTime!: number | null

  // 青元剑诀残篇收集状态 (JSON: { upper: bool, middle: bool, lower: bool })
  @Column({ type: 'text', default: '{}' })
  greenSwordFragmentsJson!: string

  // 青元剑诀残篇getter/setter
  get greenSwordFragments(): { upper: boolean; middle: boolean; lower: boolean } {
    try {
      const data = JSON.parse(this.greenSwordFragmentsJson || '{}')
      return {
        upper: data.upper || false,
        middle: data.middle || false,
        lower: data.lower || false
      }
    } catch {
      return { upper: false, middle: false, lower: false }
    }
  }

  set greenSwordFragments(value: { upper: boolean; middle: boolean; lower: boolean }) {
    this.greenSwordFragmentsJson = JSON.stringify(value)
  }

  // 是否已领悟青元剑诀
  @Column({ type: 'boolean', default: false })
  greenSwordMastered!: boolean

  // 悬赏数据getter/setter
  get bountyData(): {
    activeBounties: { bountyId: string; progress: number; acceptedAt: number; status: string }[]
    completedBountyIds: string[]
    lastResetDate: string
  } {
    try {
      return JSON.parse(this.bountyDataJson || '{"activeBounties":[],"completedBountyIds":[],"lastResetDate":""}')
    } catch {
      return { activeBounties: [], completedBountyIds: [], lastResetDate: '' }
    }
  }

  set bountyData(value: {
    activeBounties: { bountyId: string; progress: number; acceptedAt: number; status: string }[]
    completedBountyIds: string[]
    lastResetDate: string
  }) {
    this.bountyDataJson = JSON.stringify(value)
  }

  // ========== 试炼古塔系统 ==========

  // 当前所在层数（0表示未进入古塔）
  @Column({ type: 'int', default: 0 })
  towerCurrentFloor!: number

  // 历史最高层数
  @Column({ type: 'int', default: 0 })
  towerBestFloor!: number

  // 今日免费挑战次数
  @Column({ type: 'int', default: 0 })
  towerDailyAttempts!: number

  // 今日重置次数
  @Column({ type: 'int', default: 0 })
  towerDailyResets!: number

  // 上次古塔挑战日期（用于重置每日次数）
  @Column({ type: 'varchar', length: 20, nullable: true })
  lastTowerDate!: string | null

  // 已首通的层数（JSON数组）
  @Column({ type: 'text', default: '[]' })
  towerClearedFloorsJson!: string

  get towerClearedFloors(): number[] {
    try {
      return JSON.parse(this.towerClearedFloorsJson || '[]')
    } catch {
      return []
    }
  }

  set towerClearedFloors(value: number[]) {
    this.towerClearedFloorsJson = JSON.stringify(value)
  }

  // ========== 天道法则系统 ==========

  // 南宫婉奇遇状态
  @Column({ type: 'boolean', default: false })
  nangongWanActive!: boolean

  @Column({ type: 'bigint', nullable: true })
  nangongWanStartTime!: number | null

  @Column({ type: 'bigint', nullable: true })
  nangongWanEndTime!: number | null

  @Column({ type: 'bigint', default: 0 })
  nangongWanStoredExp!: number // 储存的修为

  @Column({ type: 'int', default: 1 })
  nangongWanOriginalTier!: number // 原境界tier

  @Column({ type: 'int', default: 1 })
  nangongWanOriginalSubTier!: number // 原境界subTier

  @Column({ type: 'int', nullable: true })
  nangongWanOriginalRealmId!: number | null // 原境界ID

  // 世界事件Buff/Debuff
  @Column({ type: 'text', default: '[]' })
  worldEventBuffsJson!: string

  get worldEventBuffs(): { type: string; effectType: string; value: number; expiresAt: number }[] {
    try {
      return JSON.parse(this.worldEventBuffsJson || '[]')
    } catch {
      return []
    }
  }

  set worldEventBuffs(value: { type: string; effectType: string; value: number; expiresAt: number }[]) {
    this.worldEventBuffsJson = JSON.stringify(value)
  }

  // ========== 风雷翅装备系统 ==========

  // 是否已炼化风雷翅
  @Column({ type: 'boolean', default: false })
  hasWindThunderWings!: boolean

  // 是否已装备风雷翅
  @Column({ type: 'boolean', default: false })
  windThunderWingsEquipped!: boolean

  // 风雷翅神通反锁结束时间（锁定期间无法卸下）
  @Column({ type: 'bigint', nullable: true })
  windThunderWingsLockedUntil!: number | null

  // 神通反锁原因列表（JSON字符串）
  @Column({ type: 'text', default: '[]' })
  windThunderWingsLockReasonsJson!: string

  // 神通反锁原因getter/setter
  get windThunderWingsLockReasons(): { skillId: string; skillName: string; unlocksAt: number }[] {
    try {
      return JSON.parse(this.windThunderWingsLockReasonsJson || '[]')
    } catch {
      return []
    }
  }

  set windThunderWingsLockReasons(value: { skillId: string; skillName: string; unlocksAt: number }[]) {
    this.windThunderWingsLockReasonsJson = JSON.stringify(value)
  }

  // 风雷降世主动技能冷却结束时间
  @Column({ type: 'bigint', nullable: true })
  windThunderSkillCooldownUntil!: number | null

  // ========== 虚空裂缝探索系统 ==========

  // 上次裂缝探索时间
  @Column({ type: 'bigint', nullable: true })
  lastRiftExploreTime!: number | null

  // 总裂缝探索次数
  @Column({ type: 'int', default: 0 })
  totalRiftExplores!: number

  // ========== 团队副本系统 ==========

  // 当前所在副本房间ID（null表示不在副本中）
  @Column({ type: 'uuid', nullable: true })
  currentDungeonRoomId!: string | null

  // 上次副本完成时间
  @Column({ type: 'bigint', nullable: true })
  lastDungeonTime!: number | null

  // 虚天鼎残片数量
  @Column({ type: 'int', default: 0 })
  xutianDingFragments!: number

  // 虚天殿首通周记录（JSON：记录上次首通日期）
  @Column({ type: 'varchar', length: 20, nullable: true })
  lastDungeonFirstClearWeek!: string | null

  // ========== 丹魔之咒系统 ==========

  // 咒印类型（null表示未被下咒）
  @Column({ type: 'varchar', length: 50, nullable: true })
  curseType!: string | null

  // 施咒者ID
  @Column({ type: 'uuid', nullable: true })
  curseCasterId!: string | null

  // 施咒者名称（用于显示）
  @Column({ type: 'varchar', length: 50, nullable: true })
  curseCasterName!: string | null

  // 咒印施加时间
  @Column({ type: 'bigint', nullable: true })
  curseStartTime!: number | null

  // 咒印过期时间（12小时）
  @Column({ type: 'bigint', nullable: true })
  curseExpiresAt!: number | null

  // 咒印累积吸取的修为（用于收割）
  @Column({ type: 'int', default: 0 })
  curseStoredCultivation!: number

  // 咒印上次扣除修为的时间（每10分钟扣一次）
  @Column({ type: 'bigint', nullable: true })
  curseLastTickTime!: number | null

  // ========== 神魂陨落系统 ==========

  // 神魂动荡状态
  @Column({ type: 'boolean', default: false })
  soulTurbulent!: boolean

  // 神魂动荡过期时间
  @Column({ type: 'bigint', nullable: true })
  soulTurbulentExpiresAt!: number | null

  // 道心破碎状态
  @Column({ type: 'boolean', default: false })
  soulShattered!: boolean

  // 道心破碎过期时间（24小时）
  @Column({ type: 'bigint', nullable: true })
  soulShatteredExpiresAt!: number | null

  // 杀戮值（PvP击杀次数）
  @Column({ type: 'int', default: 0 })
  killCount!: number

  // 仇敌名录（JSON字符串）
  @Column({ type: 'text', default: '[]' })
  enemiesJson!: string

  // 仇敌名录 getter
  get enemies(): { killerId: string; killerName: string; killedAt: number }[] {
    try {
      return JSON.parse(this.enemiesJson || '[]')
    } catch {
      return []
    }
  }

  // 仇敌名录 setter
  set enemies(value: { killerId: string; killerName: string; killedAt: number }[]) {
    this.enemiesJson = JSON.stringify(value)
  }

  // ========== 血魂幡系统 ==========

  // 是否已解锁血魂幡（筑基后解锁）
  @Column({ type: 'boolean', default: false })
  hasBloodSoulBanner!: boolean

  // 魂魄储备（JSON字符串）
  @Column({ type: 'text', default: '{}' })
  soulStorageJson!: string

  // 魂魄储备 getter
  get soulStorage(): Record<string, number> {
    try {
      return JSON.parse(this.soulStorageJson || '{}')
    } catch {
      return {}
    }
  }

  // 魂魄储备 setter
  set soulStorage(value: Record<string, number>) {
    this.soulStorageJson = JSON.stringify(value)
  }

  // 血洗山林每日次数
  @Column({ type: 'int', default: 0 })
  dailyBloodForestRaids!: number

  // 血洗山林上次日期（用于每日重置）
  @Column({ type: 'varchar', length: 20, nullable: true })
  lastBloodForestDate!: string | null

  // 召唤魔影每日次数
  @Column({ type: 'int', default: 0 })
  dailyShadowSummons!: number

  // 召唤魔影上次日期（用于每日重置）
  @Column({ type: 'varchar', length: 20, nullable: true })
  lastShadowSummonDate!: string | null

  // ========== 七焰扇装备系统 ==========

  // 是否已炼化三焰扇
  @Column({ type: 'boolean', default: false })
  hasThreeFlameFan!: boolean

  // 是否已炼化七焰扇
  @Column({ type: 'boolean', default: false })
  hasSevenFlameFan!: boolean

  // 当前装备的火焰扇类型（null表示未装备）
  @Column({ type: 'varchar', length: 20, nullable: true })
  equippedFlameFan!: 'three_flame_fan' | 'seven_flame_fan' | null

  // 七焰扇炼制失败debuff过期时间
  @Column({ type: 'bigint', nullable: true })
  flameFanDebuffExpiresAt!: number | null

  // 炼制失败debuff详情（JSON字符串）
  @Column({ type: 'text', default: '{}' })
  flameFanDebuffJson!: string

  // debuff getter
  get flameFanDebuff(): {
    type: 'minor' | 'major' | 'severe'
    cultivationReduction: number
    combatPowerReduction: number
    description: string
  } | null {
    if (!this.flameFanDebuffJson || this.flameFanDebuffJson === '{}') return null
    try {
      return JSON.parse(this.flameFanDebuffJson)
    } catch {
      return null
    }
  }

  // debuff setter
  set flameFanDebuff(
    value: {
      type: 'minor' | 'major' | 'severe'
      cultivationReduction: number
      combatPowerReduction: number
      description: string
    } | null
  ) {
    this.flameFanDebuffJson = value ? JSON.stringify(value) : '{}'
  }

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}
