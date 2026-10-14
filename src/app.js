'use strict';

require('dotenv').config({ quiet: true });
const path = require('path');
const express = require('express');
const methodOverride = require('method-override');
const session = require('express-session');
const {requireLogin,authorize} = require('./middleware/auth');
const csrf = require('./middleware/csrf');

const db = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body parsing and proper HTTP methods from HTML forms (?_method=PUT / DELETE)
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(methodOverride('_method'));

if(!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) throw Error('Set SESSION_SECRET in .env (32+ characters)');
app.use(session({name:'fams.sid',secret:process.env.SESSION_SECRET,resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:28800000}}));
app.use((req,res,next)=>{res.locals.currentUser=req.session.user||null;next()});
app.use(csrf);
// Static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// Sidebar menu. Pages are switched on (ready: true) as each phase is built.
app.locals.nav = [
  { key: 'dashboard',     label: 'Dashboard',        href: '/',               icon: 'bi-grid-1x2',        ready: true,  phase: 5 },
  { key: 'players',       label: 'Players',          href: '/players',        icon: 'bi-person-badge',    ready: true, phase: 6 },
  { key: 'parents',       label: 'Parents',          href: '/parents',        icon: 'bi-people',          ready: true, phase: 6 },
  { key: 'coaches',       label: 'Coaches',          href: '/coaches',        icon: 'bi-clipboard2-pulse',ready: true, phase: 7 },
  { key: 'age-groups',    label: 'Age Groups',       href: '/age-groups',     icon: 'bi-bar-chart-steps', ready: true, phase: 7 },
  { key: 'positions',     label: 'Positions',        href: '/positions',      icon: 'bi-bullseye',        ready: true, phase: 7 },
  { key: 'programs',      label: 'Training Programs',href: '/programs',       icon: 'bi-journal-text',    ready: true, phase: 7 },
  { key: 'classes',       label: 'Classes',          href: '/classes',        icon: 'bi-mortarboard',     ready: true, phase: 7 },
  { key: 'sessions',      label: 'Training Sessions',href: '/sessions',       icon: 'bi-calendar-event',  ready: true, phase: 8 },
  { key: 'registrations', label: 'Registrations',    href: '/registrations',  icon: 'bi-card-checklist',  ready: true, phase: 8 },
  { key: 'attendance',    label: 'Attendance',       href: '/attendance',     icon: 'bi-check2-circle',   ready: true, phase: 8 },
  { key: 'reports',       label: 'Reports',          href: '/reports',        icon: 'bi-graph-up-arrow',  ready: true, phase: 9 }
];

// Sign-in and server-side access checks
app.use('/',require('./routes/auth'));
app.use(requireLogin);
app.use(authorize);
app.use('/',require('./routes/portal'));
app.use('/',require('./routes/extra'));
// Routes
app.use('/', require('./routes/index'));
app.use('/', require('./routes/crud'));
app.use('/', require('./routes/workflows'));
app.use('/', require('./routes/reports'));

// 404 and error handling (must be last)
app.use(notFound);
app.use(errorHandler);

module.exports = app;
