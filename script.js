const apiKey = '6b8adee1bcb24c5187ea145a2d9da2c5';
const apihost = 'mm4t2aadug.re.qweatherapi.com';
let currentCity = '正在定位中...';

document.getElementById('city').textContent = currentCity;

async function init() {
  try {
    // 调试：尝试获取保存的城市
    console.groupCollapsed('[调试] 获取保存的城市信息');
    const savedCity = await axios.get('/getCity').catch(error => {
      console.error('获取保存城市失败:', error.message);
      return null;
    });
    
    if (savedCity?.data?.city) {
      console.log('找到已保存城市:', savedCity.data);
      currentCity = savedCity.data.city;
      document.getElementById('city').textContent = currentCity;
      loadWeather(savedCity.data.id);
      console.groupEnd();
      return;
    }
    console.log('无保存的城市信息');
    console.groupEnd();

    // 获取新定位
    console.groupCollapsed('[调试] 定位流程');
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        position => {
          // 调试：输出原始定位信息
          console.log('定位成功数据:');
          console.log('纬度:', position.coords.latitude.toFixed(6));
          console.log('经度:', position.coords.longitude.toFixed(6));
          console.log('精度:', position.coords.accuracy + '米');
          console.log('时间戳:', new Date(position.timestamp).toLocaleString());
          resolve(position);
        },
        error => {
          // 调试：输出定位失败详情
          console.error('定位失败原因:', 
            error.code === 1 ? '用户拒绝授权' :
            error.code === 2 ? '无法获取位置' : 
            '请求超时 (' + error.message + ')'
          );
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });

    const { latitude, longitude } = position.coords;
    
    // 调试：输出API请求信息
    console.groupCollapsed('地理编码请求详情');
    const geoUrl = `https://${apihost}/geo/v2/city/lookup?location=${longitude},${latitude}&key=${apiKey}`;
    console.log('请求URL:', geoUrl);
    
    const cityData = await axios.get(geoUrl);
    console.log('API响应数据:', cityData.data);
    
    if (!cityData.data?.location?.[0]) {
      throw new Error('无效的地理编码响应');
    }
    
    const cityInfo = cityData.data.location[0];
    currentCity = cityInfo.name;
    const cityId = cityInfo.id;
    console.log('解析结果:', { name: currentCity, id: cityId });
    console.groupEnd();

    // 更新并保存
    document.getElementById('city').textContent = currentCity;
    console.log('正在保存城市信息...');
    await axios.post('/saveCity', { city: currentCity, id: cityId })
      .then(() => console.log('保存成功'))
      .catch(error => console.error('保存失败:', error.message));

    loadWeather(cityId);
    console.groupEnd(); // 结束定位流程组

  } catch (error) {
    console.groupEnd(); // 确保异常时关闭日志组
    console.error('[最终错误处理] 定位流程失败:', error.message);
    console.log('回退到默认城市: 西安');
    document.getElementById('city').textContent = '西安';
    loadWeather('101110101');
  }
}

function loadWeather(cityId) {
  console.groupCollapsed(`[调试] 加载天气数据 (城市ID: ${cityId})`);

  Promise.all([
    axios.get(`https://${apihost}/v7/weather/now?location=${cityId}&key=${apiKey}`),
    axios.get(`https://${apihost}/v7/air/now?location=${cityId}&key=${apiKey}`),
    axios.get(`https://${apihost}/v7/weather/24h?location=${cityId}&key=${apiKey}`)
  ]).then(([weatherRes, airRes, hourlyRes]) => {
    console.log('天气API响应:', weatherRes.data);
    console.log('空气质量API响应:', airRes.data);

    const weatherData = weatherRes.data.now;
    const airData = airRes.data.now;

    // 更新天气信息
    document.getElementById('condition').textContent = weatherData.text;
    document.getElementById('windScale').textContent = `${weatherData.windScale}级`;
    document.getElementById('temp').textContent = `${weatherData.temp}°C`;
    document.getElementById('feelsLike').textContent = `${weatherData.feelsLike}°C`;
    document.getElementById('humidity').textContent = `${weatherData.humidity}%`;
    document.getElementById('windSpeed').textContent = `${weatherData.windSpeed}km/h`;
    document.getElementById('windDir').textContent = weatherData.windDir;
    document.getElementById('pressure').textContent = `${weatherData.pressure}hPa`;

    // 更新空气质量
    document.getElementById('aqi').textContent = airData.aqi || '--';
    document.getElementById('pm25').textContent = `${airData.pm2p5 || '--'}μg/m³`;
    document.getElementById('pm10').textContent = `${airData.pm10 || '--'}μg/m³`;
    document.getElementById('no2').textContent = `${airData.no2 || '--'}μg/m³`;
    document.getElementById('so2').textContent = `${airData.so2 || '--'}μg/m³`;

    const updateTime = new Date().toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    document.getElementById('update-time').textContent = `数据更新时间：${updateTime}`;

    // ✅ 使用正确的 hourly 数据更新图表
    console.log("每小时天气数据：", hourlyRes.data.hourly);
    updateWeatherChart(hourlyRes.data.hourly);
    console.log('界面更新完成');
  }).catch(error => {
    console.error('天气数据加载失败:', error.message);
  }).finally(() => {
    console.groupEnd();
  });
}


