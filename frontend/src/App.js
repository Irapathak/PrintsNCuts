// frontend/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainPage from './Pages/MainPage';
import Dashboard from './Pages/Dashboard';
import SellerForm from './Pages/SellerForm';
import BuyerAuth from './Pages/BuyerAuth';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/buyer" element={<Dashboard />} />
        <Route path="/buyer-auth" element={<BuyerAuth />} />
        <Route path="/seller" element={<SellerForm />} />
      </Routes>
    </Router>
  );
}

export default App;
