import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeStatus} from '../scripts/status-result.mjs';
test('MCP tool errors cannot be reported as successful status',()=>{
 assert.throws(()=>decodeStatus({isError:true,content:[{type:'text',text:'{"error":"imap_operation_failed"}'}]}),/Status tool failed/);
 assert.deepEqual(decodeStatus({content:[{type:'text',text:'{"configured":true}'}]}),{configured:true});
});
