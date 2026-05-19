import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, onSnapshot, query, where, updateDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase/config';

// --- COMPONENT BẢNG ĐIỀU KHIỂN CHO TỪNG CUỘC HỌP ---
const MeetingControlCard = ({ meeting, users, rooms, currentUser }) => {
  const [attendances, setAttendances] = useState({});
  const [votes, setVotes] = useState({});

  useEffect(() => {
    // Lắng nghe danh sách điểm danh
    const unsubAtt = onSnapshot(collection(db, "Meetings", meeting.id, "Attendances"), (snapshot) => {
      const attData = {};
      snapshot.forEach(doc => {
        attData[doc.id] = doc.data();
      });
      setAttendances(attData);
    });

    // Lắng nghe danh sách biểu quyết
    const unsubVote = onSnapshot(collection(db, "Meetings", meeting.id, "Votes"), (snapshot) => {
      const voteData = {};
      snapshot.forEach(doc => {
        voteData[doc.id] = doc.data().vote;
      });
      setVotes(voteData);
    });

    return () => {
      unsubAtt();
      unsubVote();
    };
  }, [meeting.id]);

  // Hàm Đóng/Mở biểu quyết toàn cuộc họp
  const toggleVoting = async () => {
    try {
      const meetingRef = doc(db, "Meetings", meeting.id);
      await updateDoc(meetingRef, {
        isVotingOpen: !meeting.isVotingOpen
      });
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái biểu quyết:", error);
      alert("Không thể thay đổi trạng thái biểu quyết.");
    }
  };

  // Hàm thực hiện Điểm danh cho Chủ trì
  const handleChairCheckIn = async () => {
    try {
      await setDoc(doc(db, "Meetings", meeting.id, "Attendances", currentUser.uid), {
        status: "Có mặt",
        timestamp: new Date()
      });
    } catch (error) {
      console.error("Lỗi điểm danh Chủ trì:", error);
      alert("Không thể điểm danh. Vui lòng kiểm tra lại.");
    }
  };

  // Hàm thực hiện Biểu quyết cho Chủ trì
  const handleChairVote = async (voteType) => {
    if (!meeting.isVotingOpen) {
      alert("Biểu quyết đang đóng, không thể bỏ phiếu!");
      return;
    }
    if (window.confirm(`Xác nhận gửi ý kiến biểu quyết của Chủ trì: "${voteType}"?`)) {
      try {
        await setDoc(doc(db, "Meetings", meeting.id, "Votes", currentUser.uid), {
          vote: voteType,
          timestamp: new Date()
        });
      } catch (error) {
        console.error("Lỗi biểu quyết Chủ trì:", error);
        alert("Lỗi khi gửi biểu quyết.");
      }
    }
  };

  const getRoomName = (locationValue) => {
    const room = rooms.find(r => r.id === locationValue);
    return room ? (room.ten_phong || room.name || room.RoomName || "Phòng không tên") : (locationValue || "Chưa cập nhật");
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

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const dateObj = timestamp.toDate();
    const time = dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const date = dateObj.toLocaleDateString('vi-VN');
    return `${time} - ${date}`;
  };

  // --- TÍNH TOÁN THỐNG KÊ BIỂU QUYẾT CHÍNH XÁC ---
  const totalAttendees = meeting.attendeeUids ? meeting.attendeeUids.length : 0;
  // Kiểm tra xem Chủ trì có bị trùng trong danh sách Đại biểu hay không để tính tổng số người hợp lệ
  const isChairInAttendees = meeting.attendeeUids?.includes(meeting.chairUid);
  const totalEligibleVoters = totalAttendees + (isChairInAttendees ? 0 : 1);

  const voteCounts = {
    'Tán thành': 0,
    'Không tán thành': 0,
    'Ý kiến khác': 0,
    'Chưa biểu quyết': 0
  };
  
  // Đếm số lượng phiếu thực tế đã nộp lên hệ thống
  Object.values(votes).forEach(vote => {
    if (voteCounts[vote] !== undefined) voteCounts[vote]++;
  });
  
  // Số người chưa biểu quyết = Tổng số người có quyền - Số người đã gửi phiếu
  voteCounts['Chưa biểu quyết'] = totalEligibleVoters - Object.keys(votes).length;

  const chairCheckedIn = attendances[currentUser?.uid];
  const chairVoteValue = votes[currentUser?.uid];

  return (
    <div style={{ background: '#fff', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', marginBottom: '30px', borderLeft: '5px solid #ffc107' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ marginTop: 0, color: '#333', fontSize: '20px', marginBottom: '10px' }}>{meeting.topic}</h3>
          <div style={{ fontSize: '15px', color: '#495057', marginBottom: '15px' }}>
            <span style={{ marginRight: '15px' }}><strong>🕒 Thời gian:</strong> {formatDate(meeting.startTime)}</span>
            <span style={{ background: '#e9ecef', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>📍 Địa điểm: {getRoomName(meeting.location)}</span>
          </div>
        </div>

        {/* Nút điểm danh Chủ trì */}
        <div>
          {chairCheckedIn ? (
            <span style={{ padding: '8px 15px', background: '#d4edda', color: '#155724', borderRadius: '4px', fontWeight: 'bold', border: '1px solid #c3e6cb', display: 'inline-block' }}>
              ✓ Bạn đã điểm danh
            </span>
          ) : (
            <button onClick={handleChairCheckIn} style={{ padding: '8px 15px', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              Điểm danh Chủ trì
            </button>
          )}
        </div>
      </div>

      {/* Danh sách tài liệu cuộc họp */}
      <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #dee2e6' }}>
        <strong style={{ display: 'block', marginBottom: '10px', color: '#212529' }}>📎 Tài liệu cuộc họp:</strong>
        {meeting.documents && meeting.documents.length > 0 ? (
          <ul style={{ margin: 0, paddingLeft: '20px', listStyleType: 'none' }}>
            {meeting.documents.map((doc, idx) => (
              <li key={idx} style={{ marginBottom: '8px' }}>
                📁 <a href={getPreviewUrl(doc.driveUrl)} target="_blank" rel="noopener noreferrer" style={{ color: '#0056b3', textDecoration: 'none', fontWeight: '500' }}>
                  {doc.title}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <span style={{ color: '#adb5bd', fontSize: '14px' }}>Không có tài liệu đính kèm</span>
        )}
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #e9ecef', margin: '15px 0' }} />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
        
        {/* CỘT 1: TÌNH HÌNH ĐIỂM DANH ĐẠI BIỂU */}
        <div style={{ flex: '1 1 300px', background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <h4 style={{ marginTop: 0, color: '#0056b3', display: 'flex', justifyContent: 'space-between' }}>
            <span>📋 Điểm danh đại biểu</span>
            <span style={{ fontSize: '14px', background: '#0056b3', color: 'white', padding: '2px 8px', borderRadius: '12px' }}>
              {meeting.attendeeUids ? meeting.attendeeUids.filter(uid => attendances[uid]).length : 0} / {totalAttendees}
            </span>
          </h4>
          
          <ul style={{ listStyleType: 'none', padding: 0, margin: 0, maxHeight: '240px', overflowY: 'auto' }}>
            {meeting.attendeeUids && meeting.attendeeUids.length > 0 ? (
              meeting.attendeeUids.map(uid => (
                <li key={uid} style={{ padding: '8px 0', borderBottom: '1px dashed #ced4da', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px' }}>{getUserName(uid)}</span>
                  {attendances[uid] ? (
                    <span style={{ color: '#28a745', fontSize: '12px', fontWeight: 'bold', background: '#d4edda', padding: '2px 6px', borderRadius: '4px' }}>Có mặt</span>
                  ) : (
                    <span style={{ color: '#dc3545', fontSize: '12px', background: '#f8d7da', padding: '2px 6px', borderRadius: '4px' }}>Vắng</span>
                  )}
                </li>
              ))
            ) : (
              <li style={{ color: '#6c757d', fontSize: '14px', fontStyle: 'italic' }}>Không có thành phần dự họp</li>
            )}
          </ul>
        </div>

        {/* CỘT 2: KHU VỰC ĐIỀU HÀNH & BỎ PHIẾU BIỂU QUYẾT */}
        <div style={{ flex: '1 1 300px', background: '#fff3cd', padding: '15px', borderRadius: '8px', border: '1px solid #ffeeba', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h4 style={{ margin: 0, color: '#856404' }}>⚖️ Kiểm phiếu & Biểu quyết</h4>
              <button 
                onClick={toggleVoting} 
                style={{ 
                  padding: '6px 12px', 
                  background: meeting.isVotingOpen ? '#dc3545' : '#28a745', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px', 
                  cursor: 'pointer', 
                  fontWeight: 'bold',
                  fontSize: '13px'
                }}
              >
                {meeting.isVotingOpen ? 'Khóa biểu quyết' : 'Mở biểu quyết'}
              </button>
            </div>

            {/* Thống kê phiếu tự động nhảy số */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', padding: '6px 10px', background: '#fff', borderRadius: '4px', borderLeft: '4px solid #28a745' }}>
                <span>Tán thành:</span> <strong>{voteCounts['Tán thành']} phiếu</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', padding: '6px 10px', background: '#fff', borderRadius: '4px', borderLeft: '4px solid #dc3545' }}>
                <span>Không tán thành:</span> <strong>{voteCounts['Không tán thành']} phiếu</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', padding: '6px 10px', background: '#fff', borderRadius: '4px', borderLeft: '4px solid #ffc107' }}>
                <span>Ý kiến khác:</span> <strong>{voteCounts['Ý kiến khác']} phiếu</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', padding: '6px 10px', background: '#fff', borderRadius: '4px', borderLeft: '4px solid #6c757d', color: '#6c757d' }}>
                <span>Chưa biểu quyết:</span> <strong>{voteCounts['Chưa biểu quyết']} người</strong>
              </div>
            </div>
          </div>

          {/* CHỨC NĂNG MỚI: Dành riêng cho Chủ trì bỏ phiếu biểu quyết */}
          <div style={{ background: '#ffffff', padding: '12px', borderRadius: '6px', border: '1px dashed #b58900', marginTop: 'auto' }}>
            <strong style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#856404' }}>
              👉 Ý kiến biểu quyết của Bạn (Chủ trì):
            </strong>
            {!meeting.isVotingOpen ? (
              <div style={{ color: '#6c757d', fontStyle: 'italic', fontSize: '13px', textAlign: 'center' }}>Chức năng biểu quyết đang đóng</div>
            ) : chairVoteValue ? (
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#212529', textAlign: 'center', padding: '4px' }}>
                Bạn đã chọn: <span style={{ color: chairVoteValue === 'Tán thành' ? '#28a745' : chairVoteValue === 'Không tán thành' ? '#dc3545' : '#ffc107' }}>{chairVoteValue}</span>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '5px' }}>
                <button onClick={() => handleChairVote('Tán thành')} style={{ flex: 1, padding: '6px 4px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Tán thành</button>
                <button onClick={() => handleChairVote('Không tán thành')} style={{ flex: 1, padding: '6px 4px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Không T.T</button>
                <button onClick={() => handleChairVote('Ý kiến khác')} style={{ flex: 1, padding: '6px 4px', background: '#ffc107', color: '#212529', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Ý kiến khác</button>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

// --- MÀN HÌNH CHÍNH CHO CHỦ TRÌ ---
export default function Chair() {
  const [meetings, setMeetings] = useState([]);
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

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

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "Meetings"), 
      where("chairUid", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const meetingsList = [];
      snapshot.forEach((doc) => {
        meetingsList.push({ id: doc.id, ...doc.data() });
      });
      meetingsList.sort((a, b) => b.startTime.toMillis() - a.startTime.toMillis());
      setMeetings(meetingsList);
    }, (error) => {
      console.error("Lỗi khi load danh sách họp Chủ trì:", error);
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
    <div style={{ backgroundColor: '#f4f6f9', minHeight: '100vh', paddingBottom: '50px', fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
      
      <div style={{ background: '#343a40', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img src="/logo.png" alt="Logo" style={{ height: '45px', width: 'auto', objectFit: 'contain' }} />
          <h2 style={{ color: '#ffffff', margin: 0, fontSize: '22px' }}>Không Gian Điều Hành Của Chủ Trì</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ color: '#ffffff', fontWeight: '500' }}>
            Xin chào, {users.find(u => u.id === currentUser?.uid)?.fullName || currentUser?.email || 'Chủ trì'}
          </span>
          <button onClick={handleLogout} style={{ padding: '8px 15px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            Đăng xuất
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '1000px', margin: '30px auto', padding: '0 15px' }}>
        <h2 style={{ color: '#333', borderBottom: '2px solid #ffc107', paddingBottom: '10px', marginBottom: '30px' }}>
          Cuộc họp bạn đang chủ trì
        </h2>

        {meetings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px', background: 'white', borderRadius: '10px', color: '#6c757d' }}>
            <h3>Bạn hiện không chủ trì cuộc họp nào.</h3>
            <p>Hệ thống sẽ cập nhật khi Quản trị viên phân công.</p>
          </div>
        ) : (
          meetings.map(meeting => (
            <MeetingControlCard 
              key={meeting.id} 
              meeting={meeting} 
              users={users} 
              rooms={rooms} 
              currentUser={currentUser}
            />
          ))
        )}
      </div>
    </div>
  );
}