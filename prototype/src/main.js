import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { money, precise, sheetLabel, signedMoney, statusText } from './lib/format'
import './styles.css'

const app = createApp(App)
app.config.globalProperties.money = money
app.config.globalProperties.precise = precise
app.config.globalProperties.sheetLabel = sheetLabel
app.config.globalProperties.signedMoney = signedMoney
app.config.globalProperties.statusText = statusText
app.use(router)
app.mount('#app')
