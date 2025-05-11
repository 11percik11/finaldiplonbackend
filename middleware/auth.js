const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  // Полчуить токен из заголовка Authorization
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  // Проверям, есть ли токен
  if (!token) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {

    // Проверяем токен
    jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
      if (err) {
        return res.status(401).json({ error: 'Invalid token' });
      }
      // console.log(user);
      req.user = user;
      
      next();
    });
  }catch (error){
    console.error('Ошибка аутентификации:', error);

    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Токен доступа истек' });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(403).json({ error: 'Невалидный токен' });
    }

    res.status(500).json({ error: 'Ошибка аутентификации' });
  }
};

module.exports = { authenticateToken };