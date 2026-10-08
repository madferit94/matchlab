const {createHandler}=require('../server/gemini.cjs');
let handler;
module.exports=async(req,res)=>{
 const pathname=new URL(req.url,'https://matchlab.invalid').pathname;
 if(!['/api/analyze','/api/report','/api/health','/api/handler'].includes(pathname)){res.statusCode=404;return res.end()}
 const action=req.query&&req.query.action;
 if(pathname==='/api/handler')req.url=action==='health'?'/api/health':action==='analyze'?'/api/analyze':action==='report'?'/api/report':'/api/not-found';
 if(!handler){
  const origins=[process.env.VERCEL_URL,process.env.VERCEL_PROJECT_PRODUCTION_URL].filter(Boolean).map(host=>'https://'+host);
  if(process.env.APP_ORIGIN)origins.push(new URL(process.env.APP_ORIGIN).origin);
  handler=createHandler({publicOrigins:origins});
 }
 return handler(req,res);
};
