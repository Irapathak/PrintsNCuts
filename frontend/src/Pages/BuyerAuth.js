import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const BuyerAuth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  });
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!formData.password.trim()) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendOtp = async () => {
    if (!formData.phone.trim()) {
      setErrors(prev => ({ ...prev, phone: 'Phone number is required' }));
      return;
    }

    // Generate OTP
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setOtp(generatedOtp);
    setOtpSent(true);
    setOtpError('');
    setPhoneVerified(false);

    // In production, this would call your backend API to send SMS via Twilio or similar
    // For now, we'll simulate it
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // In production, uncomment this and set up your backend:
      // const response = await fetch('https://localhost:5002/api/send-otp', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ phone: formData.phone })
      // });
      // const data = await response.json();
      // setOtp(data.otp); // Backend should return OTP for demo purposes

      // For demo: Show OTP in alert (remove in production)
      alert(`OTP sent to ${formData.phone}\n\nDemo OTP: ${generatedOtp}\n\n(In production, this would be sent via SMS)`);
    } catch (error) {
      alert('Failed to send OTP. Please try again.');
    }
  };

  const handleVerifyOtp = () => {
    if (enteredOtp === otp) {
      setPhoneVerified(true);
      setOtpError('');
      setErrors(prev => ({ ...prev, phone: '' }));
    } else {
      setOtpError('Invalid OTP. Please try again.');
      setPhoneVerified(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!phoneVerified) {
      setErrors(prev => ({ ...prev, phone: 'Please verify your phone number' }));
      return;
    }

    // Create user account
    const user = {
      id: Date.now(),
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      password: formData.password, // In production, hash this
      createdAt: new Date().toISOString()
    };

    // Save to localStorage
    const existingUsers = JSON.parse(localStorage.getItem('buyerUsers') || '[]');
    const emailExists = existingUsers.find(u => u.email === formData.email);
    if (emailExists) {
      setErrors({ email: 'Email already registered. Please login instead.' });
      return;
    }

    existingUsers.push(user);
    localStorage.setItem('buyerUsers', JSON.stringify(existingUsers));
    
    // Set current user
    localStorage.setItem('currentBuyer', JSON.stringify(user));
    
    navigate('/buyer');
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.password.trim()) newErrors.password = 'Password is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Find user
    const existingUsers = JSON.parse(localStorage.getItem('buyerUsers') || '[]');
    const user = existingUsers.find(
      u => u.email === formData.email && u.password === formData.password
    );

    if (user) {
      localStorage.setItem('currentBuyer', JSON.stringify(user));
      navigate('/buyer');
    } else {
      setErrors({ email: 'Invalid email or password' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isLogin ? 'Sign in to your account' : 'Create your buyer account'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isLogin ? (
              <>
                Don't have an account?{' '}
                <button
                  onClick={() => setIsLogin(false)}
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => setIsLogin(true)}
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={isLogin ? handleLogin : handleSignup}>
          {!isLogin && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required={!isLogin}
                value={formData.name}
                onChange={handleInputChange}
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                placeholder="John Doe"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleInputChange}
              className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
              placeholder="your@email.com"
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
          </div>

          {!isLogin && (
            <>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <div className="mt-1 space-y-2">
                  <div className="flex gap-2">
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      required={!isLogin}
                      value={formData.phone}
                      onChange={handleInputChange}
                      disabled={phoneVerified}
                      className={`flex-1 appearance-none relative block w-full px-3 py-2 border ${
                        errors.phone ? 'border-red-500' : 'border-gray-300'
                      } ${phoneVerified ? 'bg-gray-100' : ''} placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                      placeholder="+1 (555) 123-4567"
                    />
                    {!phoneVerified && (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 whitespace-nowrap"
                      >
                        {otpSent ? 'Resend' : 'Send OTP'}
                      </button>
                    )}
                    {phoneVerified && (
                      <div className="flex items-center px-4 py-2 bg-green-100 text-green-700 rounded-md">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Verified
                      </div>
                    )}
                  </div>
                  
                  {otpSent && !phoneVerified && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
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
                          className="flex-1 px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="000000"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyOtp}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          Verify
                        </button>
                      </div>
                      {otpError && <p className="mt-2 text-sm text-red-600">{otpError}</p>}
                    </div>
                  )}
                  
                  {errors.phone && <p className="text-sm text-red-600">{errors.phone}</p>}
                </div>
              </div>
            </>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleInputChange}
              className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                errors.password ? 'border-red-500' : 'border-gray-300'
              } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
              placeholder={isLogin ? "Enter your password" : "At least 6 characters"}
            />
            {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {isLogin ? 'Sign in' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BuyerAuth;

