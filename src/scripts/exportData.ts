// 导出localStorage中的数据
const exportData = () => {
  const data = {
    users: localStorage.getItem('users'),
    pets: localStorage.getItem('pets'),
    notifications: localStorage.getItem('notifications')
  };

  // 创建下载链接
  const dataStr = JSON.stringify(data, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  
  // 创建下载链接并点击
  const link = document.createElement('a');
  link.href = url;
  link.download = 'pet-shop-data.json';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default exportData; 