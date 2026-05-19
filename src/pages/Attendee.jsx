import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, onSnapshot, query, where, orderBy, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase/config';

// --- COMPONENT THẺ CUỘC HỌP (MEETING CARD) ---
// Tách riêng thẻ này để quản lý trạng thái Điểm danh & Biểu quyết cho từng cuộc họp độc lập
const MeetingCard = ({ meeting, currentUser, rooms, users }) => {
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [myVote, setMyVote] = useState(null);

  // Lắng nghe trạng thái Điểm danh & Biểu quyết của User này trong cuộc họp
  useEffect(() => {
    if (!currentUser) return;

    // Lắng nghe Điểm danh
    const attRef = doc(db, "Meetings", meeting.id, "Attendances", currentUser.uid);
    const unsubAtt = onSnapshot(attRef, (docSnap) => {
      if (docSnap.exists()) {
        setHasCheckedIn(true);
      }
    });

    // Lắng nghe Biểu quyết
    const voteRef = doc(db, "Meetings", meeting.id, "Votes", currentUser.uid);
    const unsubVote = onSnapshot(voteRef, (docSnap) => {
      if (docSnap.exists()) {
        setMyVote(docSnap.data().vote);
      }
    });

    return () => {
      unsubAtt();
      unsubVote();
    };
  }, [meeting.id, currentUser]);

  // Hàm xử lý khi bấm Điểm danh
  const handleCheckIn = async () => {
    try {
      await setDoc(doc(db, "Meetings", meeting.id, "Attendances", currentUser.uid), {
        status: "Có mặt",
        timestamp: new Date()
      });
    } catch (error) {
      console.error("Lỗi điểm danh:", error);
      alert("Không thể điểm danh. Vui lòng kiểm tra kết nối mạng.");
    }
  };

  // Hàm xử lý khi bấm Biểu quyết
  const handleVote = async (voteType) => {
    if (!meeting.isVotingOpen) {
      alert("Cuộc họp chưa mở hoặc đã đóng chức năng biểu quyết!");
      return;
    }
    if (window.confirm(`Xác nhận gửi ý kiến biểu quyết: "${voteType}"?`)) {
      try {
        await setDoc(doc(db, "Meetings", meeting.id, "Votes", currentUser.uid), {
          vote: voteType,
          timestamp: new Date()
        });
      } catch (error) {
        console.error("Lỗi biểu quyết:", error);
        alert("Lỗi khi gửi biểu quyết.");
      }
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const dateObj = timestamp.toDate();
    const time = dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const date = dateObj.toLocaleDateString('vi-VN');
    return `${time} - ${date}`;
  };

  const getRoomName = (locationValue) => {
    const room = rooms.find(r => r.id === locationValue);
    return room ? (room.ten_phong || "Phòng không tên") : (locationValue || "Chưa cập nhật");
  };

  const getUserName = (uid) => {
    const user = users.find(u => u.id === uid);
    return user ? (user.fullName || user.email) : 'Không rõ';
  };

  const getPreviewUrl = (url) => {
    if (!url) return '';
    if (url.includes('google.com')) {
      return url.replace(/\/(edit|view).*$/, '/preview');
    }
    return url;
  };

  return (
    <div style={{ background: '#fff', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', marginBottom: '20px', borderLeft: '5px solid #0056b3' }}>
      <h3 style={{ marginTop: 0, color: '#0056b3', fontSize: '20px', marginBottom: '15px' }}>{meeting.topic}</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px', fontSize: '15px', color: '#495057' }}>
        <div><strong>🕒 Thời gian:</strong> {formatDate(meeting.startTime)}</div>
        <div><strong>📍 Địa điểm:</strong> {getRoomName(meeting.location)}</div>
        <div style={{ gridColumn: '1 / -1' }}><strong>👤 Chủ trì:</strong> {getUserName(meeting.chairUid)}</div>
      </div>

      <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <strong style={{ display: 'block', marginBottom: '10px', color: '#212529' }}>📎 Tài liệu đính kèm:</strong>
        {meeting.documents && meeting.documents.length > 0 ? (
          <ul style={{ margin: 0, paddingLeft: '20px', listStyleType: 'none' }}>
            {meeting.documents.map((doc, idx) => (
              <li key={idx} style={{ marginBottom: '8px' }}>
                📁 <a href={getPreviewUrl(doc.driveUrl)} target="_blank" rel="noopener noreferrer" style={{ color: '#17a2b8', textDecoration: 'none', fontWeight: '500' }}>
                  {doc.title}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <span style={{ color: '#adb5bd', fontSize: '14px' }}>Không có tài liệu</span>
        )}
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #e9ecef', margin: '20px 0' }} />

      {/* KHU VỰC THAO TÁC: ĐIỂM DANH & BIỂU QUYẾT */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
        
        {/* Khối Điểm danh */}
        <div style={{ flex: '1 1 200px' }}>
          <strong style={{ display: 'block', marginBottom: '10px', color: '#212529' }}>📋 Thao tác:</strong>
          {hasCheckedIn ? (
            <div style={{ padding: '12px', background: '#d4edda', color: '#155724', borderRadius: '6px', textAlign: 'center', fontWeight: 'bold', border: '1px solid #c3e6cb' }}>
              ✓ Đã điểm danh thành công
            </div>
          ) : (
            <button onClick={handleCheckIn} style={{ width: '100%', padding: '12px', background: '#28a745', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>
              Điểm danh dự họp
            </button>
          )}
        </div>

        {/* Khối Biểu quyết */}
        <div style={{ flex: '2 1 300px', background: '#fff3cd', padding: '15px', borderRadius: '8px', border: '1px solid #ffeeba' }}>
          <strong style={{ display: 'block', marginBottom: '10px', color: '#856404' }}>⚖️ Biểu quyết cuộc họp:</strong>
          
          {!meeting.isVotingOpen ? (
            <div style={{ color: '#856404', fontStyle: 'italic', fontSize: '14px' }}>Chủ trì chưa mở biểu quyết.</div>
          ) : myVote ? (
            <div style={{ padding: '10px', background: '#ffffff', borderRadius: '6px', textAlign: 'center', border: '1px solid #ced4da', fontWeight: '500', color: '#495057' }}>
              Bạn đã chọn: <strong style={{ color: myVote === 'Tán thành' ? '#28a745' : myVote === 'Không tán thành' ? '#dc3545' : '#ffc107' }}>{myVote}</strong>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => handleVote('Tán thành')} style={{ flex: 1, padding: '10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Tán thành</button>
              <button onClick={() => handleVote('Không tán thành')} style={{ flex: 1, padding: '10px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Không tán thành</button>
              <button onClick={() => handleVote('Ý kiến khác')} style={{ flex: 1, padding: '10px', background: '#ffc107', color: '#212529', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Ý kiến khác</button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

// --- MÀN HÌNH CHÍNH CHO ĐẠI BIỂU ---
export default function Attendee() {
  const [meetings, setMeetings] = useState([]);
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  // Kiểm tra đăng nhập
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        navigate('/login');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // Load danh sách Users và Rooms
  useEffect(() => {
    const fetchAuxData = async () => {
      const usersSnap = await getDocs(collection(db, "Users"));
      const usersList = [];
      usersSnap.forEach(doc => usersList.push({ id: doc.id, ...doc.data() }));
      setUsers(usersList);

      const roomsSnap = await getDocs(collection(db, "Rooms"));
      const roomsList = [];
      roomsSnap.forEach(doc => roomsList.push({ id: doc.id, ...doc.data() }));
      setRooms(roomsList);
    };
    fetchAuxData();
  }, []);

  // Lắng nghe các cuộc họp được mời tham gia
  useEffect(() => {
    if (!currentUser) return;

    // QUAN TRỌNG: Chỉ lấy những meeting mà mảng attendeeUids có chứa UID của người đang đăng nhập
    const q = query(
      collection(db, "Meetings"), 
      where("attendeeUids", "array-contains", currentUser.uid),
      // Xếp theo thời gian có thể cần phải tạo Index trên Firebase, nếu lỗi thì tạm thời bỏ orderBy
      // orderBy("startTime", "desc") 
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const meetingsList = [];
      snapshot.forEach((doc) => {
        meetingsList.push({ id: doc.id, ...doc.data() });
      });
      // Sắp xếp thủ công tại máy khách nếu không dùng orderBy ở query
      meetingsList.sort((a, b) => b.startTime.toMillis() - a.startTime.toMillis());
      setMeetings(meetingsList);
    }, (error) => {
      console.error("Lỗi khi load danh sách họp:", error);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      alert("Lỗi đăng xuất");
    }
  };

  return (
    <div style={{ backgroundColor: '#f0f2f5', minHeight: '100vh', paddingBottom: '50px', fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
      
      <div style={{ background: '#0056b3', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img src="/logo.png" alt="Logo" style={{ height: '45px', width: 'auto', objectFit: 'contain' }} />
          <h2 style={{ color: '#ffffff', margin: 0, fontSize: '22px' }}>Cổng Thông Tin Đại Biểu</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ color: '#ffffff', fontWeight: '500' }}>
            Xin chào, {users.find(u => u.id === currentUser?.uid)?.fullName || currentUser?.email || 'Đại biểu'}
          </span>
          <button onClick={handleLogout} style={{ padding: '8px 15px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            Đăng xuất
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '30px auto', padding: '0 15px' }}>
        <h2 style={{ color: '#333', borderBottom: '2px solid #0056b3', paddingBottom: '10px', marginBottom: '30px' }}>
          Danh sách cuộc họp của bạn
        </h2>

        {meetings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px', background: 'white', borderRadius: '10px', color: '#6c757d' }}>
            <h3>Bạn hiện không có lịch họp nào.</h3>
            <p>Hệ thống sẽ tự động cập nhật khi có giấy mời mới.</p>
          </div>
        ) : (
          meetings.map(meeting => (
            <MeetingCard 
              key={meeting.id} 
              meeting={meeting} 
              currentUser={currentUser} 
              rooms={rooms} 
              users={users} 
            />
          ))
        )}
      </div>
    </div>
  );
}