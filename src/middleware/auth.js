'use strict';
function requireLogin(req,res,next){if(!req.session.user)return res.redirect('/login');next()}
function authorize(req,res,next){
 const u=req.session.user,role=u.role,p=req.path,m=req.method;
 if(role==='Admin')return next();
 const get=m==='GET',post=m==='POST';
 const permitted=role==='Management' ? get&&(['/', '/reports','/profile'].includes(p)) :
 role==='Coach' ? ((get&&(['/', '/coach','/coach/sessions','/coach/recommendations','/attendance','/profile'].includes(p))) || (post&&(['/attendance','/coach/sessions','/coach/recommendations','/profile/password'].includes(p))) || (post&&/^\/coach\/sessions\/\d+\/update$/.test(p))) :
 role==='Parent' ? ((get&&(['/', '/parent','/profile'].includes(p)))||(post&&(['/parent/profile','/profile/password'].includes(p)||/^\/parent\/child\/\d+$/.test(p)))) : false;
 if(permitted)return next();
 return res.status(403).render('error',{title:'Access denied',activePage:'',status:403,message:'You do not have permission to access this page.'});
}
module.exports={requireLogin,authorize};
