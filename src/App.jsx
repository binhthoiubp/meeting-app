import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Admin from './pages/Admin';
import Chair from './pages/Chair';
import Attendee from './pages/Attendee';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Đường dẫn mặc định trỏ về trang đăng nhập */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Sửa đúng cú pháp không dùng ngoặc kép */}
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/chair" element={<Chair />} />
        <Route path="/attendee" element={<Attendee />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;