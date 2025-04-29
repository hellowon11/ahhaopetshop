import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(cors({
  origin: 'http://localhost:3000', // 前端地址
  credentials: true
}));
app.use(express.json());

// 测试路由
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Pet Shop API' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 