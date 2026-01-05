<template>
  <n-config-provider :theme="darkTheme" :theme-overrides="themeOverrides">
    <n-message-provider>
      <n-dialog-provider>
        <n-notification-provider>
          <n-loading-bar-provider>
            <router-view />
          </n-loading-bar-provider>
        </n-notification-provider>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
  import { onMounted } from 'vue'
  import { darkTheme, type GlobalThemeOverrides } from 'naive-ui'
  import { useAuthStore } from '@/stores/auth'
  import { initSocket } from '@/services/socket'

  const authStore = useAuthStore()

  // 游戏主题覆盖配置
  const themeOverrides: GlobalThemeOverrides = {
    common: {
      primaryColor: '#5d7c6f',
      primaryColorHover: '#7a9e8e',
      primaryColorPressed: '#3d5a4f',
      successColor: '#6b8e7a',
      warningColor: '#c9a959',
      errorColor: '#9b4a3c',
      textColorBase: '#e8e4dc',
      textColor1: '#e8e4dc',
      textColor2: '#a8a090',
      textColor3: '#6b6560',
      bodyColor: '#1a1812',
      cardColor: '#252117',
      modalColor: '#252117',
      popoverColor: '#252117',
      tableColor: '#252117',
      inputColor: '#1f1b14',
      borderColor: '#3d3830',
      dividerColor: '#3d3830',
      hoverColor: '#2f2a1f',
      borderRadius: '4px',
      fontFamily: "'LXGW WenKai', 'Noto Serif SC', 'STKaiti', 'KaiTi', 'PingFang SC', serif"
    },
    Card: {
      color: '#252117',
      colorModal: '#252117',
      borderColor: '#3d3830',
      titleTextColor: '#e8e4dc',
      textColor: '#a8a090'
    },
    Dialog: {
      color: '#252117',
      textColor: '#e8e4dc',
      titleTextColor: '#e8e4dc',
      borderRadius: '6px'
    },
    Modal: {
      color: '#252117',
      textColor: '#a8a090'
    },
    Message: {
      color: '#252117',
      colorSuccess: '#252117',
      colorWarning: '#252117',
      colorError: '#252117',
      colorInfo: '#252117',
      colorLoading: '#252117',
      textColor: '#e8e4dc',
      textColorSuccess: '#6b8e7a',
      textColorWarning: '#c9a959',
      textColorError: '#c96a5a',
      textColorInfo: '#e8e4dc',
      textColorLoading: '#e8e4dc',
      iconColorSuccess: '#6b8e7a',
      iconColorWarning: '#c9a959',
      iconColorError: '#c96a5a',
      iconColorInfo: '#5d7c6f',
      iconColorLoading: '#c9a959',
      borderRadius: '4px',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)'
    },
    Notification: {
      color: '#252117',
      textColor: '#e8e4dc',
      titleTextColor: '#e8e4dc',
      borderRadius: '6px'
    },
    Input: {
      color: '#1f1b14',
      colorFocus: '#1f1b14',
      borderColor: '#3d3830',
      borderColorHover: '#5d7c6f',
      borderColorFocus: '#c9a959',
      boxShadowFocus: '0 0 0 2px rgba(201, 169, 89, 0.2)',
      loadingColor: '#c9a959',
      textColor: '#e8e4dc',
      placeholderColor: '#6b6560',
      caretColor: '#c9a959'
    },
    InputNumber: {
      color: '#1f1b14',
      colorFocus: '#1f1b14',
      borderColor: '#3d3830',
      borderColorHover: '#5d7c6f',
      borderColorFocus: '#c9a959',
      textColor: '#e8e4dc',
      placeholderColor: '#6b6560',
      caretColor: '#c9a959'
    },
    Button: {
      colorPrimary: '#5d7c6f',
      colorHoverPrimary: '#7a9e8e',
      colorPressedPrimary: '#3d5a4f',
      textColorPrimary: '#e8e4dc',
      borderRadiusMedium: '4px'
    },
    Tabs: {
      tabTextColorLine: '#a8a090',
      tabTextColorActiveLine: '#c9a959',
      tabTextColorHoverLine: '#e8e4dc',
      barColor: '#c9a959'
    },
    Tag: {
      colorBordered: 'transparent'
    },
    Progress: {
      fillColor: '#5d7c6f',
      railColor: 'rgba(93, 124, 111, 0.15)'
    }
  }

  onMounted(() => {
    authStore.initFromStorage()
    // 如果已登录，初始化 Socket 连接
    if (authStore.isAuthenticated) {
      initSocket()
    }
  })
</script>
