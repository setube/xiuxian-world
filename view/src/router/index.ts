import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/auth',
    component: () => import('@/views/auth/AuthLayout.vue'),
    children: [
      { path: 'login', name: 'Login', component: () => import('@/views/auth/Login.vue') },
      { path: 'register', name: 'Register', component: () => import('@/views/auth/Register.vue') }
    ]
  },
  {
    path: '/spirit-root-detection',
    name: 'SpiritRootDetection',
    component: () => import('@/views/spiritRoot/SpiritRootDetection.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/',
    component: () => import('@/views/main/MainLayout.vue'),
    meta: { requiresAuth: true, requiresCharacter: true },
    children: [
      { path: '', name: 'Home', component: () => import('@/views/home/HomePage.vue') },
      { path: 'cultivation', name: 'Cultivation', component: () => import('@/views/cultivation/CultivationPanel.vue') },
      { path: 'profile', name: 'Profile', component: () => import('@/views/spiritRoot/MySpiritRoot.vue') },
      { path: 'inventory', name: 'Inventory', component: () => import('@/views/inventory/Inventory.vue') },
      { path: 'alchemy', name: 'Alchemy', component: () => import('@/views/crafting/AlchemyLab.vue') },
      { path: 'market', name: 'Market', component: () => import('@/views/trade/Market.vue') },
      { path: 'arena', name: 'Arena', component: () => import('@/views/pvp/Arena.vue') },
      { path: 'rankings', name: 'Rankings', component: () => import('@/views/pvp/Rankings.vue') },
      { path: 'settings', name: 'Settings', component: () => import('@/views/settings/Settings.vue') },
      // 宗门系统
      { path: 'sect/list', name: 'SectList', component: () => import('@/views/sect/SectList.vue') },
      { path: 'sect/my', name: 'MySect', component: () => import('@/views/sect/MySect.vue') },
      // 药园系统（黄枫谷专属）
      { path: 'garden', name: 'HerbGarden', component: () => import('@/views/garden/HerbGarden.vue') },
      // 太一门秘法（太一门专属）
      { path: 'taiyi', name: 'TaiyiArts', component: () => import('@/views/taiyi/TaiyiArts.vue') },
      // 星宫秘法（星宫专属）
      { path: 'starpalace', name: 'StarPalace', component: () => import('@/views/starpalace/StarPalace.vue') },
      // 黑煞教魔道禁术（黑煞教专属）
      { path: 'heisha', name: 'HeishaArts', component: () => import('@/views/heisha/HeishaArts.vue') },
      // 黑煞教血魂幡系统
      {
        path: 'blood-soul-banner',
        name: 'BloodSoulBanner',
        component: () => import('@/views/heisha/bloodSoulBanner/BloodSoulBannerPage.vue')
      },
      // 万灵宗灵兽养成（万灵宗专属）
      { path: 'wanling', name: 'WanlingArts', component: () => import('@/views/wanling/WanlingArts.vue') },
      // 落云宗灵眼之树（落云宗专属）
      { path: 'luoyun', name: 'LuoyunArts', component: () => import('@/views/luoyun/LuoyunArts.vue') },
      // 合欢宗情缘三境（合欢宗专属）
      { path: 'hehuan', name: 'HehuanArts', component: () => import('@/views/hehuan/HehuanArts.vue') },
      // 神通对决系统
      { path: 'battle', name: 'BattleHub', component: () => import('@/views/battle/BattleHub.vue') },
      { path: 'wooden-dummy', name: 'WoodenDummy', component: () => import('@/views/battle/WoodenDummy.vue') },
      { path: 'formation', name: 'Formation', component: () => import('@/views/battle/Formation.vue') },
      { path: 'loot', name: 'Loot', component: () => import('@/views/battle/Loot.vue') },
      { path: 'tower', name: 'Tower', component: () => import('@/views/battle/Tower.vue') },
      // 天道法则系统
      { path: 'world-events', name: 'WorldEvents', component: () => import('@/views/events/WorldEvents.vue') },
      // 洞府系统
      { path: 'cave', name: 'CaveDwelling', component: () => import('@/views/cave/CaveDwelling.vue') },
      // 风雷翅系统
      { path: 'fengxi', name: 'Fengxi', component: () => import('@/views/equipment/Fengxi.vue') },
      // 七焰扇系统
      { path: 'flame-fan', name: 'FlameFan', component: () => import('@/views/equipment/FlameFan.vue') },
      // 副本系统
      { path: 'dungeon', name: 'Dungeon', component: () => import('@/views/dungeon/DungeonHub.vue') }
    ]
  },
  {
    path: '/create-character',
    name: 'CreateCharacter',
    component: () => import('@/views/character/CreateCharacter.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('accessToken')
  const hasCharacter = localStorage.getItem('spiritRootId')

  if (to.meta.requiresAuth && !token) {
    next({ name: 'Login' })
  } else if (to.meta.requiresCharacter && !hasCharacter) {
    // 需要角色但没有角色，跳转到创建角色页面
    next({ name: 'CreateCharacter' })
  } else {
    next()
  }
})

export default router
