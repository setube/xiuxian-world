<template>
  <div class="settings-page">
    <div class="page-header">
      <div class="header-icon">
        <Settings :size="24" />
      </div>
      <div class="header-info">
        <h2>设置</h2>
        <p>个性化你的修仙之旅</p>
      </div>
    </div>

    <div class="logout-section">
      <n-button type="error" block size="large" @click="handleLogout">
        <template #icon>
          <LogOut :size="18" />
        </template>
        退出登录
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { useRouter } from 'vue-router'
  import { useAuthStore } from '@/stores/auth'
  import { Settings, LogOut } from 'lucide-vue-next'

  const router = useRouter()
  const authStore = useAuthStore()

  const handleLogout = async () => {
    authStore.logout()
    router.push('/auth/login')
  }
</script>

<style scoped>
  .settings-page {
    padding: 16px;
  }

  .page-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
  }

  .header-icon {
    width: 48px;
    height: 48px;
    border-radius: 4px;
    background: linear-gradient(135deg, #6b6560 0%, #4a4540 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-primary);
    border: 1px solid rgba(201, 169, 89, 0.2);
  }

  .header-info h2 {
    margin: 0 0 4px;
    font-size: 1.2rem;
    color: var(--text-primary);
    letter-spacing: 2px;
  }

  .header-info p {
    margin: 0;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .settings-list {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 20px;
  }

  .settings-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .settings-item:hover {
    background: rgba(201, 169, 89, 0.05);
  }

  .settings-item:not(:last-child) {
    border-bottom: 1px solid var(--border-color);
  }

  .divider {
    height: 6px;
    background: rgba(0, 0, 0, 0.3);
  }

  .item-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .item-icon {
    width: 36px;
    height: 36px;
    border-radius: 4px;
    background: rgba(93, 124, 111, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #7a9e8e;
  }

  .item-label {
    font-size: 0.95rem;
    color: var(--text-primary);
  }

  .item-right {
    color: var(--text-muted);
  }

  .item-right .active {
    color: var(--color-gold);
  }

  .chevron {
    opacity: 0.5;
  }

  .logout-section {
    margin-bottom: 20px;
  }

  :deep(.n-button--error-type) {
    background: linear-gradient(135deg, #9b4a3c 0%, #7a3a30 100%) !important;
    border: 1px solid rgba(155, 74, 60, 0.5) !important;
    border-radius: 4px !important;
  }
</style>