function updateWeatherChart(hourlyData) {
  console.groupCollapsed('图表数据校验');

  // 校验 hourlyData 是否为有效数组
  if (!Array.isArray(hourlyData) || hourlyData.length === 0) {
    console.error('hourlyData 为空或格式不正确:', hourlyData);
    console.groupEnd();
    return;
  }

  // 校验每一项数据
  hourlyData.forEach((item, index) => {
    if (!item.fxTime || !item.temp || !item.humidity) {
      console.error(`数据项 ${index} 存在缺失字段:`, item);
    } else {
      if (isNaN(item.temp) || isNaN(item.humidity)) {
        console.error(`数据项 ${index} 的温度或湿度字段包含非数字值:`, item);
      }
    }
  });

  // 校验 canvas 是否加载成功
  const canvasElement = document.getElementById('weatherChart');
  if (!canvasElement) {
    console.error('未找到 id 为 "weatherChart" 的 canvas 元素');
    console.groupEnd();
    return;
  }
  console.log('Canvas 元素:', canvasElement);

  // 校验 Chart.js 是否已加载
  if (typeof Chart === 'undefined') {
    console.error('Chart.js 未正确加载');
    console.groupEnd();
    return;
  }
  console.log('Chart.js 已加载');

  // 获取数据
  const labels = hourlyData.map(item => item.fxTime.substring(11, 16)); // 获取时间（如 14:00）
  const tempValues = hourlyData.map(item => parseFloat(item.temp)).filter(val => !isNaN(val)); // 过滤 NaN
  const humidityValues = hourlyData.map(item => parseFloat(item.humidity)).filter(val => !isNaN(val)); // 过滤 NaN

  if (tempValues.length === 0 || humidityValues.length === 0) {
    console.error('温度或湿度数据无效，无法渲染图表');
    console.groupEnd();
    return;
  }

  // 获取 canvas 上下文
  const ctx = canvasElement.getContext('2d');
  if (!ctx) {
    console.error('无法获取 canvas 上下文');
    console.groupEnd();
    return;
  }

  // 销毁已有图表（如果存在）
  if (window.weatherChart instanceof Chart) {
    try {
      window.weatherChart.destroy();
      console.log('销毁旧图表');
    } catch (e) {
      console.warn('销毁图表失败:', e.message);
    }
  } else {
    console.log('没有找到有效的旧图表，跳过销毁');
  }

  // 创建并渲染新图表
  try {
    window.weatherChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: '温度 (°C)',
            data: tempValues,
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            yAxisID: 'y',
            tension: 0.3
          },
          {
            label: '湿度 (%)',
            data: humidityValues,
            borderColor: 'rgb(54, 162, 235)',
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            yAxisID: 'y1',
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        interaction: {
          mode: 'index',
          intersect: false
        },
        stacked: false,
        scales: {
          y: {
            type: 'linear',
            position: 'left',
            title: { display: true, text: '温度 (°C)' }
          },
          y1: {
            type: 'linear',
            position: 'right',
            title: { display: true, text: '湿度 (%)' },
            grid: {
              drawOnChartArea: false
            }
          }
        }
      }
    });
    console.log('图表渲染成功');
  } catch (error) {
    console.error('图表渲染失败:', error.message);
  }

  console.groupEnd();
}



// 启动应用
init();