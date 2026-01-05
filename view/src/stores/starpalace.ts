/**
 * 星宫系统 Pinia Store
 * 管理道心侍妾、观星台、周天星斗大阵、星衍天机的状态
 */
import { defineStore } from 'pinia'
import { starpalaceApi, extractErrorMessage } from '@/api'
import type {
  StarPalaceStatus,
  ConsortStatus,
  ObservatoryStatus,
  ArrayStatus,
  StargazeStatus,
  DiskStatus
} from '@/game/constants/starpalace'
import { STARGAZE_RESULTS, type StargazeResult } from '@/game/constants/starpalace'

interface StarPalaceState {
  // 是否是星宫弟子
  isStarPalaceMember: boolean
  // 侍妾状态
  consort: ConsortStatus | null
  // 观星台状态
  observatory: ObservatoryStatus | null
  // 大阵状态
  array: ArrayStatus | null
  // 观星状态
  stargazeStatus: StargazeStatus | null
  // 加载状态
  loading: boolean
  // 错误信息
  error: string | null
  // 上次刷新时间
  lastRefresh: number
}

export const useStarPalaceStore = defineStore('starpalace', {
  state: (): StarPalaceState => ({
    isStarPalaceMember: false,
    consort: null,
    observatory: null,
    array: null,
    stargazeStatus: null,
    loading: false,
    error: null,
    lastRefresh: 0
  }),

  getters: {
    // 是否有有效的侍妾
    hasConsort(): boolean {
      return this.consort !== null
    },

    // 侍妾是否可以问安
    canGreet(): boolean {
      return this.consort?.canGreet ?? false
    },

    // 灵力反哺是否生效中
    hasSpiritFeedback(): boolean {
      return this.consort?.spiritFeedbackActive ?? false
    },

    // 侍妾是否已派遣
    isConsortAssigned(): boolean {
      return this.consort?.assignedDiskIndex !== null
    },

    // 获取空闲的引星盘
    idleDisks(): DiskStatus[] {
      return this.observatory?.disks.filter(d => d.status === 'idle' && !d.isLocked) ?? []
    },

    // 获取正在凝聚的引星盘
    gatheringDisks(): DiskStatus[] {
      return this.observatory?.disks.filter(d => d.status === 'gathering') ?? []
    },

    // 获取可收集的引星盘
    readyDisks(): DiskStatus[] {
      return this.observatory?.disks.filter(d => d.status === 'ready') ?? []
    },

    // 获取有事件的引星盘
    eventDisks(): DiskStatus[] {
      return this.observatory?.disks.filter(d => d.status === 'event') ?? []
    },

    // 是否可以发起大阵
    canInitiateArray(): boolean {
      return this.array?.canInitiate ?? false
    },

    // 大阵buff是否生效中
    hasArrayBuff(): boolean {
      return this.array?.hasActiveBuff ?? false
    },

    // 是否可以观星
    canStargaze(): boolean {
      return this.stargazeStatus?.canStargaze ?? false
    },

    // 当前观星结果
    currentStargazeResult(): StargazeResult | null {
      return this.stargazeStatus?.currentResult ?? null
    },

    // 是否可以改命
    canChangeFate(): boolean {
      return this.stargazeStatus?.canChangeFate ?? false
    },

    // 免费改命次数
    freeChangeFateCount(): number {
      return this.stargazeStatus?.freeChangeFateCount ?? 0
    }
  },

  actions: {
    // 获取完整状态
    async fetchStatus(force = false) {
      // 5秒内不重复刷新
      if (!force && Date.now() - this.lastRefresh < 5000) {
        return
      }

      this.loading = true
      this.error = null

      try {
        const response = await starpalaceApi.getStatus()
        const status = response.data as StarPalaceStatus

        this.isStarPalaceMember = status.isStarPalaceMember
        this.consort = status.consort
        this.observatory = status.observatory
        this.array = status.array
        this.stargazeStatus = status.stargaze
        this.lastRefresh = Date.now()
      } catch (err) {
        this.error = extractErrorMessage(err)
        // 如果不是星宫弟子，重置状态
        this.isStarPalaceMember = false
        this.consort = null
        this.observatory = null
        this.array = null
        this.stargazeStatus = null
      } finally {
        this.loading = false
      }
    },

    // ========== 侍妾系统 ==========

    // 每日问安
    async greetConsort() {
      this.loading = true
      try {
        const response = await starpalaceApi.greetConsort()
        // 更新侍妾状态
        if (this.consort) {
          this.consort.affection = response.data.newAffection
          this.consort.canGreet = false
          this.consort.greetingCooldownMs = 24 * 60 * 60 * 1000
        }
        return response.data
      } catch (err) {
        this.error = extractErrorMessage(err)
        throw err
      } finally {
        this.loading = false
      }
    },

    // 赠予侍妾
    async giftConsort(amount: number) {
      this.loading = true
      try {
        const response = await starpalaceApi.giftConsort(amount)
        // 更新侍妾好感度
        if (this.consort) {
          this.consort.affection = response.data.newAffection
        }
        return response.data
      } catch (err) {
        this.error = extractErrorMessage(err)
        throw err
      } finally {
        this.loading = false
      }
    },

    // 灵力反哺
    async spiritFeedback() {
      this.loading = true
      try {
        const response = await starpalaceApi.spiritFeedback()
        // 更新状态
        if (this.consort) {
          this.consort.spiritFeedbackActive = true
          this.consort.spiritFeedbackExpiresIn = response.data.expiresIn
        }
        return response.data
      } catch (err) {
        this.error = extractErrorMessage(err)
        throw err
      } finally {
        this.loading = false
      }
    },

    // 派遣侍妾
    async assignConsort(diskIndex: number) {
      this.loading = true
      try {
        await starpalaceApi.assignConsort(diskIndex)
        // 更新状态
        if (this.consort) {
          this.consort.assignedDiskIndex = diskIndex
        }
        if (this.observatory) {
          const disk = this.observatory.disks.find(d => d.diskIndex === diskIndex)
          if (disk) {
            disk.hasConsortBonus = true
          }
          this.observatory.consortAssignment = {
            consortId: this.consort?.id ?? null,
            consortName: this.consort?.name ?? null,
            diskIndex
          }
        }
      } catch (err) {
        this.error = extractErrorMessage(err)
        throw err
      } finally {
        this.loading = false
      }
    },

    // 召回侍妾
    async recallConsort() {
      this.loading = true
      try {
        await starpalaceApi.recallConsort()
        // 更新状态
        const prevDiskIndex = this.consort?.assignedDiskIndex
        if (this.consort) {
          this.consort.assignedDiskIndex = null
        }
        if (this.observatory && prevDiskIndex !== null && prevDiskIndex !== undefined) {
          const disk = this.observatory.disks.find(d => d.diskIndex === prevDiskIndex)
          if (disk) {
            disk.hasConsortBonus = false
          }
          this.observatory.consortAssignment = {
            consortId: null,
            consortName: null,
            diskIndex: null
          }
        }
      } catch (err) {
        this.error = extractErrorMessage(err)
        throw err
      } finally {
        this.loading = false
      }
    },

    // ========== 观星台系统 ==========

    // 开始凝聚
    async startGathering(diskIndex: number, starType: string) {
      this.loading = true
      try {
        const response = await starpalaceApi.startGathering(diskIndex, starType)
        // 更新引星盘状态
        if (this.observatory) {
          const disk = this.observatory.disks.find(d => d.diskIndex === diskIndex)
          if (disk) {
            disk.status = 'gathering'
            disk.starType = starType
            disk.startedAt = Date.now()
            disk.readyAt = response.data.readyAt
            disk.progress = 0
          }
        }
        return response.data
      } catch (err) {
        this.error = extractErrorMessage(err)
        throw err
      } finally {
        this.loading = false
      }
    },

    // 收集产出
    async collectDisk(diskIndex: number) {
      this.loading = true
      try {
        const response = await starpalaceApi.collectDisk(diskIndex)
        // 重置引星盘状态
        if (this.observatory) {
          const disk = this.observatory.disks.find(d => d.diskIndex === diskIndex)
          if (disk) {
            disk.status = 'idle'
            disk.starType = null
            disk.startedAt = null
            disk.readyAt = null
            disk.progress = 0
            disk.eventType = 'none'
          }
        }
        return response.data
      } catch (err) {
        this.error = extractErrorMessage(err)
        throw err
      } finally {
        this.loading = false
      }
    },

    // 处理事件
    async handleDiskEvent(diskIndex: number) {
      this.loading = true
      try {
        const response = await starpalaceApi.handleDiskEvent(diskIndex)
        // 更新状态
        if (this.observatory) {
          const disk = this.observatory.disks.find(d => d.diskIndex === diskIndex)
          if (disk) {
            disk.status = 'gathering'
            disk.eventType = 'none'
          }
        }
        return response.data
      } catch (err) {
        this.error = extractErrorMessage(err)
        throw err
      } finally {
        this.loading = false
      }
    },

    // 扩展引星盘
    async expandDisks() {
      this.loading = true
      try {
        const response = await starpalaceApi.expandDisks()
        // 刷新状态
        await this.fetchStatus(true)
        return response.data
      } catch (err) {
        this.error = extractErrorMessage(err)
        throw err
      } finally {
        this.loading = false
      }
    },

    // ========== 周天星斗大阵 ==========

    // 发起大阵
    async initiateArray() {
      this.loading = true
      try {
        const response = await starpalaceApi.initiateArray()
        // 刷新状态
        await this.fetchStatus(true)
        return response.data
      } catch (err) {
        this.error = extractErrorMessage(err)
        throw err
      } finally {
        this.loading = false
      }
    },

    // 加入大阵
    async joinArray(arrayId: string) {
      this.loading = true
      try {
        const response = await starpalaceApi.joinArray(arrayId)
        // 刷新状态
        await this.fetchStatus(true)
        return response.data
      } catch (err) {
        this.error = extractErrorMessage(err)
        throw err
      } finally {
        this.loading = false
      }
    },

    // ========== 星衍天机 ==========

    // 进行观星
    async doStargaze() {
      this.loading = true
      try {
        const response = await starpalaceApi.stargaze()
        // 更新状态
        if (this.stargazeStatus) {
          const resultType = response.data.result
          this.stargazeStatus.currentResult = STARGAZE_RESULTS[resultType as keyof typeof STARGAZE_RESULTS]
          this.stargazeStatus.canStargaze = false
          this.stargazeStatus.stargazeCooldownMs = 24 * 60 * 60 * 1000
        }
        return response.data
      } catch (err) {
        this.error = extractErrorMessage(err)
        throw err
      } finally {
        this.loading = false
      }
    },

    // 改换星移
    async changeFate() {
      this.loading = true
      try {
        const response = await starpalaceApi.changeFate()
        // 更新状态
        if (this.stargazeStatus) {
          const resultType = response.data.newResult
          this.stargazeStatus.currentResult = STARGAZE_RESULTS[resultType as keyof typeof STARGAZE_RESULTS]
          this.stargazeStatus.canChangeFate = false
          if (this.stargazeStatus.freeChangeFateCount > 0) {
            this.stargazeStatus.freeChangeFateCount--
          }
        }
        return response.data
      } catch (err) {
        this.error = extractErrorMessage(err)
        throw err
      } finally {
        this.loading = false
      }
    },

    // 重置状态
    reset() {
      this.isStarPalaceMember = false
      this.consort = null
      this.observatory = null
      this.array = null
      this.stargazeStatus = null
      this.loading = false
      this.error = null
      this.lastRefresh = 0
    },

    // 更新引星盘进度（本地计算）
    updateDiskProgress() {
      if (!this.observatory) return

      const now = Date.now()
      for (const disk of this.observatory.disks) {
        if (disk.status === 'gathering' && disk.startedAt && disk.readyAt) {
          const total = disk.readyAt - disk.startedAt
          const elapsed = now - disk.startedAt
          disk.progress = Math.min(100, (elapsed / total) * 100)

          // 检查是否完成
          if (now >= disk.readyAt) {
            disk.status = 'ready'
            disk.progress = 100
          }
        }
      }
    }
  },

  persist: {
    key: 'starpalace',
    pick: ['isStarPalaceMember', 'lastRefresh']
  }
})
