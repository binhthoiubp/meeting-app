import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config'; // File cấu hình ở giai đoạn trước

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      // 1. Xác thực qua Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Truy vấn role của cán bộ từ Firestore
      const userDocRef = doc(db, 'Users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const role = userData.role;

        // 3. Điều hướng dựa trên phân quyền
        if (role === 'admin') {
          navigate('/admin');
        } else if (role === 'chair') {
          navigate('/chair');
        } else if (role === 'attendee') {
          navigate('/attendee');
        } else {
          setError('Tài khoản chưa được phân quyền hợp lệ.');
        }
      } else {
        setError('Không tìm thấy thông tin hồ sơ cán bộ trên hệ thống.');
      }
    } catch (err) {
      setError('Đăng nhập thất bại. Vui lòng kiểm tra lại email hoặc mật khẩu.');
      console.error(err);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', fontFamily: 'sans-serif' }}>
      <h2>Đăng nhập Hệ thống Quản lý Cuộc họp</h2>
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input 
          type="email" 
          placeholder="Email định danh" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required 
          style={{ padding: '10px' }}
        />
        <input 
          type="password" 
          placeholder="Mật khẩu" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required 
          style={{ padding: '10px' }}
        />
        <button type="submit" style={{ padding: '10px', background: '#0056b3', color: 'white', border: 'none' }}>
          Đăng nhập
        </button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </form>
    </div>
  );
}