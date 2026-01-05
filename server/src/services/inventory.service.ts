import { AppDataSource } from '../config/database'
import { EntityManager, In } from 'typeorm'
import { Character } from '../models/Character'
import { InventoryItem } from '../models/InventoryItem'
import { ITEMS, getItemTemplate, canUseItem, type ItemTemplate, type ItemType } from '../game/constants/items'
import { RECIPES, getRecipe, checkRecipeRequirements, calculateOutputQuantity, type Recipe } from '../game/constants/recipes'
import { DEMON_CURSE_CONFIG } from '../game/constants/heisha'
import { curseService } from './curse.service'

const characterRepository = AppDataSource.getRepository(Character)
const inventoryRepository = AppDataSource.getRepository(InventoryItem)

// 背包物品（带模板信息）
export interface InventoryItemWithTemplate {
  id: string
  itemId: string
  quantity: number
  isBound: boolean
  obtainedAt: number
  extraData: Record<string, unknown> | null
  template: ItemTemplate
}

// 背包容量信息
export interface InventoryCapacity {
  used: number
  max: number
  available: number
}

// 物品使用结果
export interface UseItemResult {
  success: boolean
  effect: {
    type: string
    value: number
    description: string
  }
  remaining: number
  message?: string
}

export class InventoryService {
  // ==================== 查询方法 ====================

  /**
   * 获取背包物品列表
   */
  async getInventory(
    characterId: string,
    options?: {
      type?: ItemType | 'all'
      sort?: 'time' | 'quality' | 'name' | 'type'
      page?: number
      pageSize?: number
    }
  ): Promise<{ items: InventoryItemWithTemplate[]; total: number; capacity: InventoryCapacity }> {
    const { type = 'all', sort = 'time', page = 1, pageSize = 50 } = options || {}

    // 获取所有物品（不分页），因为需要在内存中过滤和排序
    const allItems = await inventoryRepository.find({
      where: { characterId },
      order: { obtainedAt: 'DESC' } // 默认按时间排序
    })

    // 转换为带模板的物品列表，同时进行类型过滤
    let itemsWithTemplate: InventoryItemWithTemplate[] = allItems
      .map(item => {
        const template = getItemTemplate(item.itemId)
        if (!template) return null

        // 类型过滤（在分页前进行）
        if (type !== 'all' && template.type !== type) return null

        return {
          id: item.id,
          itemId: item.itemId,
          quantity: item.quantity,
          isBound: item.isBound,
          obtainedAt: Number(item.obtainedAt),
          extraData: item.extraData,
          template
        }
      })
      .filter((item): item is InventoryItemWithTemplate => item !== null)

    // 排序（在分页前进行）
    const qualityOrder: Record<string, number> = { legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1 }
    const typeOrder: Record<string, number> = { consumable: 1, material: 2, seed: 3, recipe: 4, equipment: 5, special: 6 }

    switch (sort) {
      case 'time':
        // 已经按时间排序，无需再次排序
        break
      case 'name':
        // 按物品中文名称排序
        itemsWithTemplate.sort((a, b) => a.template.name.localeCompare(b.template.name, 'zh-CN'))
        break
      case 'quality':
        // 按品质排序（高品质在前）
        itemsWithTemplate.sort((a, b) => qualityOrder[b.template.quality] - qualityOrder[a.template.quality])
        break
      case 'type':
        // 按类型排序
        itemsWithTemplate.sort((a, b) => (typeOrder[a.template.type] || 99) - (typeOrder[b.template.type] || 99))
        break
    }

    // 计算过滤后的总数（用于分页）
    const total = itemsWithTemplate.length

    // 分页（在过滤和排序后进行）
    const startIndex = (page - 1) * pageSize
    const paginatedItems = itemsWithTemplate.slice(startIndex, startIndex + pageSize)

    // 获取容量
    const capacity = await this.getCapacity(characterId)

    return { items: paginatedItems, total, capacity }
  }

