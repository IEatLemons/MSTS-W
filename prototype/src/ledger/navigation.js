import {SHEETS} from './schema.js'

// Keep the financial workspace intact while visiting the separate directory page.
export const financialReturn={path:'/sheets/sofp',top:0}
export function financialReturnPath(value){
 return typeof value==='string'&&SHEETS.some(s=>value.split('?')[0]===`/sheets/${s.id}`)?value:'/sheets/sofp'
}
