import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { initialize } from './ledger/store'
import './ledger/styles.css'
initialize().then(() => createApp(App).use(router).mount('#app'))
