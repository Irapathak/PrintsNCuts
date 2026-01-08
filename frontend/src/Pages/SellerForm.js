import React, { useState, useEffect } from 'react';

const SellerForm = () => {
  const [activeTab, setActiveTab] = useState('form'); // 'form' or 'inbox'
  const [formData, setFormData] = useState({
    productName: '',
    description: '',
    price: '',
    sellerName: '',
    company: '',
    phone: '',
    email: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [formErrors, setFormErrors] = useState({});
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [replyText, setReplyText] = useState('');

  // Load messages from localStorage on component mount
  useEffect(() => {
    const savedMessages = localStorage.getItem('sellerMessages');
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    }
  }, []);

  // Listen for new messages (from buyer dashboard)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'sellerMessages') {
        setMessages(JSON.parse(e.newValue || '[]'));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    // Also check periodically for same-tab updates
    const interval = setInterval(() => {
      const savedMessages = localStorage.getItem('sellerMessages');
      if (savedMessages) {
        const parsed = JSON.parse(savedMessages);
        if (JSON.stringify(parsed) !== JSON.stringify(messages)) {
          setMessages(parsed);
        }
      }
    }, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [messages]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setFormErrors(prev => ({ ...prev, image: 'Image size must be less than 5MB' }));
        return;
      }
      if (!file.type.startsWith('image/')) {
        setFormErrors(prev => ({ ...prev, image: 'Please select an image file' }));
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      if (formErrors.image) {
        setFormErrors(prev => ({ ...prev, image: '' }));
      }
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.productName.trim()) errors.productName = 'Product name is required';
    if (!formData.description.trim()) errors.description = 'Description is required';
    if (!imageFile && !imagePreview) errors.image = 'Product image is required';
    if (!formData.price.trim()) errors.price = 'Price is required';
    if (!formData.sellerName.trim()) errors.sellerName = 'Seller name is required';
    if (!formData.company.trim()) errors.company = 'Company name is required';
    if (!formData.phone.trim()) errors.phone = 'Phone number is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Email is invalid';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSendOtp = async () => {
    if (!formData.phone.trim()) {
      setFormErrors(prev => ({ ...prev, phone: 'Phone number is required' }));
      return;
    }

    setOtpLoading(true);
    setOtpError('');

    try {
      // Call backend API to send OTP
      const response = await fetch('https://localhost:5002/api/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: formData.phone }),
        // Note: In production, handle SSL certificate validation properly
      });

      const data = await response.json();

      if (response.ok) {
        setOtpSent(true);
        setPhoneVerified(false);
        // For demo, show OTP in alert (remove in production)
        if (data.otp) {
          alert(`OTP sent to ${formData.phone}\n\nDemo OTP: ${data.otp}\n\n(In production, this would be sent via SMS)`);
        } else {
          alert(`OTP sent to ${formData.phone}`);
        }
      } else {
        setOtpError(data.error || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('Error sending OTP:', error);
      // Fallback: Generate local OTP if API fails (for development)
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setOtpSent(true);
      alert(`OTP sent to ${formData.phone}\n\nDemo OTP (API unavailable): ${generatedOtp}\n\n(In production, this would be sent via SMS)`);
      // Store locally for verification fallback
      localStorage.setItem(`otp_${formData.phone}`, generatedOtp);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!enteredOtp.trim()) {
      setOtpError('Please enter OTP');
      return;
    }

    setOtpLoading(true);
    setOtpError('');

    try {
      const response = await fetch('https://localhost:5002/api/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: formData.phone, otp: enteredOtp }),
      });

      const data = await response.json();

      if (response.ok) {
        setPhoneVerified(true);
        setOtpError('');
        setFormErrors(prev => ({ ...prev, phone: '' }));
        setEnteredOtp('');
      } else {
        setOtpError(data.error || 'Invalid OTP. Please try again.');
        setPhoneVerified(false);
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      // Fallback: Check local storage (for development)
      const storedOtp = localStorage.getItem(`otp_${formData.phone}`);
      if (storedOtp === enteredOtp) {
        setPhoneVerified(true);
        setOtpError('');
        localStorage.removeItem(`otp_${formData.phone}`);
      } else {
        setOtpError('Invalid OTP. Please try again.');
        setPhoneVerified(false);
      }
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (!phoneVerified) {
      setFormErrors(prev => ({ ...prev, phone: 'Please verify your phone number' }));
      return;
    }

    // Convert image to base64 for storage (in production, upload to cloud storage)
    let imageDataUrl = imagePreview;
    if (!imageDataUrl && imageFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        imageDataUrl = reader.result;
        saveProduct(imageDataUrl);
      };
      reader.readAsDataURL(imageFile);
      return;
    }

    saveProduct(imageDataUrl);
  };

  const saveProduct = (imageData) => {
    // Create product object
    const newProduct = {
      id: Date.now(), // Simple ID generation
      name: formData.productName,
      description: formData.description,
      image: imageData, // Base64 encoded image
      price: formData.price.startsWith('$') ? formData.price : `$${formData.price}`,
      seller: {
        name: formData.sellerName,
        company: formData.company,
        phone: formData.phone,
        email: formData.email
      }
    };

    // Get existing products from localStorage
    const existingProducts = JSON.parse(localStorage.getItem('products') || '[]');
    existingProducts.push(newProduct);
    localStorage.setItem('products', JSON.stringify(existingProducts));

    // Reset form
    setFormData({
      productName: '',
      description: '',
      price: '',
      sellerName: '',
      company: '',
      phone: '',
      email: ''
    });
    setImageFile(null);
    setImagePreview('');
    setPhoneVerified(false);
    setOtpSent(false);
    setEnteredOtp('');
    setFormErrors({});

    alert('Product listed successfully! It will now appear on the buyer dashboard.');
  };

  const markMessageAsRead = (messageId) => {
    const updatedMessages = messages.map(msg =>
      msg.id === messageId ? { ...msg, read: true } : msg
    );
    setMessages(updatedMessages);
    localStorage.setItem('sellerMessages', JSON.stringify(updatedMessages));
  };

  const deleteMessage = (messageId) => {
    const updatedMessages = messages.filter(msg => msg.id !== messageId);
    setMessages(updatedMessages);
    localStorage.setItem('sellerMessages', JSON.stringify(updatedMessages));
  };

  const handleSellerReply = (e, conversation) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    const reply = {
      id: Date.now(),
      message: replyText,
      timestamp: new Date().toISOString(),
      type: 'seller_reply'
    };

    // Update seller message
    const allSellerMessages = JSON.parse(localStorage.getItem('sellerMessages') || '[]');
    const sellerMsg = allSellerMessages.find(msg => msg.threadId === conversation.threadId);
    if (sellerMsg) {
      if (!sellerMsg.replies) sellerMsg.replies = [];
      sellerMsg.replies.push(reply);
      localStorage.setItem('sellerMessages', JSON.stringify(allSellerMessages));
    }

    // Create message for buyer
    const buyerReply = {
      id: Date.now() + 1,
      threadId: conversation.threadId,
      productName: conversation.productName,
      productId: conversation.productId,
      sellerPhone: conversation.sellerPhone,
      sellerName: conversation.sellerName,
      buyerId: conversation.buyerId,
      buyerName: conversation.buyerName,
      message: replyText,
      timestamp: new Date().toISOString(),
      read: false,
      type: 'seller_reply',
      parentMessageId: conversation.id
    };

    const allBuyerMessages = JSON.parse(localStorage.getItem('buyerMessages') || '[]');
    allBuyerMessages.push(buyerReply);
    localStorage.setItem('buyerMessages', JSON.stringify(allBuyerMessages));

    setReplyText('');
    setSelectedConversation(null);
    window.dispatchEvent(new Event('storage'));
    
    // Refresh seller messages
    const updated = JSON.parse(localStorage.getItem('sellerMessages') || '[]');
    setMessages(updated);
  };

  // Group messages by thread
  const conversations = messages.reduce((acc, msg) => {
    if (!acc[msg.threadId]) {
      acc[msg.threadId] = {
        threadId: msg.threadId,
        productName: msg.productName,
        buyerName: msg.buyerName,
        buyerId: msg.buyerId,
        buyerEmail: msg.buyerEmail,
        sellerPhone: msg.sellerPhone,
        sellerName: msg.sellerName,
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

  const unreadCount = messages.filter(msg => !msg.read).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-3xl font-bold text-gray-900">Seller Dashboard</h1>
          <p className="text-gray-600 mt-1">List your products and manage your business</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('form')}
              className={`${
                activeTab === 'form'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              List Product
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

      {/* Form Tab */}
      {activeTab === 'form' && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">List Your Product</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Product Name */}
              <div>
                <label htmlFor="productName" className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  id="productName"
                  name="productName"
                  value={formData.productName}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    formErrors.productName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Custom Wooden Phone Stand"
                />
                {formErrors.productName && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.productName}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="4"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    formErrors.description ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Describe your product in detail..."
                />
                {formErrors.description && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.description}</p>
                )}
              </div>

              {/* Image Upload */}
              <div>
                <label htmlFor="imageFile" className="block text-sm font-medium text-gray-700 mb-2">
                  Product Image *
                </label>
                <input
                  type="file"
                  id="imageFile"
                  name="imageFile"
                  accept="image/*"
                  onChange={handleImageChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    formErrors.image ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {formErrors.image && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.image}</p>
                )}
                {imagePreview && (
                  <div className="mt-2">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview('');
                      }}
                      className="mt-2 text-sm text-red-600 hover:text-red-700"
                    >
                      Remove image
                    </button>
                  </div>
                )}
                <p className="mt-1 text-xs text-gray-500">Max file size: 5MB. Supported formats: JPG, PNG, GIF</p>
              </div>

              {/* Price */}
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                  Price *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-2 text-gray-500">$</span>
                  <input
                    type="text"
                    id="price"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    className={`w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      formErrors.price ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="24.99"
                  />
                </div>
                {formErrors.price && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.price}</p>
                )}
              </div>

              {/* Seller Name */}
              <div>
                <label htmlFor="sellerName" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name *
                </label>
                <input
                  type="text"
                  id="sellerName"
                  name="sellerName"
                  value={formData.sellerName}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    formErrors.sellerName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="John Doe"
                />
                {formErrors.sellerName && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.sellerName}</p>
                )}
              </div>

              {/* Company */}
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    formErrors.company ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="My Company Inc."
                />
                {formErrors.company && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.company}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    formErrors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="your@email.com"
                />
                {formErrors.email && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
                )}
              </div>

              {/* Phone with OTP Verification */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      disabled={phoneVerified}
                      className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        formErrors.phone ? 'border-red-500' : 'border-gray-300'
                      } ${phoneVerified ? 'bg-gray-100' : ''}`}
                      placeholder="+1 (555) 123-4567"
                    />
                    {!phoneVerified && (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={otpLoading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {otpLoading ? 'Sending...' : (otpSent ? 'Resend OTP' : 'Send OTP')}
                      </button>
                    )}
                    {phoneVerified && (
                      <div className="flex items-center px-4 py-2 bg-green-100 text-green-700 rounded-lg">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Verified
                      </div>
                    )}
                  </div>
                  
                  {otpSent && !phoneVerified && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <label htmlFor="enteredOtp" className="block text-sm font-medium text-blue-900 mb-2">
                        Enter OTP
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          id="enteredOtp"
                          value={enteredOtp}
                          onChange={(e) => {
                            setEnteredOtp(e.target.value);
                            setOtpError('');
                          }}
                          maxLength="6"
                          disabled={otpLoading}
                          className="flex-1 px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                          placeholder="000000"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyOtp}
                          disabled={otpLoading}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {otpLoading ? 'Verifying...' : 'Verify'}
                        </button>
                      </div>
                      {otpError && (
                        <p className="mt-2 text-sm text-red-600">{otpError}</p>
                      )}
                    </div>
                  )}
                  
                  {formErrors.phone && (
                    <p className="text-sm text-red-600">{formErrors.phone}</p>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg"
                >
                  List Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inbox Tab */}
      {activeTab === 'inbox' && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white shadow-md rounded-lg">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">Messages from Buyers</h2>
              <p className="text-gray-600 mt-1">View and respond to inquiries about your products</p>
            </div>

            {conversationList.length === 0 ? (
              <div className="p-12 text-center">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-500 text-lg">No messages yet</p>
                <p className="text-gray-400 mt-2">Messages from buyers will appear here</p>
              </div>
            ) : (
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
                          if (!msg.read) markMessageAsRead(msg.id);
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
                            <span className="font-medium">From:</span> {conversation.buyerName || 'Anonymous Buyer'}
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
                              if (!msg.read) markMessageAsRead(msg.id);
                            });
                          }}
                          className="ml-4 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          View & Reply
                        </button>
                      </div>
                    </div>
                  );
                })}
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
                      <p className="text-sm text-gray-600">Conversation with {selectedConversation.buyerName}</p>
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
                          <div className={`p-4 rounded-lg ${msg.type === 'buyer_to_seller' || msg.type === 'buyer_reply' ? 'bg-blue-50 mr-8' : 'bg-gray-50 ml-8'}`}>
                            <p className="text-sm font-medium text-gray-700 mb-1">
                              {msg.type === 'buyer_to_seller' || msg.type === 'buyer_reply' ? selectedConversation.buyerName : 'You'}
                            </p>
                            <p className="text-gray-900">{msg.message}</p>
                            <p className="text-xs text-gray-500 mt-2">
                              {new Date(msg.timestamp).toLocaleString()}
                            </p>
                          </div>
                          {msg.replies && msg.replies.length > 0 && (
                            <div className="ml-12 space-y-2">
                              {msg.replies.map((reply) => (
                                <div key={reply.id} className={`p-3 rounded-lg ${reply.type === 'seller_reply' ? 'bg-gray-50' : 'bg-blue-50'}`}>
                                  <p className="text-sm font-medium text-gray-700 mb-1">
                                    {reply.type === 'seller_reply' ? 'You replied' : selectedConversation.buyerName + ' replied'}
                                  </p>
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
                    <form onSubmit={(e) => handleSellerReply(e, selectedConversation)} className="border-t pt-4">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Type your reply to the buyer..."
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
        </div>
      )}
    </div>
  );
};

export default SellerForm;
