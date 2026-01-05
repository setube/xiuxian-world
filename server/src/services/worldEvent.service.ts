import { AppDataSource } from '../config/database'
import { Character } from '../models/Character'
import { WorldEvent } from '../models/WorldEvent'
import { inventoryService } from './inventory.service'
import { getIO, broadcastToWorld, emitToPlayer } from '../socket/index'
import { getItemTemplate } from '../game/constants/items'
import {
  WORLD_EVENT_TYPES,
  EFFECT_TYPES,
  BLESSING_EVENTS,
  CALAMITY_EVENTS,
  EVENT_PROBABILITY,
} from '../game/constants/worldEvents'

const characterRepository = AppDataSource.getRepository(Character)
const worldEventRepository = AppDataSource.getRepository(WorldEvent)

export class WorldEventService {
  /**
   * 触发世界事件（每小时调用一次）
   */
  async triggerWorldEvent(): Promise<WorldEvent | null> {
    const io = getIO()
    if (!io) {
      console.log('[WorldEvent] Socket.IO 未初始化，跳过世界事件')
      return null
    }

    // 获取所有在线玩家（通过检查最近活跃时间）
    const now = Date.now()
    const tenMinutesAgo = now - 10 * 60 * 1000

    // 获取最近活跃的角色
    const activeCharacters = await characterRepository
      .createQueryBuilder('character')
      .leftJoinAndSelect('character.realm', 'realm')
      .where('character.lastActiveAt > :time', { time: tenMinutesAgo })
      .getMany()

    if (activeCharacters.length === 0) {
      console.log('[WorldEvent] 没有活跃玩家，跳过世界事件')
      return null
    }

    // 随机选择一位玩家
    const targetCharacter = activeCharacters[Math.floor(Math.random() * activeCharacters.length)]

    // 决定是祥瑞还是厄运
    const isBlessing = Math.random() < EVENT_PROBABILITY.BLESSING_CHANCE

    let event: WorldEvent

    if (isBlessing) {
      event = await this.applyBlessing(targetCharacter)
    } else {
      event = await this.applyCalamity(targetCharacter)
    }

    // 广播世界事件
    broadcastToWorld(io, 'world:event', {
      event: {
        id: event.id,
        type: event.type,
        effectType: event.effectType,
        targetCharacterName: event.targetCharacterName,
        description: event.description,
        value: event.value,
        itemName: event.itemName,
        triggeredAt: event.triggeredAt,
      },
      message: event.description,
    })

    console.log(`[WorldEvent] ${isBlessing ? '祥瑞' : '厄运'}降临: ${event.description}`)

    return event
  }

