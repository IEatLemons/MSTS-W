import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { initialize } from './finance/store'
import './finance/styles.css'
initialize().then(() => createApp(App).use(router).mount('#app'))
