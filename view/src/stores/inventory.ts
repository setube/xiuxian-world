import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { inventoryApi } from '@/api'
import { getItemTemplate, type ItemTemplate, type ItemType } from '@/game/constants/items'
import { getRecipe, type Recipe } from '@/game/constants/recipes'

// 背包物品接口
interface InventoryItem {
  id: string
  itemId: string
  quantity: number
  isBound: boolean
  obtainedAt: number
  // 客户端扩展
  template?: ItemTemplate
}

// 容量信息
interface CapacityInfo {
  used: number
  total: number
  percentage: number
}

// 配方信息（含学习状态）
interface RecipeWithStatus extends Recipe {
  learned: boolean
}

// 炼制检查结果
interface CanCraftResult {
  canCraft: boolean
  reason?: string
  maxTimes: number
  materials: Array<{
    itemId: string
    itemName: string
    required: number
    owned: number
    enough: boolean
  }>
}

export const useInventoryStore = defineStore('inventory', () => {
  // 状态
  const items = ref<InventoryItem[]>([])
  const capacity = ref<CapacityInfo>({ used: 0, total: 30, percentage: 0 })
  const learnedRecipeIds = ref<string[]>([])
  const allRecipes = ref<RecipeWithStatus[]>([])
  const loading = ref(false)
  const craftLoading = ref(false)

  // 计算属性
  const isEmpty = computed(() => items.value.length === 0)
  const isFull = computed(() => capacity.value.used >= capacity.value.total)
  const freeSlots = computed(() => capacity.value.total - capacity.value.used)

  // 按类型分组
  const itemsByType = computed(() => {
    const grouped: Record<ItemType, InventoryItem[]> = {
      consumable: [],
      material: [],
      seed: [],
      recipe: [],
      equipment: [],
      special: []
    }
    for (const item of items.value) {
      const template = item.template || getItemTemplate(item.itemId)
      if (template) {
        grouped[template.type].push(item)
      }
    }
    return grouped
  })

  // 已学习的配方
  const learnedRecipes = computed(() => {
    return allRecipes.value.filter(r => r.learned)
  })

  // 未学习的配方
  const unlearnedRecipes = computed(() => {
    return allRecipes.value.filter(r => !r.learned)
  })

  // 获取背包物品
  const fetchInventory = async (options?: {
    type?: ItemType | 'all'
    sort?: 'time' | 'quality' | 'name' | 'type'
    page?: number
    pageSize?: number
  }) => {
    loading.value = true
    try {
      const { data } = await inventoryApi.getInventory(options)
      // 附加模板信息
      items.value = (data.items || []).map((item: InventoryItem) => ({
        ...item,
        template: getItemTemplate(item.itemId)
      }))
      // 更新容量（后端返回max，前端用total）
      if (data.capacity) {
        const cap = data.capacity
        const total = cap.total ?? cap.max ?? 30
        const used = cap.used ?? 0
        capacity.value = {
          used,
          total,
          percentage: total > 0 ? Math.round((used / total) * 100) : 0
        }
      }
      return data
    } finally {
      loading.value = false
    }
  }

  // 获取容量信息
  const fetchCapacity = async () => {
    try {
      const { data } = await inventoryApi.getCapacity()
      // 后端返回max，前端用total
      const total = data.total ?? data.max ?? 30
      const used = data.used ?? 0
      capacity.value = {
        used,
        total,
        percentage: total > 0 ? Math.round((used / total) * 100) : 0
      }
      return capacity.value
    } catch {
      return null
    }
  }

  // 使用物品
  const useItem = async (inventoryItemId: string, quantity: number = 1) => {
    const { data } = await inventoryApi.useItem(inventoryItemId, quantity)
    // 刷新背包
    await fetchInventory()
    return data
  }

  // 丢弃物品
  const discardItem = async (inventoryItemId: string, quantity: number = 1) => {
    const { data } = await inventoryApi.discardItem(inventoryItemId, quantity)
    // 刷新背包
    await fetchInventory()
    return data
  }

  // 获取配方列表
  const fetchRecipes = async () => {
    loading.value = true
    try {
      const { data } = await inventoryApi.getRecipes()
      learnedRecipeIds.value = data.learnedIds || []
      allRecipes.value = (data.allRecipes || []).map((r: RecipeWithStatus) => ({
        ...r,
        // 确保有完整的配方信息
        ...getRecipe(r.id)
      }))
      return data
    } finally {
      loading.value = false
    }
  }

  // 学习配方
  const learnRecipe = async (inventoryItemId: string) => {
    const { data } = await inventoryApi.learnRecipe(inventoryItemId)
    // 刷新配方和背包
    await Promise.all([fetchRecipes(), fetchInventory()])
    return data
  }

  // 检查是否可炼制
  const checkCanCraft = async (recipeId: string, times: number = 1): Promise<CanCraftResult> => {
    const { data } = await inventoryApi.canCraft(recipeId, times)
    return data
  }

  // 炼制物品
  const craft = async (recipeId: string, times: number = 1) => {
    craftLoading.value = true
    try {
      const { data } = await inventoryApi.craft(recipeId, times)
      // 刷新背包
      await fetchInventory()
      return data
    } finally {
      craftLoading.value = false
    }
  }

  // 赠送物品
  const giftItem = async (
    inventoryItemId: string,
    target: { characterId?: string; name?: string },
    quantity: number = 1
  ) => {
    const { data } = await inventoryApi.giftItem(
      inventoryItemId,
      target.characterId,
      target.name,
      quantity
    )
    // 刷新背包
    await fetchInventory()
    return data
  }

  // 查找物品（按itemId）
  const findItemByTemplateId = (itemId: string): InventoryItem | undefined => {
    return items.value.find(item => item.itemId === itemId)
  }

  // 获取物品总数量（按itemId）
  const getItemCount = (itemId: string): number => {
    return items.value
      .filter(item => item.itemId === itemId)
      .reduce((sum, item) => sum + item.quantity, 0)
  }

  // 检查是否拥有足够物品
  const hasEnoughItem = (itemId: string, quantity: number): boolean => {
    return getItemCount(itemId) >= quantity
  }

  // 检查是否已学习配方
  const hasLearnedRecipe = (recipeId: string): boolean => {
    return learnedRecipeIds.value.includes(recipeId)
  }

  // 清空状态
  const clear = () => {
    items.value = []
    capacity.value = { used: 0, total: 30, percentage: 0 }
    learnedRecipeIds.value = []
    allRecipes.value = []
  }

  return {
    // 状态
    items,
    capacity,
    learnedRecipeIds,
    allRecipes,
    loading,
    craftLoading,

    // 计算属性
    isEmpty,
    isFull,
    freeSlots,
    itemsByType,
    learnedRecipes,
    unlearnedRecipes,

    // 方法
    fetchInventory,
    fetchCapacity,
    useItem,
    discardItem,
    fetchRecipes,
    learnRecipe,
    checkCanCraft,
    craft,
    giftItem,
    findItemByTemplateId,
    getItemCount,
    hasEnoughItem,
    hasLearnedRecipe,
    clear
  }
})
