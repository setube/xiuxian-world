<template>
  <div class="tribulation-page">
    <n-card title="渡劫堂" class="header-card">
      <p class="description">修仙之路，需渡天劫。炼气突破筑基需筑基丹，筑基突破结丹、结丹突破元婴则需主动渡劫，失败将形神俱灭。</p>
    </n-card>

    <!-- 南宫婉奇遇状态 -->
    <n-card v-if="tribulationStore.isNangongWanActive" class="nangong-wan-card">
      <div class="nangong-wan-status">
        <div class="nangong-icon">
          <n-icon :size="48" color="#722ed1">
            <Sun />
          </n-icon>
        </div>
        <div class="nangong-info">
          <h3>南宫婉奇遇进行中</h3>
          <p>境界暂时跌落至炼气初期，修为正在储存中</p>
          <div class="nangong-stats">
            <span>已储存修为: {{ tribulationStore.nangongWan?.storedExp?.toLocaleString() || 0 }}</span>
            <span>剩余时间: {{ tribulationStore.nangongWanRemainingTimeDisplay || '计算中...' }}</span>
          </div>
        </div>
      </div>
    </n-card>

    <!-- 渡劫区域 -->
    <n-spin :show="tribulationStore.loading">
      <div class="tribulation-grid">
        <n-card v-for="trib in tribulationTypes" :key="trib.key" class="tribulation-card" :class="{ dangerous: trib.dangerous }">
          <div class="trib-header">
            <div class="trib-icon" :style="{ backgroundColor: trib.color + '20', color: trib.color }">
              <n-icon :size="32">
                <component :is="trib.icon" />
              </n-icon>
            </div>
            <div class="trib-title">
              <h3>{{ trib.name }}</h3>
              <p class="trib-desc">{{ trib.description }}</p>
            </div>
          </div>

          <n-divider />

          <!-- 所需物品 -->
          <div class="required-items">
            <h4>所需物品</h4>
            <div class="items-list" v-if="getTribulationStatus(trib.key)?.requiredItems">
              <div v-for="item in getTribulationStatus(trib.key)!.requiredItems" :key="item.itemId" class="item-row">
                <span class="item-name">{{ item.name }}</span>
                <span class="item-count" :class="{ enough: item.owned >= item.required }">
                  {{ item.owned }} / {{ item.required }}
                  <n-icon :size="14" v-if="item.owned >= item.required">
                    <Check />
                  </n-icon>
                  <n-icon :size="14" v-else>
                    <X />
                  </n-icon>
                </span>
              </div>
            </div>
          </div>

          <!-- 成功率（如果有） -->
          <div v-if="getTribulationStatus(trib.key)?.successRate" class="success-rate">
            <span>成功率:</span>
            <n-progress
              type="line"
              :percentage="getTribulationStatus(trib.key)!.successRate"
              :indicator-placement="'inside'"
              :height="20"
            />
          </div>

          <!-- 危险警告 -->
          <n-alert v-if="trib.dangerous" type="error" class="danger-alert">
            <template #icon>
              <n-icon><AlertTriangle /></n-icon>
            </template>
            渡劫失败将形神俱灭，角色将被删除！
          </n-alert>

          <!-- 渡劫按钮 -->
          <div class="trib-actions">
            <n-button
              :type="canAttempt(trib.key) ? (trib.dangerous ? 'error' : 'primary') : 'default'"
              :disabled="!canAttempt(trib.key) || tribulationStore.attempting"
              :loading="tribulationStore.attempting"
              @click="confirmTribulation(trib.key as any)"
              block
            >
              {{ canAttempt(trib.key) ? '渡劫' : getTribulationStatus(trib.key)?.reason || '条件不足' }}
            </n-button>
          </div>
        </n-card>
      </div>
    </n-spin>

    <!-- 渡劫记录 -->
    <n-card title="渡劫记录" class="records-card">
      <template #header-extra>
        <n-button text @click="tribulationStore.fetchRecords()">刷新</n-button>
      </template>

      <n-empty v-if="tribulationStore.records.length === 0" description="暂无渡劫记录" />

      <div v-else class="records-list">
        <div
          v-for="record in tribulationStore.records"
          :key="record.id"
          class="record-item"
          :class="{ success: record.success, failed: !record.success }"
        >
          <div class="record-info">
            <span class="record-name">{{ record.characterName }}</span>
            <span class="record-type">
              {{
                record.tribulationType === 'foundation' ? '筑基之劫' : record.tribulationType === 'core_formation' ? '结丹之劫' : '元婴之劫'
              }}
            </span>
          </div>
          <div class="record-result">
            <n-tag :type="record.success ? 'success' : 'error'" size="small">
              {{ record.success ? '成功' : '失败' }}
            </n-tag>
            <span v-if="record.rolledBack" class="rolled-back">已回溯</span>
          </div>
        </div>
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
  import { onMounted } from 'vue'
  import { useTribulationStore } from '@/stores/tribulation'
  import { useRouter } from 'vue-router'
  import { useMessage, useDialog } from 'naive-ui'
  import { Flame, Zap, Sun, AlertTriangle, Check, X } from 'lucide-vue-next'

  const tribulationStore = useTribulationStore()
  const router = useRouter()
  const message = useMessage()
  const dialog = useDialog()

  onMounted(async () => {
    await tribulationStore.init()
  })

  // 确认渡劫弹窗
  const confirmTribulation = (type: 'foundation' | 'core_formation' | 'nascent_soul') => {
    const typeNames = {
      foundation: '筑基之劫',
      core_formation: '结丹之劫',
      nascent_soul: '元婴之劫'
    }

    const isDangerous = type === 'core_formation' || type === 'nascent_soul'

    if (isDangerous) {
      dialog.warning({
        title: '危险警告',
        content: `渡${typeNames[type]}失败会导致形神俱灭！确定要尝试渡劫吗？此操作不可逆！`,
        positiveText: '确定渡劫',
        negativeText: '取消',
        onPositiveClick: async () => {
          await attemptTribulation(type)
        }
      })
    } else {
      attemptTribulation(type)
    }
  }

  // 执行渡劫
  const attemptTribulation = async (type: 'foundation' | 'core_formation' | 'nascent_soul') => {
    let result
    if (type === 'foundation') {
      result = await tribulationStore.attemptFoundation()
    } else if (type === 'core_formation') {
      result = await tribulationStore.attemptCoreFormation()
    } else {
      result = await tribulationStore.attemptNascentSoul()
    }

    if (result) {
      if (result.characterDied) {
        message.error(result.message)
        // 跳转到角色创建页面
        setTimeout(() => {
          router.push('/character/create')
        }, 2000)
      } else if (result.success) {
        message.success(result.message)
      } else {
        message.warning(result.message)
      }
    }
  }

  // 渡劫类型配置
  const tribulationTypes = [
    {
      key: 'foundation',
      name: '筑基之劫',
      icon: Flame,
      color: '#52c41a',
      description: '炼气圆满突破筑基的天劫',
      requirement: '炼气圆满 + 筑基丹',
      dangerous: false
    },
    {
      key: 'core_formation',
      name: '结丹之劫',
      icon: Zap,
      color: '#faad14',
      description: '筑基圆满突破结丹的天劫',
      requirement: '筑基圆满 + 结丹三宝',
      dangerous: true
    },
    {
      key: 'nascent_soul',
      name: '元婴之劫',
      icon: Sun,
      color: '#eb2f96',
      description: '结丹圆满突破元婴的天劫',
      requirement: '结丹圆满 + 元婴三宝',
      dangerous: true
    }
  ]

  // 获取渡劫状态
  const getTribulationStatus = (key: string) => {
    if (key === 'foundation') return tribulationStore.foundation
    if (key === 'core_formation') return tribulationStore.coreFormation
    if (key === 'nascent_soul') return tribulationStore.nascentSoul
    return null
  }

  // 检查是否可渡劫
  const canAttempt = (key: string) => {
    if (key === 'foundation') return tribulationStore.canAttemptFoundation
    if (key === 'core_formation') return tribulationStore.canAttemptCoreFormation
    if (key === 'nascent_soul') return tribulationStore.canAttemptNascentSoul
    return false
  }
