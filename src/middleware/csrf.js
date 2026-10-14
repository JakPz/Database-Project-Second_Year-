'use strict';
const crypto=require('crypto');
module.exports=(req,res,next)=>{
 if(!req.session.csrf)req.session.csrf=crypto.randomBytes(32).toString('hex');
 res.locals.csrfToken=req.session.csrf;
 if(['POST','PUT','PATCH','DELETE'].includes(req.method)){
  const supplied=String(req.body?._csrf||req.get('x-csrf-token')||'');
  const a=Buffer.from(supplied),b=Buffer.from(req.session.csrf);
  if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return res.status(403).send('403 Invalid security token. Refresh and try again.');
 }
 next();
};
