/* /src/components/auth/Login.jsx */
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { login } from '../api/auth';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const { setAuthData } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const data = await login({ email, password });
      console.log(data);
      localStorage.setItem('token', data.data.tokens.accessToken);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      setAuthData({ user: data.data.user, token: data.data.tokens.accessToken });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F0F0F0]">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-3xl font-bold mb-6 text-center text-[#181818]">Iniciar Sesión</h2>
        {error && <div className="mb-4 text-center text-red-600">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-[#181818] text-sm font-semibold mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-[#235C88]"
              placeholder="tucorreo@ejemplo.com"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-[#181818] text-sm font-semibold mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-[#235C88]"
              placeholder="********"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 bg-[#235C88] text-white font-bold rounded hover:bg-[#1e4a6b] transition-colors"
          >
            Iniciar Sesión
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
