import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp, onSnapshot, query, orderBy } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase/config';

export default function Admin() {
  const [topic, setTopic] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [location, setLocation] = useState(''); 
  const [documentsList, setDocumentsList] = useState([{ title: '', driveUrl: '' }]);
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]); 
  const [chairUid, setChairUid] = useState('');
  const [selectedAttendees, setSelectedAttendees] = useState([]);
  const [meetings, setMeetings] = useState([]);
  
  const [editingMeetingId, setEditingMeetingId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsersAndRooms = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, "Users"));
        const usersList = [];
        usersSnapshot.forEach((doc) => {
          usersList.push({ id: doc.id, ...doc.data() });
        });
        setUsers(usersList);
      } catch (err) {
        console.error("Lỗi lấy danh sách Users:", err);
      }

      try {
        const roomsSnapshot = await getDocs(collection(db, "Rooms"));
        const roomsList = [];
        roomsSnapshot.forEach((doc) => {
          roomsList.push({ id: doc.id, ...doc.data() });
        });
        setRooms(roomsList);
      } catch (err) {
        console.error("LỖI KẾT NỐI FIRESTORE tại bảng 'Rooms':", err);
      }
    };
    fetchUsersAndRooms();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "Meetings"), orderBy("startTime", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const meetingsList = [];
      snapshot.forEach((doc) => {
        meetingsList.push({ id: doc.id, ...doc.data() });
      });
      setMeetings(meetingsList);
    });
    return () => unsubscribe();
  }, []);

  const handleCheckboxChange = (uid) => {
    if (selectedAttendees.includes(uid)) {
      setSelectedAttendees(selectedAttendees.filter(id => id !== uid));
    } else {
      setSelectedAttendees([...selectedAttendees, uid]);
    }
  };

  const handleDocChange = (index, field, value) => {
    const newDocs = [...documentsList];
    newDocs[index][field] = value;
    setDocumentsList(newDocs);
  };

  const addDocField = () => {
    setDocumentsList([...documentsList, { title: '', driveUrl: '' }]);
  };

  const removeDocField = (index) => {
    const newDocs = documentsList.filter((_, i) => i !== index);
    setDocumentsList(newDocs);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa cuộc họp này không?")) {
      try {
        await deleteDoc(doc(db, "Meetings", id));
      } catch (error) {
        console.error("Lỗi khi xóa: ", error);
        alert("Có lỗi xảy ra khi xóa cuộc họp.");
      }
    }
  };

  const handleEdit = (meeting) => {
    setTopic(meeting.topic);
    setLocation(meeting.location || ''); 
    
    if (meeting.startTime) {
      const dateObj = meeting.startTime.toDate();
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      setMeetingDate(`${year}-${month}-${day}`);
      
      const hours = String(dateObj.getHours()).padStart(2, '0');
      const minutes = String(dateObj.getMinutes()).padStart(2, '0');
      setMeetingTime(`${hours}:${minutes}`);
    }

    setChairUid(meeting.chairUid || '');
    setSelectedAttendees(meeting.attendeeUids || []);
    
    if (meeting.documents && meeting.documents.length > 0) {
      setDocumentsList(meeting.documents);
    } else {
      setDocumentsList([{ title: '', driveUrl: '' }]);
    }

    setEditingMeetingId(meeting.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const combinedDateTimeString = `${meetingDate}T${meetingTime}`;
      const combinedDateObj = new Date(combinedDateTimeString);
      const validDocs = documentsList.filter(doc => doc.title.trim() !== '' && doc.driveUrl.trim() !== '');

      const meetingData = {
        topic: topic,
        startTime: Timestamp.fromDate(combinedDateObj),
        location: location, 
        chairUid: chairUid,
        attendeeUids: selectedAttendees,
        documents: validDocs, 
        isVotingOpen: true
      };

      if (editingMeetingId) {
        await updateDoc(doc(db, "Meetings", editingMeetingId), meetingData);
        alert("Cập nhật cuộc họp thành công!");
        setEditingMeetingId(null);
      } else {
        await addDoc(collection(db, "Meetings"), meetingData);
        alert("Tạo cuộc họp thành công!");
      }
      
      setTopic(''); 
      setMeetingDate(''); 
      setMeetingTime(''); 
      setLocation(''); 
      setDocumentsList([{ title: '', driveUrl: '' }]); 
      setChairUid(''); 
      setSelectedAttendees([]);
    } catch (error) {
      console.error("Lỗi lưu dữ liệu: ", error);
      alert("Có lỗi xảy ra khi lưu cuộc họp.");
    }
  };

  const handleCancelEdit = () => {
    setEditingMeetingId(null);
    setTopic(''); 
    setMeetingDate(''); 
    setMeetingTime(''); 
    setLocation('');
    setDocumentsList([{ title: '', driveUrl: '' }]); 
    setChairUid(''); 
    setSelectedAttendees([]);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Lỗi đăng xuất:", error);
      alert("Không thể đăng xuất. Vui lòng thử lại.");
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const dateObj = timestamp.toDate();
    const time = dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const date = dateObj.toLocaleDateString('vi-VN');
    return `${time} - ${date}`;
  };

  const getUserName = (uid) => {
    const user = users.find(u => u.id === uid);
    return user ? (user.fullName || user.email) : 'Không rõ';
  };

  // --- HÀM TỐI ƯU: Đọc đúng cột "ten_phong" từ Firebase ---
  const getRoomName = (locationValue) => {
    if (!locationValue) return <span style={{ color: '#adb5bd', fontWeight: 'normal' }}>Chưa cập nhật</span>;
    // So khớp ID với danh sách phòng
    const room = rooms.find(r => r.id === locationValue);
    // Nếu có dữ liệu phòng, lấy chính xác cột "ten_phong". Nếu không tìm thấy, trả về ID ban đầu (phòng trường hợp lỗi).
    return room ? (room.ten_phong || "Phòng không tên") : locationValue;
  };

  const getPreviewUrl = (url) => {
    if (!url) return '';
    if (url.includes('google.com')) {
      return url.replace(/\/(edit|view).*$/, '/preview');
    }
    return url;
  };

  return (
    <div style={{ backgroundColor: '#f0f2f5', minHeight: '100vh', paddingBottom: '50px', fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
      
      <style>{`
        .header-title-text { color: #ffffff !important; font-weight: bold !important; margin: 0 !important; font-size: 22px !important; }
        .form-section-title { color: #212529 !important; font-weight: bold !important; text-align: center !important; }
        .custom-label { color: #212529 !important; font-weight: 600 !important; margin-bottom: 8px !important; display: block !important; }
        .checkbox-text { color: #212529 !important; font-size: 14px !important; }
        .custom-input { width: 100%; padding: 10px; border: 1px solid #ced4da; border-radius: 6px; box-sizing: border-box; transition: border-color 0.2s; color: #212529 !important; background-color: #ffffff !important; }
        .custom-input:focus { border-color: #0056b3; outline: none; box-shadow: 0 0 0 3px rgba(0,86,179,0.1); }
        .table-head-text { color: #212529 !important; font-weight: 600 !important; padding: 15px 10px; }
        .table-body-text { color: #212529 !important; padding: 15px 10px; }
        .hover-row:hover { background-color: #f8f9fa; }
        .btn { padding: 10px 15px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; transition: opacity 0.2s; }
        .btn:hover { opacity: 0.9; }
        .doc-row { background: #ffffff; border: 1px solid #ced4da; padding: 15px; border-radius: 8px; margin-bottom: 12px; display: flex; gap: 15px; align-items: flex-end; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
      `}</style>

      <div style={{ background: '#0056b3', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img src="/logo.png" alt="Logo" style={{ height: '45px', width: 'auto', objectFit: 'contain' }} />
          <h2 className="header-title-text">Hệ Thống Quản Trị Cuộc Họp</h2>
        </div>
        <button onClick={handleLogout} className="btn" style={{ background: '#dc3545', color: 'white' }}>Đăng xuất</button>
      </div>

      <div style={{ maxWidth: '1100px', margin: '30px auto', padding: '0 15px' }}>
        
        <div style={{ background: 'white', padding: '30px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <h2 className="form-section-title" style={{ marginTop: '0', marginBottom: '25px' }}>
            {editingMeetingId ? 'Cập Nhật Cuộc Họp' : 'Khởi Tạo Cuộc Họp Mới'}
          </h2>
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div>
              <label className="custom-label">Nội dung cuộc họp <span style={{color:'red'}}>*</span></label>
              <input type="text" className="custom-input" placeholder="VD: Họp giao ban công tác tháng..." value={topic} onChange={(e) => setTopic(e.target.value)} required />
            </div>

            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px' }}>
                <label className="custom-label">Ngày họp <span style={{color:'red'}}>*</span></label>
                <input type="date" className="custom-input" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} required />
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <label className="custom-label">Giờ họp <span style={{color:'red'}}>*</span></label>
                <input type="time" className="custom-input" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} required />
              </div>
            </div>

            <div>
              <label className="custom-label">Địa điểm phòng họp <span style={{color:'red'}}>*</span></label>
              <select className="custom-input" value={location} onChange={(e) => setLocation(e.target.value)} required>
                <option value="">-- Chọn địa điểm phòng họp --</option>
                {rooms.map(room => (
                  // Đọc thẳng vào cột ten_phong cho form thả xuống
                  <option key={room.id} value={room.id}>
                    {room.ten_phong || "Phòng không tên"}
                  </option> 
                ))}
              </select>
            </div>

            <div>
              <label className="custom-label">Chủ trì cuộc họp <span style={{color:'red'}}>*</span></label>
              <select className="custom-input" value={chairUid} onChange={(e) => setChairUid(e.target.value)} required>
                <option value="">-- Chọn cán bộ chủ trì --</option>
                {users.filter(user => user.role === 'chair').map(user => (
                  <option key={user.id} value={user.id}>{user.fullName || user.email}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="custom-label">Thành phần dự họp <span style={{color:'red'}}>*</span></label>
              <div style={{ border: '1px solid #ced4da', borderRadius: '6px', padding: '10px', maxHeight: '200px', overflowY: 'auto', background: '#fcfcfc' }}>
                {users.filter(user => user.role === 'chair' || user.role === 'attendee').map(user => (
                  <label key={user.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedAttendees.includes(user.id)}
                      onChange={() => handleCheckboxChange(user.id)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <span className="checkbox-text">{user.fullName || user.email}</span>
                  </label>
                ))}
                {users.filter(user => user.role === 'chair' || user.role === 'attendee').length === 0 && (
                  <span style={{ color: '#888', fontStyle: 'italic', fontSize: '14px' }}>Không có dữ liệu cán bộ</span>
                )}
              </div>
            </div>

            <div style={{ background: '#f8f9fa', padding: '20px', border: '1px solid #e9ecef', borderRadius: '8px' }}>
              <label className="custom-label" style={{ marginBottom: '15px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📎 Tài liệu đính kèm (Google Drive)
              </label>
              
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {documentsList.map((doc, index) => (
                  <div key={index} className="doc-row">
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '13px', color: '#6c757d', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>📄 Tên tài liệu:</span>
                      <input type="text" className="custom-input" placeholder="VD: Báo cáo tình hình..." value={doc.title} onChange={(e) => handleDocChange(index, 'title', e.target.value)} required />
                    </div>
                    
                    <div style={{ flex: 2 }}>
                      <span style={{ fontSize: '13px', color: '#6c757d', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>🔗 Đường dẫn (URL):</span>
                      <input type="url" className="custom-input" placeholder="https://drive.google.com/..." value={doc.driveUrl} onChange={(e) => handleDocChange(index, 'driveUrl', e.target.value)} required />
                    </div>
                    
                    {documentsList.length > 1 && (
                      <button type="button" className="btn" onClick={() => removeDocField(index)} style={{ background: '#f8d7da', color: '#721c24', padding: '10px 15px', height: '42px' }} title="Xóa tài liệu này">✕</button>
                    )}
                  </div>
                ))}
              </div>
              
              <button type="button" className="btn" onClick={addDocField} style={{ background: '#e2e3e5', color: '#383d41', fontSize: '14px', marginTop: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>+</span> Thêm tài liệu khác
              </button>
            </div>

            <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
              <button type="submit" className="btn" style={{ flex: 1, background: editingMeetingId ? '#ffc107' : '#28a745', color: '#212529', fontSize: '16px', padding: '12px' }}>
                {editingMeetingId ? 'Cập Nhật Cuộc Họp' : 'Lưu Cuộc Họp'}
              </button>
              
              {editingMeetingId && (
                <button type="button" className="btn" onClick={handleCancelEdit} style={{ background: '#6c757d', color: 'white', padding: '12px 30px' }}>Hủy thao tác</button>
              )}
            </div>
          </form>
        </div>

        <div style={{ background: 'white', padding: '30px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginTop: '40px' }}>
          <h2 className="form-section-title" style={{ marginTop: '0', marginBottom: '25px' }}>Danh Sách Cuộc Họp</h2>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f1f3f5', borderBottom: '2px solid #dee2e6' }}>
                  <th className="table-head-text">Nội dung</th>
                  <th className="table-head-text">Thời gian</th>
                  <th className="table-head-text">Địa điểm</th>
                  <th className="table-head-text">Chủ trì</th>
                  <th className="table-head-text" style={{ width: '20%' }}>Thành phần</th>
                  <th className="table-head-text">Tài liệu</th>
                  <th className="table-head-text" style={{ textAlign: 'center', width: '140px' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {meetings.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#6c757d' }}>Chưa có cuộc họp nào trên hệ thống</td>
                  </tr>
                ) : (
                  meetings.map(meeting => (
                    <tr key={meeting.id} className="hover-row" style={{ borderBottom: '1px solid #e9ecef' }}>
                      <td className="table-body-text" style={{ fontWeight: '500', color: '#0056b3' }}>{meeting.topic}</td>
                      <td className="table-body-text">{formatDate(meeting.startTime)}</td>
                      
                      <td className="table-body-text" style={{ fontWeight: '500', color: '#495057' }}>
                        {getRoomName(meeting.location)}
                      </td>
                      
                      <td className="table-body-text">{getUserName(meeting.chairUid)}</td>
                      <td className="table-body-text" style={{ fontSize: '14px', lineHeight: '1.5' }}>
                        {meeting.attendeeUids && meeting.attendeeUids.length > 0 
                          ? meeting.attendeeUids.map(uid => getUserName(uid)).join(', ') 
                          : <span style={{ color: '#adb5bd' }}>Trống</span>}
                      </td>
                      <td className="table-body-text" style={{ fontSize: '14px' }}>
                        {meeting.documents && meeting.documents.length > 0 ? (
                          <ul style={{ paddingLeft: '15px', margin: 0, listStyleType: 'none' }}>
                            {meeting.documents.map((doc, idx) => (
                              <li key={idx} style={{ marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                📁 <a href={getPreviewUrl(doc.driveUrl)} target="_blank" rel="noopener noreferrer" style={{ color: '#17a2b8', textDecoration: 'none', fontWeight: '500' }}>
                                  {doc.title}
                                </a>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span style={{ color: '#adb5bd' }}>Không có</span>
                        )}
                      </td>
                      <td className="table-body-text" style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button onClick={() => handleEdit(meeting)} className="btn" style={{ background: '#ffc107', color: '#212529', padding: '6px 12px', fontSize: '13px' }}>Sửa</button>
                          <button onClick={() => handleDelete(meeting.id)} className="btn" style={{ background: '#dc3545', color: 'white', padding: '6px 12px', fontSize: '13px' }}>Xóa</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}