const {createRequire}=require('node:module');
const {join}=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
 if(!process.env.DSH_RUNTIME_ROOT)throw Error('Set DSH_RUNTIME_ROOT to the DSH runtime directory containing node_modules.');
 process.env.NATURE_SKILLS_CHECK_UPDATES='0';
 const req=createRequire(join(process.env.DSH_RUNTIME_ROOT,'package.json'));
 const {Context}=await import(pathToFileURL(req.resolve('@deepseek-ai/cordis')).href);
 const skill=await import(pathToFileURL(req.resolve('@deepseek-ai/dsh-skill')).href);
 const plugin=await import(pathToFileURL(join(process.env.NATURE_PLUGIN_ROOT || join(__dirname,'..'),'index.mjs')).href);
 const ctx=new Context();
 await ctx.plugin(skill.default);
 await ctx.plugin(plugin);
 const list=await ctx.skills.list();
 if(list.length!==25)throw Error(`Expected 25 entries, got ${list.length}`);
 for(const entry of list){
   const loaded=await ctx.skills.get(entry.name);
   if(!loaded?.content)throw Error('Skill failed to load: '+entry.name);
 }
 console.log(JSON.stringify({loaded:list.length,workflows:list.filter(s=>s.invocation.userInvocable).length,
   researchwrite:list.some(s=>s.name==='researchwrite'),shared:list.find(s=>s.name==='nature-shared').invocation}));
})().catch(e=>{console.error(e);process.exitCode=1});
