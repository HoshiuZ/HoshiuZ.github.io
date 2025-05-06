const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();

// 关键路径配置
const DATA_DIR = path.join(__dirname, 'data');
const CITY_FILE = path.join(DATA_DIR, 'city.json');

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

app.get('/getCity', (req, res) => {
  try {
    const data = fs.existsSync(CITY_FILE) 
      ? JSON.parse(fs.readFileSync(CITY_FILE))
      : { city: "西安", id: "101110101" };
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: '读取失败' });
  }
});

app.post('/saveCity', (req, res) => {
  try {
    fs.writeFileSync(CITY_FILE, JSON.stringify(req.body));
    res.status(201).json({ status: 'success' });
  } catch (error) {
    res.status(500).json({ error: '保存失败' });
  }
});

app.listen(3000, () => {
  console.log('访问地址：http://localhost:3000');
  console.log('当前静态文件路径：', __dirname);
});