</script>

<style scoped>
  .tribulation-page {
    padding: 16px;
    max-width: 1000px;
    margin: 0 auto;
  }

  .header-card {
    margin-bottom: 16px;
  }

  .description {
    color: var(--text-color-secondary);
    font-size: 14px;
    margin: 0;
  }

  .nangong-wan-card {
    margin-bottom: 16px;
    background: linear-gradient(135deg, rgba(114, 46, 209, 0.1) 0%, rgba(114, 46, 209, 0.05) 100%);
    border: 1px solid rgba(114, 46, 209, 0.3);
  }

  .nangong-wan-status {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .nangong-info h3 {
    margin: 0 0 8px 0;
    color: #722ed1;
  }

  .nangong-info p {
    margin: 0 0 8px 0;
    color: var(--text-color-secondary);
  }

  .nangong-stats {
    display: flex;
    gap: 24px;
    font-size: 14px;
  }

  .tribulation-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 16px;
    margin-bottom: 16px;
  }

  .tribulation-card {
    position: relative;
  }

  .tribulation-card.dangerous {
    border-color: rgba(255, 77, 79, 0.3);
  }

  .trib-header {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .trib-icon {
    width: 64px;
    height: 64px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .trib-title h3 {
    margin: 0 0 4px 0;
  }

  .trib-desc {
    margin: 0;
    font-size: 13px;
    color: var(--text-color-secondary);
  }

  .required-items h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
  }

  .items-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .item-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: var(--body-color);
    border-radius: 6px;
  }

  .item-count {
    display: flex;
    align-items: center;
    gap: 4px;
    color: #ff4d4f;
  }

  .item-count.enough {
    color: #52c41a;
  }

  .success-rate {
    margin-top: 16px;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .danger-alert {
    margin-top: 16px;
  }

  .trib-actions {
    margin-top: 16px;
  }

  .records-card {
    margin-bottom: 16px;
  }

  .records-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .record-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    border-radius: 8px;
    background: var(--body-color);
  }

  .record-item.success {
    border-left: 3px solid #52c41a;
  }

  .record-item.failed {
    border-left: 3px solid #ff4d4f;
  }

  .record-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .record-name {
    font-weight: 500;
  }

  .record-type {
    font-size: 12px;
    color: var(--text-color-secondary);
  }

  .record-result {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .rolled-back {
    font-size: 12px;
    color: #faad14;
  }
</style>
