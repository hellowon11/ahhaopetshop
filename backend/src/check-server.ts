import http from 'http';

// 检查4003端口是否被占用
const checkPort = (port: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const server = http.createServer();
    
    server.once('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`❌ 端口 ${port} 已被占用`);
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      server.close();
      console.log(`✅ 端口 ${port} 可用`);
      resolve(true);
    });
    
    server.listen(port);
  });
};

// 检查MongoDB连接字符串是否设置
const checkMongoDBConnection = (): boolean => {
  const mongoURI = process.env.MONGODB_URI || '';
  if (!mongoURI) {
    console.log('❌ MongoDB 连接字符串未设置');
    return false;
  }
  console.log('✅ MongoDB 连接字符串已设置');
  return true;
};

// 检查JWT密钥是否设置
const checkJWTSecret = (): boolean => {
  const jwtSecret = process.env.JWT_SECRET || '';
  if (!jwtSecret) {
    console.log('❌ JWT 密钥未设置，将使用默认密钥');
    return false;
  }
  console.log('✅ JWT 密钥已设置');
  return true;
};

const main = async () => {
  console.log('==========================================');
  console.log('        AH HAO PET SHOP 后端检查          ');
  console.log('==========================================');
  
  // 检查环境变量
  console.log('\n📋 检查环境变量:');
  const nodeEnv = process.env.NODE_ENV || 'development';
  console.log(`当前环境: ${nodeEnv}`);
  
  // 检查端口
  console.log('\n📋 检查端口:');
  const port = parseInt(process.env.PORT || '4003');
  await checkPort(port);
  
  // 检查数据库连接
  console.log('\n📋 检查数据库配置:');
  checkMongoDBConnection();
  
  // 检查JWT配置
  console.log('\n📋 检查JWT配置:');
  checkJWTSecret();
  
  console.log('\n==========================================');
  console.log('如果所有检查都通过，请尝试运行:');
  console.log('npm start');
  console.log('==========================================');
};

main().catch(console.error); 