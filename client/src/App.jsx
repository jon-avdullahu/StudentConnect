import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import CreateListing from './pages/CreateListing';
import ListingDetail from './pages/ListingDetail';
import Messages from './pages/Messages';
import ProfileSettings from './pages/ProfileSettings';
import FindRoommates from './pages/FindRoommates';
import StudentPublicProfile from './pages/StudentPublicProfile';
import AdminReports from './pages/AdminReports';

function App() {
  return (
    <Router>
      <div className="min-h-screen relative selection:bg-blue-500/30">
        <div className="absolute inset-0 -z-10 h-full w-full bg-white">
          <div className="absolute bottom-0 left-0 right-0 top-0 bg-[radial-gradient(ellipse_800px_800px_at_50%_-20%,rgba(120,170,255,0.15),rgba(255,255,255,0))]"></div>
        </div>
        <Navbar />
        <main className="w-full">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/create" element={<CreateListing />} />
            <Route path="/listing/:id" element={<ListingDetail />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/messages/:userId" element={<Messages />} />
            <Route path="/settings" element={<ProfileSettings />} />
            <Route path="/roommates" element={<FindRoommates />} />
            <Route path="/students/:id" element={<StudentPublicProfile />} />
            <Route path="/admin/reports" element={<AdminReports />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
