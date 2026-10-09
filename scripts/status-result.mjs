export function decodeStatus(result) {
 if(result.isError) throw new Error('Status tool failed');
 return JSON.parse(result.content[0].text);
}