  /**
   * 应用祥瑞效果
   */
  private async applyBlessing(character: Character): Promise<WorldEvent> {
    // 根据权重随机选择事件
    const totalWeight = BLESSING_EVENTS.reduce((sum, e) => sum + e.weight, 0)
    let random = Math.random() * totalWeight
    let selectedEvent = BLESSING_EVENTS[0]

    for (const event of BLESSING_EVENTS) {
      random -= event.weight
      if (random <= 0) {
        selectedEvent = event
        break
      }
    }

    const tier = character.realm?.tier || 1
    let value = 0
    let itemId: string | null = null
    let itemName: string | null = null
    let description = selectedEvent.description
    let buffExpiresAt: number | null = null

    switch (selectedEvent.effectType) {
      case EFFECT_TYPES.EXP_BONUS: {
        const baseValue =
          selectedEvent.minValue +
          Math.floor(Math.random() * (selectedEvent.maxValue - selectedEvent.minValue))
        value = Math.floor(baseValue * Math.pow(selectedEvent.valueMultiplierByTier || 1, tier - 1))
        character.experience = Number(character.experience) + value
        await characterRepository.save(character)
        break
      }

      case EFFECT_TYPES.SPIRIT_STONES: {
        const baseValue =
          selectedEvent.minValue +
          Math.floor(Math.random() * (selectedEvent.maxValue - selectedEvent.minValue))
        value = Math.floor(baseValue * Math.pow(selectedEvent.valueMultiplierByTier || 1, tier - 1))
        character.spiritStones = Number(character.spiritStones) + value
        await characterRepository.save(character)
        break
      }

      case EFFECT_TYPES.CULTIVATION_BUFF: {
        value =
          selectedEvent.minValue +
          Math.floor(Math.random() * (selectedEvent.maxValue - selectedEvent.minValue))
        buffExpiresAt = Date.now() + (selectedEvent.duration || 3600000)

        // 添加buff到角色
        const buffs = character.worldEventBuffs
        buffs.push({
          type: WORLD_EVENT_TYPES.BLESSING,
          effectType: EFFECT_TYPES.CULTIVATION_BUFF,
          value,
          expiresAt: buffExpiresAt,
        })
        character.worldEventBuffs = buffs
        await characterRepository.save(character)
        break
      }

      case EFFECT_TYPES.RARE_ITEM: {
        // 根据权重选择物品
        const items = selectedEvent.possibleItems || []
        const itemTotalWeight = items.reduce((sum, i) => sum + i.weight, 0)
        let itemRandom = Math.random() * itemTotalWeight

        for (const item of items) {
          itemRandom -= item.weight
          if (itemRandom <= 0) {
            itemId = item.itemId
            break
          }
        }

        if (itemId) {
          const template = getItemTemplate(itemId)
          itemName = template?.name || itemId
          await inventoryService.addItem(character.id, itemId, 1)
        }
        break
      }
    }

    // 替换描述中的占位符
    description = description
      .replace('{name}', character.name)
      .replace('{value}', String(value))
      .replace('{itemName}', itemName || '')

    // 创建事件记录
    const worldEvent = worldEventRepository.create({
      type: WORLD_EVENT_TYPES.BLESSING,
      effectType: selectedEvent.effectType,
      targetCharacterId: character.id,
      targetCharacterName: character.name,
      description,
      value,
      itemId,
      itemName,
      buffExpiresAt,
      triggeredAt: Date.now(),
    })

    return await worldEventRepository.save(worldEvent)
  }

