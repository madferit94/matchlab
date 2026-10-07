const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist');
fs.mkdirSync(path.join(out,'f1'),{recursive:true});
for(const name of ['index.html','index.en.html','f1/index.html'])fs.copyFileSync(path.join(root,name),path.join(out,name));
console.log('Built 3 public pages; secrets, source and archives excluded.');
