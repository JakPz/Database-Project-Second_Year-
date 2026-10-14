'use strict';
require('dotenv').config({quiet:true});
const app=require('./src/app'),db=require('./src/config/db');
const port=Number(process.env.PORT||3000);
db.checkConnection().then(status=>{
 if(!status.connected)throw Error(`MySQL unavailable [${status.code}]: ${status.error}`);
 console.log(`MySQL connected: ${status.database} (${status.tableCount} tables)`);
 app.listen(port,()=>console.log(`FAMS running at http://localhost:${port}`));
}).catch(err=>{console.error(err.message);process.exitCode=1;db.pool.end()});