  /**
   * 应用厄运效果
   */
  private async applyCalamity(character: Character): Promise<WorldEvent> {
    // 根据权重随机选择事件
    const totalWeight = CALAMITY_EVENTS.reduce((sum, e) => sum + e.weight, 0)
    let random = Math.random() * totalWeight
    let selectedEvent = CALAMITY_EVENTS[0]

    for (const event of CALAMITY_EVENTS) {
      random -= event.weight
      if (random <= 0) {
        selectedEvent = event
        break
      }
    }

    const tier = character.realm?.tier || 1
    let value = 0
    let itemId: string | null = null
    let itemName: string | null = null
    let description = selectedEvent.description
    let buffExpiresAt: number | null = null

    switch (selectedEvent.effectType) {
      case EFFECT_TYPES.EXP_LOSS: {
        const baseValue =
          selectedEvent.minValue +
          Math.floor(Math.random() * (selectedEvent.maxValue - selectedEvent.minValue))
        value = Math.floor(baseValue * Math.pow(selectedEvent.valueMultiplierByTier || 1, tier - 1))

        // 最多损失当前修为的一定比例
        const maxLoss = Math.floor(
          Number(character.experience) * (selectedEvent.maxLossPercent || 0.1)
        )
        value = Math.min(value, maxLoss)

        character.experience = Math.max(0, Number(character.experience) - value)
        await characterRepository.save(character)
        break
      }

      case EFFECT_TYPES.SPIRIT_STONES_LOSS: {
        const baseValue =
          selectedEvent.minValue +
          Math.floor(Math.random() * (selectedEvent.maxValue - selectedEvent.minValue))
        value = Math.floor(baseValue * Math.pow(selectedEvent.valueMultiplierByTier || 1, tier - 1))

        // 最多损失当前灵石的一定比例
        const maxLoss = Math.floor(
          Number(character.spiritStones) * (selectedEvent.maxLossPercent || 0.15)
        )
        value = Math.min(value, maxLoss)

        character.spiritStones = Math.max(0, Number(character.spiritStones) - value)
        await characterRepository.save(character)
        break
      }

      case EFFECT_TYPES.CULTIVATION_DEBUFF: {
        value =
          selectedEvent.minValue +
          Math.floor(Math.random() * (selectedEvent.maxValue - selectedEvent.minValue))
        buffExpiresAt = Date.now() + (selectedEvent.duration || 3600000)

        // 添加debuff到角色
        const buffs = character.worldEventBuffs
        buffs.push({
          type: WORLD_EVENT_TYPES.CALAMITY,
          effectType: EFFECT_TYPES.CULTIVATION_DEBUFF,
          value,
          expiresAt: buffExpiresAt,
        })
        character.worldEventBuffs = buffs
        await characterRepository.save(character)
        break
      }

      case EFFECT_TYPES.ITEM_LOSS: {
        // 尝试随机丢失一个普通物品
        const inventory = await inventoryService.getInventory(character.id)
        const loseableItems = inventory.items.filter((item) =>
          (selectedEvent.targetItemQualities || ['common', 'uncommon']).includes(
            item.template.quality
          )
        )

        if (loseableItems.length > 0) {
          const randomItem = loseableItems[Math.floor(Math.random() * loseableItems.length)]
          itemId = randomItem.itemId
          itemName = randomItem.template.name
          value = 1

          await inventoryService.removeItem(character.id, randomItem.id, 1)
        } else {
          // 如果没有可丢失的物品，改为损失少量灵石
          value = 10 + Math.floor(Math.random() * 40)
          character.spiritStones = Math.max(0, Number(character.spiritStones) - value)
          await characterRepository.save(character)
          description = '{name}遭遇飞来横祸，损失了{value}灵石'
        }
        break
      }
    }

    // 替换描述中的占位符
    description = description
      .replace('{name}', character.name)
      .replace('{value}', String(value))
      .replace('{itemName}', itemName || '')

    // 创建事件记录
    const worldEvent = worldEventRepository.create({
      type: WORLD_EVENT_TYPES.CALAMITY,
      effectType: selectedEvent.effectType,
      targetCharacterId: character.id,
      targetCharacterName: character.name,
      description,
      value,
      itemId,
      itemName,
      buffExpiresAt,
      triggeredAt: Date.now(),
    })

    return await worldEventRepository.save(worldEvent)
  }

  /**
   * 获取最近的世界事件
   */
  async getRecentEvents(limit: number = 20): Promise<WorldEvent[]> {
    return await worldEventRepository.find({
      order: { triggeredAt: 'DESC' },
      take: limit,
    })
  }

  /**
   * 获取角色当前的buff/debuff
   */
  async getCharacterBuffs(
    characterId: string
  ): Promise<{ type: string; effectType: string; value: number; expiresAt: number }[]> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
    })

    if (!character) {
      return []
    }

    const now = Date.now()
    const buffs = character.worldEventBuffs.filter((buff) => buff.expiresAt > now)

    // 清理过期的buff
    if (buffs.length !== character.worldEventBuffs.length) {
      character.worldEventBuffs = buffs
      await characterRepository.save(character)
    }

    return buffs
  }

  /**
   * 获取角色的修炼效率加成（用于修炼时计算）
   */
  async getCultivationMultiplier(characterId: string): Promise<number> {
    const buffs = await this.getCharacterBuffs(characterId)

    let multiplier = 1.0

    for (const buff of buffs) {
      if (buff.effectType === EFFECT_TYPES.CULTIVATION_BUFF) {
        // 祥瑞加成
        multiplier += buff.value / 100
      } else if (buff.effectType === EFFECT_TYPES.CULTIVATION_DEBUFF) {
        // 厄运减益
        multiplier -= buff.value / 100
      }
    }

    // 确保最低有0.1倍效率
    return Math.max(0.1, multiplier)
  }

  /**
   * 获取角色的世界事件历史
   */
  async getCharacterEvents(characterId: string, limit: number = 20): Promise<WorldEvent[]> {
    return await worldEventRepository.find({
      where: { targetCharacterId: characterId },
      order: { triggeredAt: 'DESC' },
      take: limit,
    })
  }
}

export const worldEventService = new WorldEventService()
