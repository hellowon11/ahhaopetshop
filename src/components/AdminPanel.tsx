import React from 'react';
import exportData from '../scripts/exportData';

const AdminPanel: React.FC = () => {
  const handleExportData = () => {
    exportData();
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">管理员面板</h2>
      <div className="space-y-4">
        <button
          onClick={handleExportData}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          导出数据
        </button>
        <p className="text-sm text-gray-600">
          点击此按钮导出当前localStorage中的所有数据，用于迁移到新数据库。
        </p>
      </div>
    </div>
  );
};

export default AdminPanel; 