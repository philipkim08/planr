import test from 'node:test'
import assert from 'node:assert/strict'
import {activityIcons,normalizeActivityIcon} from './activity-icons.js'
test('all nine activity icons round-trip through the server normalizer',()=>{
 assert.equal(activityIcons.length,9)
 for(const {id} of activityIcons)assert.equal(normalizeActivityIcon(id),id)
 for(const value of [undefined,null,'','emoji','<script>',{}])assert.equal(normalizeActivityIcon(value),'')
})
