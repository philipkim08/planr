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
 assert.match(css,/\.theme-blue\{--theme-primary:#2469bc;/)
 assert.doesNotMatch(readFileSync(new URL('./apple-preview.css',import.meta.url),'utf8'),/theme-blue\s*\{[^}]*#6050d8/)
})
test('stronger palettes have readable white buttons and accent text',()=>{
 const css=readFileSync(new URL('./themes.css',import.meta.url),'utf8')
 const luminance=hex=>{
   const c=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4)
   return c[0]*.2126+c[1]*.7152+c[2]*.0722
 }
 const contrast=(a,b)=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05)
 for(const theme of ['blue','green','red','muted','purple']){
   const block=css.match(new RegExp('\\.theme-'+theme+'\\{([^}]+)'))[1]
   const color=name=>block.match(new RegExp('--theme-'+name+':(#[0-9a-f]{6})'))[1]
   assert.ok(contrast(color('primary'),'#ffffff')>=4.5,theme+' button contrast')
   assert.ok(contrast(color('strong'),color('soft'))>=4.5,theme+' accent contrast')
 }
})
