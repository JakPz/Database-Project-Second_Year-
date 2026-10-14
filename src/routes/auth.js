'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/db');

const router = express.Router();

// Login Page

router.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/');
  }

  res.render('auth/login', {
    error: null
  });
});

// Login Authentication
router.post('/login', async (req, res, next) => {
  try {
    const rows = await db.query(
      'SELECT * FROM app_user WHERE username = ?',
      [String(req.body.username || '').trim()]
    );

    if (
      !rows.length ||
      !await bcrypt.compare(
        String(req.body.password || ''),
        rows[0].password_hash
      )
    ) {
      return res.status(401).render('auth/login', {
        error: 'Invalid username or password'
      });
    }

    req.session.regenerate((err) => {
      if (err) {
        return next(err);
      }

      const u = rows[0];

      req.session.user = {
        id: u.user_id,
        username: u.username,
        role: u.role,
        coachId: u.coach_id,
        parentId: u.parent_id
      };

      req.session.save((err) => {
        return err
          ? next(err)
          : res.redirect('/');
      });
    });

  } catch (e) {
    next(e);
  }
});

// Logout

router.post('/logout', (req, res, next) => {
  req.session.destroy((e) => {
    return e
      ? next(e)
      : res.clearCookie('fams.sid').redirect('/login');
  });
});

module.exports = router;
