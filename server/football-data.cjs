/* Shared reader for the public football data files (0.26.0); no external packages. */
const fs=require('node:fs'),path=require('node:path');
const dir=path.resolve(__dirname,'..','data','football');
// Exact public file names and the window.MatchLabData key each one assigns.
const FILES=Object.freeze({'data.ko.js':'data','data.en.js':'data','predictions.js':'predictions'});
// Exact URL path -> file name; anything not in this map is not public.
const PUBLIC_PATHS=new Map(Object.keys(FILES).map(name=>['/data/football/'+name,name]));
const prefix=key=>'window.MatchLabData=window.MatchLabData||{};window.MatchLabData.'+key+'=';
function filePath(name){if(!Object.prototype.hasOwnProperty.call(FILES,name))throw new Error('Unknown football data file: '+name);return path.join(dir,name)}
function readSource(name){return fs.readFileSync(filePath(name),'utf8')}
// Returns the original JSON text exactly as it was inline in the HTML.
function readJsonText(name){
 const source=readSource(name),head=prefix(FILES[name]);
 if(!source.startsWith(head)||!source.endsWith(';\n'))throw new Error('Unexpected football data file format: '+name);
 return source.slice(head.length,-2);
}
function readJson(name){return JSON.parse(readJsonText(name))}
module.exports={FILES,PUBLIC_PATHS,dir,filePath,readSource,readJsonText,readJson};
