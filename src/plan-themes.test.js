import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {themeOptions,isPlanTheme} from './plan-themes.js'

test('every selectable theme is accepted by the API validator',()=>{
 for(const [id] of themeOptions)assert.equal(isPlanTheme(id),true)
 assert.equal(isPlanTheme('purple'),true)
 assert.equal(isPlanTheme('invalid'),false)
})
test('purple has its own palette and swatch while blue stays blue',()=>{
 const css=readFileSync(new URL('./themes.css',import.meta.url),'utf8')
 assert.match(css,/\.theme-purple\{--theme-primary:#6050d8;/)
 assert.match(css,/\.theme-swatch\.purple\{--swatch:#6050d8\}/)
 assert.match(css,/\.theme-blue\{--theme-primary:#6baed6;/)
 assert.doesNotMatch(readFileSync(new URL('./apple-preview.css',import.meta.url),'utf8'),/theme-blue\s*\{[^}]*#6050d8/)
})
