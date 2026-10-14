'use strict';const test=require('node:test'),assert=require('node:assert/strict');const {authorize,requireLogin}=require('../src/middleware/auth');
function check(role,method,path){let result='next';const req={session:{user:{role}},method,path};const res={status(code){result=code;return this},render(){return this},sendStatus(code){result=code;return this}};authorize(req,res,()=>{result='next'});return result}
test('Admin routes accessible',()=>assert.equal(check('Admin','POST','/players'),'next'));
test('Management cannot write',()=>assert.equal(check('Management','POST','/players'),403));
test('Management can view reports',()=>assert.equal(check('Management','GET','/reports'),'next'));
test('Coach cannot manage all players',()=>assert.equal(check('Coach','GET','/players'),403));
test('Coach can record attendance',()=>assert.equal(check('Coach','POST','/attendance'),'next'));
test('Coach cannot manage accounts',()=>assert.equal(check('Coach','GET','/users'),403));
test('Parent cannot see admin reports',()=>assert.equal(check('Parent','GET','/reports'),403));
test('Parent can edit linked child via protected route',()=>assert.equal(check('Parent','POST','/parent/child/1'),'next'));
test('Parent cannot use arbitrary player route',()=>assert.equal(check('Parent','POST','/players/1/update'),403));
