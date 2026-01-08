import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Dummy data for products
const dummyProducts = [
  {
    id: 1,
    name: "Custom Wooden Phone Stand",
    description: "Handcrafted wooden phone stand perfect for your desk. Made from sustainable oak wood with a natural finish.",
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop",
    price: "$24.99",
    seller: {
      name: "Sarah Johnson",
      company: "Artisan Woodworks",
      phone: "+1 (555) 123-4567",
      email: "sarah@artisanwoodworks.com"
    }
  },
  {
    id: 2,
    name: "Personalized Ceramic Mugs",
    description: "Beautiful hand-painted ceramic mugs with custom designs. Perfect for coffee lovers and gift giving.",
    image: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400&h=400&fit=crop",
    price: "$18.50",
    seller: {
      name: "Michael Chen",
      company: "Ceramic Creations",
      phone: "+1 (555) 234-5678",
      email: "michael@ceramiccreations.com"
    }
  },
  {
    id: 3,
    name: "Handmade Leather Wallet",
    description: "Premium genuine leather wallet with RFID blocking. Sleek design with multiple card slots and cash pocket.",
    image: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=400&h=400&fit=crop",
    price: "$45.00",
    seller: {
      name: "Emma Rodriguez",
      company: "Leather Craft Co.",
      phone: "+1 (555) 345-6789",
      email: "emma@leathercraft.com"
    }
  },
  {
    id: 4,
    name: "Custom Printed T-Shirts",
    description: "High-quality cotton t-shirts with custom designs. Available in multiple sizes and colors. Perfect for events.",
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop",
    price: "$22.99",
    seller: {
      name: "David Kim",
      company: "Print Pro Designs",
      phone: "+1 (555) 456-7890",
      email: "david@printpro.com"
    }
  },
  {
    id: 5,
    name: "Handwoven Macrame Wall Hanging",
    description: "Beautiful bohemian-style macrame wall art. Adds texture and warmth to any room. Made with natural cotton cord.",
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop",
    price: "$35.00",
    seller: {
      name: "Lisa Anderson",
      company: "Boho Home Decor",
      phone: "+1 (555) 567-8901",
      email: "lisa@bohohome.com"
    }
  },
  {
    id: 6,
    name: "Custom Engraved Cutting Boards",
    description: "Premium bamboo cutting boards with custom engravings. Perfect for weddings, housewarmings, or personal use.",
    image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400&h=400&fit=crop",
    price: "$32.99",
    seller: {
      name: "James Wilson",
      company: "Kitchen Essentials",
      phone: "+1 (555) 678-9012",
      email: "james@kitchenessentials.com"
    }
  },
  {
    id: 7,
    name: "Handmade Soap Collection",
    description: "Natural, organic soap bars with essential oils. Available in lavender, eucalyptus, and citrus scents.",
    image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=400&fit=crop",
    price: "$12.99",
    seller: {
      name: "Rachel Green",
      company: "Natural Soap Co.",
      phone: "+1 (555) 789-0123",
      email: "rachel@naturalsoap.com"
    }
  },
  {
    id: 8,
    name: "Custom Vinyl Decals",
    description: "High-quality vinyl decals for walls, laptops, and cars. Endless design options. Easy to apply and remove.",
    image: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=400&fit=crop",
    price: "$15.00",
    seller: {
      name: "Alex Martinez",
      company: "Vinyl Designs Studio",
      phone: "+1 (555) 890-1234",
      email: "alex@vinyldesigns.com"
    }
  },
  {
    id: 9,
    name: "Handmade Jewelry Set",
    description: "Elegant sterling silver jewelry set with semi-precious stones. Includes necklace, earrings, and bracelet.",
    image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop",
    price: "$89.99",
    seller: {
      name: "Sophie Taylor",
      company: "Sophie's Jewelry",
      phone: "+1 (555) 901-2345",
      email: "sophie@sophiesjewelry.com"
    }
  },
  {
    id: 10,
    name: "Custom Canvas Prints",
    description: "High-resolution canvas prints of your favorite photos. Professional quality with gallery-wrapped edges.",
    image: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=400&fit=crop",
    price: "$55.00",
    seller: {
      name: "Ryan Brown",
      company: "Canvas Art Studio",
      phone: "+1 (555) 012-3456",
      email: "ryan@canvasart.com"
    }
  },
  {
    id: 11,
    name: "Handmade Pottery Vases",
    description: "Unique ceramic vases with modern designs. Each piece is one-of-a-kind. Perfect for home decoration.",
    image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop",
    price: "$42.50",
    seller: {
      name: "Maya Patel",
      company: "Pottery by Maya",
      phone: "+1 (555) 123-4568",
      email: "maya@potterybymaya.com"
    }
  },
  {
    id: 12,
    name: "Custom Embroidered Hats",
    description: "Premium quality caps with custom embroidery. Choose your design, text, or logo. Adjustable fit for all sizes.",
    image: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400&h=400&fit=crop",
    price: "$28.99",
    seller: {
      name: "Chris Thompson",
      company: "Hat Emporium",
      phone: "+1 (555) 234-5679",
      email: "chris@hatemporium.com"
    }
  }
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('products'); // 'products' or 'inbox'
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [showMessageSent, setShowMessageSent] = useState(false);
  const [products, setProducts] = useState([]);
  const [buyerMessages, setBuyerMessages] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [replyText, setReplyText] = useState('');

  // Check authentication on mount
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('currentBuyer') || 'null');
    if (!user) {
      navigate('/buyer-auth');
      return;
    }
    setCurrentUser(user);
  }, [navigate]);

  // Load products from localStorage and combine with dummy data
  useEffect(() => {
    const savedProducts = JSON.parse(localStorage.getItem('products') || '[]');
    // Combine saved products with dummy data, avoiding duplicates
    const allProducts = [...savedProducts, ...dummyProducts];
    // Remove duplicates based on ID
    const uniqueProducts = Array.from(
      new Map(allProducts.map(product => [product.id, product])).values()
    );
    setProducts(uniqueProducts);
  }, []);

  // Load buyer messages
  useEffect(() => {
    if (!currentUser) return;
    const allMessages = JSON.parse(localStorage.getItem('buyerMessages') || '[]');
    const userMessages = allMessages.filter(msg => msg.buyerId === currentUser.id);
    setBuyerMessages(userMessages);
  }, [currentUser]);

  // Listen for new messages
  useEffect(() => {
    if (!currentUser) return;
    const handleStorageChange = () => {
      const allMessages = JSON.parse(localStorage.getItem('buyerMessages') || '[]');
      const userMessages = allMessages.filter(msg => msg.buyerId === currentUser.id);
      setBuyerMessages(userMessages);
    };
    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(handleStorageChange, 1000);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [currentUser]);

  // Listen for new products added
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'products') {
        const savedProducts = JSON.parse(e.newValue || '[]');
        const allProducts = [...savedProducts, ...dummyProducts];
        const uniqueProducts = Array.from(
          new Map(allProducts.map(product => [product.id, product])).values()
        );
        setProducts(uniqueProducts);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    // Also check periodically for same-tab updates
    const interval = setInterval(() => {
      const savedProducts = JSON.parse(localStorage.getItem('products') || '[]');
      const allProducts = [...savedProducts, ...dummyProducts];
      const uniqueProducts = Array.from(
        new Map(allProducts.map(product => [product.id, product])).values()
      );
      if (JSON.stringify(uniqueProducts) !== JSON.stringify(products)) {
        setProducts(uniqueProducts);
      }
    }, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [products]);

  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setMessageText('');
    setShowMessageSent(false);
  };

  const handleCloseModal = () => {
    setSelectedProduct(null);
    setMessageText('');
    setShowMessageSent(false);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageText.trim() || !currentUser) return;

    // Create conversation thread ID
    const threadId = `thread_${selectedProduct.id}_${currentUser.id}_${selectedProduct.seller.phone}`;

    // Create message object for seller
    const sellerMessage = {
      id: Date.now(),
      threadId: threadId,
      productName: selectedProduct.name,
      productId: selectedProduct.id,
      sellerPhone: selectedProduct.seller.phone,
      sellerName: selectedProduct.seller.name,
      buyerId: currentUser.id,
      buyerName: currentUser.name,
      buyerEmail: currentUser.email,
      message: messageText,
      timestamp: new Date().toISOString(),
      read: false,
      type: 'buyer_to_seller'
    };

    // Create message object for buyer
    const buyerMessage = {
      id: Date.now() + 1,
      threadId: threadId,
      productName: selectedProduct.name,
      productId: selectedProduct.id,
      sellerPhone: selectedProduct.seller.phone,
      sellerName: selectedProduct.seller.name,
      buyerId: currentUser.id,
      message: messageText,
      timestamp: new Date().toISOString(),
      read: true,
      type: 'buyer_to_seller',
      replies: []
    };

    // Save to seller messages
    const existingSellerMessages = JSON.parse(localStorage.getItem('sellerMessages') || '[]');
    existingSellerMessages.push(sellerMessage);
    localStorage.setItem('sellerMessages', JSON.stringify(existingSellerMessages));

    // Save to buyer messages
    const existingBuyerMessages = JSON.parse(localStorage.getItem('buyerMessages') || '[]');
    existingBuyerMessages.push(buyerMessage);
    localStorage.setItem('buyerMessages', JSON.stringify(existingBuyerMessages));

    // Trigger storage event
    window.dispatchEvent(new Event('storage'));

    setShowMessageSent(true);
    setMessageText('');
    setTimeout(() => {
      setShowMessageSent(false);
      handleCloseModal();
    }, 2000);
  };

  const handleLogout = () => {
    localStorage.removeItem('currentBuyer');
    navigate('/buyer-auth');
  };

  const handleReply = (e, conversation) => {
    e.preventDefault();
    if (!replyText.trim() || !currentUser) return;

    const reply = {
      id: Date.now(),
      message: replyText,
      timestamp: new Date().toISOString(),
      type: 'buyer_reply'
    };

    // Update buyer message with reply
    const allBuyerMessages = JSON.parse(localStorage.getItem('buyerMessages') || '[]');
    const buyerMsg = allBuyerMessages.find(msg => msg.threadId === conversation.threadId);
    if (buyerMsg) {
      if (!buyerMsg.replies) buyerMsg.replies = [];
      buyerMsg.replies.push(reply);
      localStorage.setItem('buyerMessages', JSON.stringify(allBuyerMessages));
    }

    // Create message for seller
    const sellerReply = {
      id: Date.now() + 1,
      threadId: conversation.threadId,
      productName: conversation.productName,
      productId: conversation.productId,
      sellerPhone: conversation.sellerPhone,
      sellerName: conversation.sellerName,
      buyerId: currentUser.id,
      buyerName: currentUser.name,
      message: replyText,
      timestamp: new Date().toISOString(),
      read: false,
      type: 'buyer_reply',
      parentMessageId: conversation.id
    };

    const allSellerMessages = JSON.parse(localStorage.getItem('sellerMessages') || '[]');
    allSellerMessages.push(sellerReply);
    localStorage.setItem('sellerMessages', JSON.stringify(allSellerMessages));

    setReplyText('');
    setSelectedConversation(null);
    window.dispatchEvent(new Event('storage'));
  };

  const markAsRead = (messageId) => {
    const allMessages = JSON.parse(localStorage.getItem('buyerMessages') || '[]');
    const updated = allMessages.map(msg => 
      msg.id === messageId ? { ...msg, read: true } : msg
    );
    localStorage.setItem('buyerMessages', JSON.stringify(updated));
    setBuyerMessages(updated.filter(msg => msg.buyerId === currentUser.id));
  };

  // Group messages by thread
  const conversations = buyerMessages.reduce((acc, msg) => {
    if (!acc[msg.threadId]) {
      acc[msg.threadId] = {
        threadId: msg.threadId,
        productName: msg.productName,
        sellerName: msg.sellerName,
        sellerPhone: msg.sellerPhone,
        messages: [],
        lastMessage: msg
      };
    }
    acc[msg.threadId].messages.push(msg);
    if (new Date(msg.timestamp) > new Date(acc[msg.threadId].lastMessage.timestamp)) {
      acc[msg.threadId].lastMessage = msg;
    }
    return acc;
  }, {});

  const conversationList = Object.values(conversations).sort((a, b) => 
    new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp)
  );

  const unreadCount = buyerMessages.filter(msg => !msg.read).length;

  if (!currentUser) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Buyer Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome, {currentUser.name}!</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('products')}
              className={`${
                activeTab === 'products'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              Products
            </button>
            <button
              onClick={() => setActiveTab('inbox')}
              className={`${
                activeTab === 'inbox'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors relative`}
            >
              Inbox
              {unreadCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-y-[-2px] bg-red-500 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          </nav>
        </div>
      </div>

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
            <div
              key={product.id}
              onClick={() => handleProductClick(product)}
              className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl group"
            >
              {/* Product Image */}
              <div className="relative h-64 bg-gray-200 overflow-hidden">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/400x400?text=Product+Image';
                  }}
                />
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                  <span className="text-white text-lg font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    View Details
                  </span>
                </div>
              </div>

              {/* Product Info */}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">
                  {product.name}
                </h3>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {product.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold text-blue-600">{product.price}</span>
                  <span className="text-xs text-gray-500">Click to view</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Inbox Tab */}
      {activeTab === 'inbox' && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {conversationList.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-500 text-lg">No messages yet</p>
              <p className="text-gray-400 mt-2">Your conversations with sellers will appear here</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md">
              <div className="p-6 border-b">
                <h2 className="text-2xl font-bold text-gray-900">Your Messages</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {conversationList.map((conversation) => {
                  const unreadInThread = conversation.messages.filter(msg => !msg.read).length;
                  return (
                    <div
                      key={conversation.threadId}
                      className={`p-6 hover:bg-gray-50 transition-colors cursor-pointer ${
                        unreadInThread > 0 ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => {
                        setSelectedConversation(conversation);
                        conversation.messages.forEach(msg => {
                          if (!msg.read) markAsRead(msg.id);
                        });
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900">{conversation.productName}</h3>
                            {unreadInThread > 0 && (
                              <span className="px-2 py-1 text-xs font-medium bg-blue-500 text-white rounded-full">
                                {unreadInThread} new
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-1">
                            <span className="font-medium">Seller:</span> {conversation.sellerName}
                          </p>
                          <p className="text-gray-700 mb-2 line-clamp-2">
                            {conversation.lastMessage.message}
                          </p>
                          {conversation.lastMessage.replies && conversation.lastMessage.replies.length > 0 && (
                            <p className="text-xs text-blue-600 mb-2">
                              {conversation.lastMessage.replies.length} reply(ies)
                            </p>
                          )}
                          <p className="text-xs text-gray-500">
                            {new Date(conversation.lastMessage.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedConversation(conversation);
                            conversation.messages.forEach(msg => {
                              if (!msg.read) markAsRead(msg.id);
                            });
                          }}
                          className="ml-4 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Conversation Detail Modal */}
          {selectedConversation && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedConversation(null)}>
              <div
                className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedConversation.productName}</h2>
                    <p className="text-sm text-gray-600">Conversation with {selectedConversation.sellerName}</p>
                  </div>
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="p-6">
                  <div className="space-y-4 mb-6">
                    {selectedConversation.messages.map((msg) => (
                      <div key={msg.id} className="space-y-2">
                        <div className={`p-4 rounded-lg ${msg.type === 'buyer_to_seller' ? 'bg-blue-50 ml-8' : 'bg-gray-50 mr-8'}`}>
                          <p className="text-sm font-medium text-gray-700 mb-1">
                            {msg.type === 'buyer_to_seller' ? 'You' : selectedConversation.sellerName}
                          </p>
                          <p className="text-gray-900">{msg.message}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(msg.timestamp).toLocaleString()}
                          </p>
                        </div>
                        {msg.replies && msg.replies.length > 0 && (
                          <div className="ml-12 space-y-2">
                            {msg.replies.map((reply) => (
                              <div key={reply.id} className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm font-medium text-gray-700 mb-1">You replied</p>
                                <p className="text-gray-900 text-sm">{reply.message}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(reply.timestamp).toLocaleString()}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <form onSubmit={(e) => handleReply(e, selectedConversation)} className="border-t pt-4">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your reply..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows="3"
                      required
                    />
                    <div className="mt-4 flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedConversation(null);
                          setReplyText('');
                        }}
                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                      >
                        Close
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                      >
                        Send Reply
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={handleCloseModal}>
          <div
            className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-2xl font-bold text-gray-900">{selectedProduct.name}</h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Product Image */}
              <div className="mb-6">
                <img
                  src={selectedProduct.image}
                  alt={selectedProduct.name}
                  className="w-full h-80 object-cover rounded-lg"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/800x400?text=Product+Image';
                  }}
                />
              </div>

              {/* Product Details */}
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{selectedProduct.name}</h3>
                <p className="text-gray-700 mb-4">{selectedProduct.description}</p>
                <div className="text-2xl font-bold text-blue-600 mb-6">{selectedProduct.price}</div>
              </div>

              {/* Seller Information */}
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Seller Information</h4>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-gray-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-gray-700">
                      <span className="font-medium">Name:</span> {selectedProduct.seller.name}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-gray-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="text-gray-700">
                      <span className="font-medium">Company:</span> {selectedProduct.seller.company}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-gray-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="text-gray-700">
                      <span className="font-medium">Phone:</span> {selectedProduct.seller.phone}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-gray-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-gray-700">
                      <span className="font-medium">Email:</span> {selectedProduct.seller.email}
                    </span>
                  </div>
                </div>
              </div>

              {/* Message Form */}
              <div className="border-t pt-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Send a Message</h4>
                {showMessageSent ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <svg className="w-12 h-12 text-green-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-green-700 font-medium">Message sent successfully!</p>
                    <p className="text-green-600 text-sm mt-1">The seller will see it in their inbox</p>
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage}>
                    <textarea
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Type your message to the seller here..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows="4"
                      required
                    />
                    <div className="mt-4 flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={handleCloseModal}
                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        Send Message
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
