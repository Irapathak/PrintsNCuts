
import React from 'react';
import { useNavigate } from 'react-router-dom';

const MainPage = () => {
  const navigate = useNavigate();

  const handleBuyerClick = () => {
    navigate('/buyer');
  };

  const handleSellerClick = () => {
    navigate('/seller');
  };

  return (
    <div className="bg-blue-600 text-white p-4">
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <h1 className="text-4xl font-bold mb-8 text-blue-600">Welcome to PrintsNCuts!</h1>
      <div className="text-lg text-gray-600 mb-8 whitespace-pre-line px-6 py-4 text-center bg-gray-100 rounded shadow">
        {`A simple and seamless platform that connects creators and shoppers.
Whether you're here to sell your unique products or find something special, we've made it easy for you to get started.

🔹 Sellers — List your products in minutes
🔹 Buyers — Browse and discover handmade or custom items

Choose your role and dive into the experience!`}
      </div>
      <div className="space-x-10">
        <button
          className="bg-red-500 text-white px-6 py-3 rounded-xl hover:bg-blue-600"
          onClick={handleBuyerClick}
        >
          I'm a Buyer
        </button>
        <button
          className="bg-green-500 text-white px-6 py-3 rounded-xl hover:bg-green-600"
          onClick={handleSellerClick}
        >
          I'm a Seller
        </button>
      </div>
    </div>
    </div>
  );
};

export default MainPage;
