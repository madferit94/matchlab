const fs=require('node:fs'),path=require('node:path');
const {FILES}=require('../server/football-data.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist');
fs.mkdirSync(path.join(out,'f1'),{recursive:true});fs.mkdirSync(path.join(out,'data/football'),{recursive:true});
for(const name of ['index.html','index.en.html','f1/index.html'])fs.copyFileSync(path.join(root,name),path.join(out,name));
// Copy only the public football data files (exact allowlist), never other files that may sit in data/.
for(const name of Object.keys(FILES))fs.copyFileSync(path.join(root,'data/football',name),path.join(out,'data/football',name));
console.log('Built 3 public pages and '+Object.keys(FILES).length+' football data files; secrets, source and archives excluded.');
