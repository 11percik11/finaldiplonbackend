const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const fs = require('fs')
const cors = require('cors')
require('dotenv').config();

const app = express();

// const allowedOrigins = [
//   process.env.BASE_URL_FRONT,
//   "http://localhost:3000",
//   "http://localhost:80"
// ].filter(Boolean);

// app.use(cors(
// //   {
// //   // origin: process.env.BASE_URL_FRONT || "http://localhost:3000" || "http://localhost:80", // Укажите ваш фронтенд-домен
// //   origin: true,
// //   origin: allowedOrigins,
// //   // credentials: true, // Разрешить куки и авторизацию
// //   // methods: ['GET', 'POST', 'PUT', 'DELETE'], // Разрешенные методы
// //   // allowedHeaders: ['Content-Type', 'Authorization'], // Разрешенные заголовки
// // }
// ));

const allowedOrigins = [
  'http://localhost',
  'http://localhost:80',
  'http://localhost:3000',
  process.env.BASE_URL_FRONT
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.set('view engine', 'pug');

app.use('/uploads', express.static('uploads'))

app.use('/api', require('./routes'));

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

app.use(function(req, res, next) {
  next(createError(404));
});

app.use(function(err, req, res, next) {
  res.status(err.status || 500).json({
    message: err.message,
    error: req.app.get('env') === 'development' ? err : {}
  });
});

module.exports = app;