  /**
   * 获取背包容量
   */
  async getCapacity(characterId: string): Promise<InventoryCapacity> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      select: ['inventoryCapacity']
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    // 计算已使用格子数（每种物品占1格，不管堆叠数量）
    const used = await inventoryRepository.count({
      where: { characterId }
    })

    return {
      used,
      max: character.inventoryCapacity,
      available: Math.max(0, character.inventoryCapacity - used)
    }
  }

  /**
   * 获取单个物品
   */
  async getItem(characterId: string, inventoryItemId: string): Promise<InventoryItemWithTemplate | null> {
    const item = await inventoryRepository.findOne({
      where: { id: inventoryItemId, characterId }
    })

    if (!item) return null

    const template = getItemTemplate(item.itemId)
    if (!template) return null

    return {
      id: item.id,
      itemId: item.itemId,
      quantity: item.quantity,
      isBound: item.isBound,
      obtainedAt: Number(item.obtainedAt),
      extraData: item.extraData,
      template
    }
  }

  /**
   * 按物品ID获取背包中的物品
   */
  async getItemByItemId(characterId: string, itemId: string, isBound?: boolean): Promise<InventoryItem | null> {
    const where: Record<string, unknown> = { characterId, itemId }
    if (isBound !== undefined) {
      where.isBound = isBound
    }
    return await inventoryRepository.findOne({ where })
  }

  /**
   * 获取物品数量
   */
  async getItemQuantity(characterId: string, itemId: string): Promise<number> {
    const items = await inventoryRepository.find({
      where: { characterId, itemId }
    })
    return items.reduce((sum, item) => sum + item.quantity, 0)
  }

  // ==================== 修改方法 ====================

  /**
   * 添加物品到背包
   */
  async addItem(
    characterId: string,
    itemId: string,
    quantity: number,
    options?: { bound?: boolean; extraData?: Record<string, unknown> }
  ): Promise<InventoryItem> {
    const template = getItemTemplate(itemId)
    if (!template) {
      throw new Error('物品不存在')
    }

    const isBound = options?.bound || false

    // 检查是否可堆叠
    if (template.stackable) {
      // 查找已有的同类物品（绑定状态相同）
      const existing = await inventoryRepository.findOne({
        where: { characterId, itemId, isBound }
      })

      if (existing) {
        // 计算可以添加的数量
        const spaceInStack = template.maxStack - existing.quantity
        const addToStack = Math.min(quantity, spaceInStack)

        if (addToStack > 0) {
          existing.quantity += addToStack
          await inventoryRepository.save(existing)

          // 如果还有剩余，递归添加
          const remaining = quantity - addToStack
          if (remaining > 0) {
            return await this.addItem(characterId, itemId, remaining, options)
          }

          return existing
        }
      }
    }

    // 需要新建物品格子
    const capacity = await this.getCapacity(characterId)
    if (capacity.available <= 0) {
      throw new Error('储物袋已满')
    }

    // 创建新物品
    const newItem = inventoryRepository.create({
      characterId,
      itemId,
      quantity: Math.min(quantity, template.maxStack),
      isBound,
      extraDataJson: options?.extraData ? JSON.stringify(options.extraData) : null,
      obtainedAt: Date.now()
    })

    const saved = await inventoryRepository.save(newItem)

    // 如果数量超过最大堆叠，递归添加剩余部分
    const remaining = quantity - saved.quantity
    if (remaining > 0 && template.stackable) {
      return await this.addItem(characterId, itemId, remaining, options)
    }

    return saved
  }

  /**
   * 移除物品
   */
  async removeItem(characterId: string, inventoryItemId: string, quantity: number): Promise<{ removed: number; remaining: number }> {
    const item = await inventoryRepository.findOne({
      where: { id: inventoryItemId, characterId }
    })

    if (!item) {
      throw new Error('物品不存在')
    }

    if (item.quantity < quantity) {
      throw new Error('物品数量不足')
    }

    const removed = Math.min(quantity, item.quantity)
    item.quantity -= removed

    if (item.quantity <= 0) {
      await inventoryRepository.remove(item)
      return { removed, remaining: 0 }
    }

    await inventoryRepository.save(item)
    return { removed, remaining: item.quantity }
  }

  /**
   * 按物品ID移除物品
   */
  async removeItemByItemId(characterId: string, itemId: string, quantity: number): Promise<{ removed: number; remaining: number }> {
    // 获取该物品的所有堆叠（优先移除未绑定的）
    const items = await inventoryRepository.find({
      where: { characterId, itemId },
      order: { isBound: 'ASC', obtainedAt: 'ASC' }
    })

    let totalRemoved = 0
    let needToRemove = quantity

    for (const item of items) {
      if (needToRemove <= 0) break

      const removeFromThis = Math.min(needToRemove, item.quantity)
      item.quantity -= removeFromThis
      totalRemoved += removeFromThis
      needToRemove -= removeFromThis

      if (item.quantity <= 0) {
        await inventoryRepository.remove(item)
      } else {
        await inventoryRepository.save(item)
      }
    }

    if (totalRemoved < quantity) {
      throw new Error('物品数量不足')
    }

    const totalQuantity = await this.getItemQuantity(characterId, itemId)
    return { removed: totalRemoved, remaining: totalQuantity }
  }

  /**
   * 使用物品
   */
  async useItem(characterId: string, inventoryItemId: string, quantity: number = 1): Promise<UseItemResult> {
    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm']
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    const item = await inventoryRepository.findOne({
      where: { id: inventoryItemId, characterId }
    })

    if (!item) {
      throw new Error('物品不存在')
    }

    if (item.quantity < quantity) {
      throw new Error('物品数量不足')
    }

    const template = getItemTemplate(item.itemId)
    if (!template) {
      throw new Error('物品配置不存在')
    }

    // 检查是否可使用
    const useCheck = canUseItem(template, character.realm?.tier || 1)
    if (!useCheck.canUse) {
      throw new Error(useCheck.reason || '该物品不可使用')
    }

    if (!template.useEffect) {
      throw new Error('该物品没有使用效果')
    }

    // 应用效果
    const effect = template.useEffect
    let message = ''

    switch (effect.type) {
      case 'add_experience':
        const expGain = effect.value * quantity
        character.experience = Number(character.experience) + expGain
        message = `获得 ${expGain} 点修为`
        break

      case 'add_spirit_stones':
        const stonesGain = effect.value * quantity
        character.spiritStones = Number(character.spiritStones) + stonesGain
        message = `获得 ${stonesGain} 灵石`
        break

      case 'restore_hp':
        const hpRestore = Math.floor(character.maxHp * (effect.value / 100) * quantity)
        character.hp = Math.min(character.hp + hpRestore, character.maxHp)
        message = `恢复 ${hpRestore} 点生命`
        break

      case 'restore_mp':
        const mpRestore = Math.floor(character.maxMp * (effect.value / 100) * quantity)
        character.mp = Math.min(character.mp + mpRestore, character.maxMp)
        message = `恢复 ${mpRestore} 点灵力`
        break

      case 'clear_poison':
        const poisonStacks = JSON.parse(character.poisonStacks || '[]')
        const clearPercent = effect.value / 100
        const clearedStacks = poisonStacks
          .map((p: { source: string; stacks: number; addedAt: number }) => ({
            ...p,
            stacks: Math.max(0, Math.floor(p.stacks * (1 - clearPercent)))
          }))
          .filter((p: { stacks: number }) => p.stacks > 0)
        character.poisonStacks = JSON.stringify(clearedStacks)
        message = `清除了 ${effect.value}% 的丹毒`
        break

      case 'expand_inventory':
        character.inventoryCapacity += effect.value * quantity
        message = `储物袋容量增加 ${effect.value * quantity} 格`
        break

      case 'learn_recipe':
        // 配方学习由专门的方法处理
        throw new Error('请使用学习配方功能')

      case 'remove_curse':
        // 解咒丹：移除丹魔之咒
        if (!character.curseType || !character.curseExpiresAt || Number(character.curseExpiresAt) <= Date.now()) {
          throw new Error('你没有被诅咒，无需使用解咒丹')
        }
        await curseService.clearCurseById(characterId)
        message = '咒印消散，你已摆脱丹魔之咒的侵蚀'
        break

      default:
        throw new Error('未知的物品效果')
    }

    // 保存角色变更
    await characterRepository.save(character)

    // 移除物品
    const { remaining } = await this.removeItem(characterId, inventoryItemId, quantity)

    return {
      success: true,
      effect: {
        type: effect.type,
        value: effect.value * quantity,
        description: effect.description
      },
      remaining,
      message
    }
  }

  /**
   * 丢弃物品
   */
  async discardItem(characterId: string, inventoryItemId: string, quantity: number): Promise<{ discarded: number }> {
    const { removed } = await this.removeItem(characterId, inventoryItemId, quantity)
    return { discarded: removed }
  }

  /**
   * 扩展背包容量
   */
  async expandInventory(characterId: string, amount: number): Promise<{ newCapacity: number }> {
    const character = await characterRepository.findOne({
      where: { id: characterId }
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    character.inventoryCapacity += amount
    await characterRepository.save(character)

    return { newCapacity: character.inventoryCapacity }
  }

  // ==================== 批量操作 ====================

  /**
   * 检查是否有足够的物品
   */
  async hasItems(characterId: string, items: { itemId: string; quantity: number }[]): Promise<boolean> {
    for (const { itemId, quantity } of items) {
      const have = await this.getItemQuantity(characterId, itemId)
      if (have < quantity) return false
    }
    return true
  }

  /**
   * 批量移除物品
   */
  async removeItems(characterId: string, items: { itemId: string; quantity: number }[]): Promise<void> {
    // 先检查是否都有足够数量
    for (const { itemId, quantity } of items) {
      const have = await this.getItemQuantity(characterId, itemId)
      if (have < quantity) {
        const template = getItemTemplate(itemId)
        throw new Error(`${template?.name || itemId} 数量不足`)
      }
    }

    // 批量移除
    for (const { itemId, quantity } of items) {
      await this.removeItemByItemId(characterId, itemId, quantity)
    }
  }

  /**
   * 批量添加物品
   */
  async addItems(characterId: string, items: { itemId: string; quantity: number; bound?: boolean }[]): Promise<InventoryItem[]> {
    const results: InventoryItem[] = []
    for (const { itemId, quantity, bound } of items) {
      const item = await this.addItem(characterId, itemId, quantity, { bound })
      results.push(item)
    }
    return results
  }

  // ==================== 配方系统 ====================

  /**
   * 获取已学习的配方列表
   */
  async getLearnedRecipes(characterId: string): Promise<{ recipes: Recipe[]; learnedIds: string[] }> {
    const character = await characterRepository.findOne({
      where: { id: characterId }
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    const learnedIds = character.learnedRecipes
    const recipes = learnedIds.map(id => getRecipe(id)).filter((r): r is Recipe => r !== undefined)

    return { recipes, learnedIds }
  }

  /**
   * 学习配方
   */
  async learnRecipe(characterId: string, inventoryItemId: string): Promise<{ success: boolean; recipeId: string; recipeName: string }> {
    const character = await characterRepository.findOne({
      where: { id: characterId }
    })

    if (!character) {
      throw new Error('角色不存在')
    }

    // 获取配方物品
    const item = await inventoryRepository.findOne({
      where: { id: inventoryItemId, characterId }
    })

    if (!item) {
      throw new Error('物品不存在')
    }

    const template = getItemTemplate(item.itemId)
    if (!template) {
      throw new Error('物品配置不存在')
    }

    if (template.type !== 'recipe' || !template.recipeId) {
      throw new Error('该物品不是配方')
    }

    const recipe = getRecipe(template.recipeId)
    if (!recipe) {
      throw new Error('配方配置不存在')
    }

    // 检查是否已学习
    const learnedRecipes = character.learnedRecipes
    if (learnedRecipes.includes(template.recipeId)) {
      throw new Error('已经学会该配方')
    }

    // 学习配方
    learnedRecipes.push(template.recipeId)
    character.learnedRecipes = learnedRecipes
    await characterRepository.save(character)

    // 消耗配方物品
    await this.removeItem(characterId, inventoryItemId, 1)

    return {
      success: true,
      recipeId: template.recipeId,
      recipeName: recipe.name
    }
  }

  /**
   * 炼制物品
   */
  async craft(
    characterId: string,
    recipeId: string,
    times: number = 1
  ): Promise<{
    success: boolean
    outputItemId: string
    outputQuantity: number
    materialsConsumed: { itemId: string; quantity: number }[]
    message: string
    craftResults: { success: boolean; quantity: number }[]
  }> {
    // 校验炼制次数参数
    if (!Number.isInteger(times) || times < 1) {
      throw new Error('炼制次数必须为正整数')
    }
    if (times > 100) {
      throw new Error('单次炼制次数不能超过100次')
    }

    const recipe = getRecipe(recipeId)
    if (!recipe) {
      throw new Error('配方不存在')
    }

    // 计算需要的材料总量
    const totalMaterials = recipe.materials.map(m => ({
      itemId: m.itemId,
      quantity: m.quantity * times
    }))

    const totalSpiritStones = (recipe.spiritStoneCost || 0) * times

    // 使用事务确保炼制过程的原子性
    return AppDataSource.transaction(async (manager: EntityManager) => {
      // 获取角色（使用悲观锁防止并发问题）
      const character = await manager.findOne(Character, {
        where: { id: characterId },
        relations: ['realm'],
        lock: { mode: 'pessimistic_write' }
      })

      if (!character) {
        throw new Error('角色不存在')
      }

      // 检查是否已学习配方
      const learnedRecipes = character.learnedRecipes
      if (!learnedRecipes.includes(recipeId)) {
        throw new Error('未学习该配方')
      }

      // 检查炼制条件
      const reqCheck = checkRecipeRequirements(recipe, character.realm?.tier || 1, character.sectId)
      if (!reqCheck.canCraft) {
        throw new Error(reqCheck.reason || '不满足炼制条件')
      }

      // 获取所有相关材料物品（使用悲观锁）
      const materialItemIds = totalMaterials.map(m => m.itemId)
      const inventoryItems = await manager.find(InventoryItem, {
        where: { characterId, itemId: In(materialItemIds) },
        lock: { mode: 'pessimistic_write' }
      })

      // 检查材料是否足够
      for (const { itemId, quantity } of totalMaterials) {
        const items = inventoryItems.filter(i => i.itemId === itemId)
        const have = items.reduce((sum, item) => sum + item.quantity, 0)
        if (have < quantity) {
          const template = getItemTemplate(itemId)
          throw new Error(`${template?.name || itemId} 数量不足，需要 ${quantity}，拥有 ${have}`)
        }
      }

      // 检查灵石是否足够
      if (totalSpiritStones > 0 && Number(character.spiritStones) < totalSpiritStones) {
        throw new Error(`灵石不足，需要 ${totalSpiritStones}`)
      }

      // === 开始执行炼制（以下操作在事务中） ===

      // 扣除灵石
      if (totalSpiritStones > 0) {
        character.spiritStones = Number(character.spiritStones) - totalSpiritStones
      }

      // 执行炼制
      const craftResults: { success: boolean; quantity: number }[] = []
      let totalOutput = 0
      let successCount = 0

      for (let i = 0; i < times; i++) {
        // 消耗单次材料
        for (const material of recipe.materials) {
          let needToRemove = material.quantity
          // 按未绑定优先、时间顺序消耗
          const items = inventoryItems
            .filter(item => item.itemId === material.itemId && item.quantity > 0)
            .sort((a, b) => {
              if (a.isBound !== b.isBound) return a.isBound ? 1 : -1
              return Number(a.obtainedAt) - Number(b.obtainedAt)
            })

          for (const item of items) {
            if (needToRemove <= 0) break
            const removeFromThis = Math.min(needToRemove, item.quantity)
            item.quantity -= removeFromThis
            needToRemove -= removeFromThis
          }
        }

        // 判定成功率（检查丹魔之咒惩罚）
        let effectiveSuccessRate = recipe.successRate
        if (character.curseType && character.curseExpiresAt && Number(character.curseExpiresAt) > Date.now()) {
          // 被丹魔之咒诅咒，炼丹成功率降低
          effectiveSuccessRate = Math.max(0, effectiveSuccessRate - DEMON_CURSE_CONFIG.alchemyPenalty * 100)
        }
        const roll = Math.random() * 100
        const isSuccess = roll < effectiveSuccessRate

        if (isSuccess) {
          const quantity = calculateOutputQuantity(recipe)
          craftResults.push({ success: true, quantity })
          totalOutput += quantity
          successCount++
        } else {
          craftResults.push({ success: false, quantity: 0 })
        }
      }

      // 保存角色变更（灵石扣除）
      await manager.save(Character, character)

      // 保存物品变更（材料消耗）
      for (const item of inventoryItems) {
        if (item.quantity <= 0) {
          await manager.remove(InventoryItem, item)
        } else {
          await manager.save(InventoryItem, item)
        }
      }

      // 添加产出物品
      if (totalOutput > 0) {
        const outputTemplate = getItemTemplate(recipe.outputItemId)
        if (outputTemplate) {
          // 查找是否有可堆叠的已有物品
          const existingOutput = await manager.findOne(InventoryItem, {
            where: { characterId, itemId: recipe.outputItemId, isBound: false }
          })

          if (existingOutput && outputTemplate.stackable && existingOutput.quantity + totalOutput <= outputTemplate.maxStack) {
            existingOutput.quantity += totalOutput
            await manager.save(InventoryItem, existingOutput)
          } else {
            // 创建新物品
            const newItem = manager.create(InventoryItem, {
              characterId,
              itemId: recipe.outputItemId,
              quantity: Math.min(totalOutput, outputTemplate.maxStack),
              isBound: false,
              obtainedAt: Date.now()
            })
            await manager.save(InventoryItem, newItem)

            // 如果产出超过单组上限，需要创建多组
            let remaining = totalOutput - outputTemplate.maxStack
            while (remaining > 0) {
              const additionalItem = manager.create(InventoryItem, {
                characterId,
                itemId: recipe.outputItemId,
                quantity: Math.min(remaining, outputTemplate.maxStack),
                isBound: false,
                obtainedAt: Date.now()
              })
              await manager.save(InventoryItem, additionalItem)
              remaining -= outputTemplate.maxStack
            }
          }
        }
      }

      const outputTemplate = getItemTemplate(recipe.outputItemId)
      const message =
        successCount === times
          ? `炼制成功！获得 ${outputTemplate?.name || recipe.outputItemId} x${totalOutput}`
          : successCount > 0
          ? `炼制完成，成功 ${successCount}/${times} 次，获得 ${outputTemplate?.name || recipe.outputItemId} x${totalOutput}`
          : `炼制失败，材料已损耗`

      return {
        success: successCount > 0,
        outputItemId: recipe.outputItemId,
        outputQuantity: totalOutput,
        materialsConsumed: totalMaterials,
        message,
        craftResults
      }
    })
  }

  /**
   * 检查配方是否可以炼制
   */
  async canCraft(
    characterId: string,
    recipeId: string,
    times: number = 1
  ): Promise<{
    canCraft: boolean
    reason?: string
    missingMaterials?: { itemId: string; name: string; need: number; have: number }[]
  }> {
    // 校验炼制次数参数
    if (!Number.isInteger(times) || times < 1) {
      return { canCraft: false, reason: '炼制次数必须为正整数' }
    }
    if (times > 100) {
      return { canCraft: false, reason: '单次炼制次数不能超过100次' }
    }

    const character = await characterRepository.findOne({
      where: { id: characterId },
      relations: ['realm']
    })

    if (!character) {
      return { canCraft: false, reason: '角色不存在' }
    }

    // 检查是否已学习配方
    if (!character.learnedRecipes.includes(recipeId)) {
      return { canCraft: false, reason: '未学习该配方' }
    }

    const recipe = getRecipe(recipeId)
    if (!recipe) {
      return { canCraft: false, reason: '配方不存在' }
    }

    // 检查炼制条件
    const reqCheck = checkRecipeRequirements(recipe, character.realm?.tier || 1, character.sectId)
    if (!reqCheck.canCraft) {
      return { canCraft: false, reason: reqCheck.reason }
    }

    // 检查材料
    const missingMaterials: { itemId: string; name: string; need: number; have: number }[] = []
    for (const material of recipe.materials) {
      const need = material.quantity * times
      const have = await this.getItemQuantity(characterId, material.itemId)
      if (have < need) {
        const template = getItemTemplate(material.itemId)
        missingMaterials.push({
          itemId: material.itemId,
          name: template?.name || material.itemId,
          need,
          have
        })
      }
    }

    if (missingMaterials.length > 0) {
      return { canCraft: false, reason: '材料不足', missingMaterials }
    }

    // 检查灵石
    const totalSpiritStones = (recipe.spiritStoneCost || 0) * times
    if (totalSpiritStones > 0 && Number(character.spiritStones) < totalSpiritStones) {
      return { canCraft: false, reason: `灵石不足，需要 ${totalSpiritStones}` }
    }

    return { canCraft: true }
  }

  // ==================== 赠送系统 ====================

  /**
   * 赠送物品给其他玩家
   */
  async giftItem(
    fromCharacterId: string,
    toCharacterId: string,
    inventoryItemId: string,
    quantity: number
  ): Promise<{
    success: boolean
    itemName: string
    quantity: number
    targetName: string
  }> {
    // 不能赠送给自己
    if (fromCharacterId === toCharacterId) {
      throw new Error('不能赠送给自己')
    }

    // 获取发送方角色
    const fromCharacter = await characterRepository.findOne({
      where: { id: fromCharacterId }
    })

    if (!fromCharacter) {
      throw new Error('角色不存在')
    }

    // 获取接收方角色
    const toCharacter = await characterRepository.findOne({
      where: { id: toCharacterId }
    })

    if (!toCharacter) {
      throw new Error('赠送目标不存在')
    }

    // 获取物品
    const item = await inventoryRepository.findOne({
      where: { id: inventoryItemId, characterId: fromCharacterId }
    })

    if (!item) {
      throw new Error('物品不存在')
    }

    if (item.quantity < quantity) {
      throw new Error('物品数量不足')
    }

    // 检查物品是否可交易
    const template = getItemTemplate(item.itemId)
    if (!template) {
      throw new Error('物品配置不存在')
    }

    if (!template.tradeable) {
      throw new Error('该物品不可交易')
    }

    if (item.isBound) {
      throw new Error('该物品已绑定，无法赠送')
    }

    // 检查接收方背包是否有空间
    const toCapacity = await this.getCapacity(toCharacterId)

    // 检查接收方是否已有该物品（可堆叠情况）
    const existingItem = await inventoryRepository.findOne({
      where: { characterId: toCharacterId, itemId: item.itemId, isBound: false }
    })

    const needsNewSlot = !existingItem || !template.stackable || (existingItem && existingItem.quantity + quantity > template.maxStack)

    if (needsNewSlot && toCapacity.available <= 0) {
      throw new Error('对方储物袋已满')
    }

    // 执行赠送
    // 1. 从发送方移除
    await this.removeItem(fromCharacterId, inventoryItemId, quantity)

    // 2. 添加到接收方
    await this.addItem(toCharacterId, item.itemId, quantity)

    return {
      success: true,
      itemName: template.name,
      quantity,
      targetName: toCharacter.name
    }
  }

  /**
   * 根据角色名查找角色ID
   */
  async findCharacterByName(name: string): Promise<string | null> {
    const character = await characterRepository.findOne({
      where: { name },
      select: ['id']
    })
    return character?.id || null
  }
}

export const inventoryService = new InventoryService()
