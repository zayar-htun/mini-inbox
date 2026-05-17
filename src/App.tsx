import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import InboxPage from "./pages/InboxPage";
import PublicContactPage from "./pages/PublicContactPage";

export default function App() {
  return (
    <div className="min-h-screen">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/inbox" element={<InboxPage />} />
        <Route path="/c/:agencySlug" element={<PublicContactPage />} />
      </Routes>
    </div>
  );
}
