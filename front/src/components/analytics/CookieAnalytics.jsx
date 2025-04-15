import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { 
  Chart as ChartJS, 
  ArcElement, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

// Registrar componentes de Chart.js
ChartJS.register(
  ArcElement, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend
);

const CookieAnalytics = ({ data }) => {
  const [sortBy, setSortBy] = useState('acceptanceRate'); // 'acceptanceRate' o 'count'
  
  if (!data) {
    return <div className="bg-white p-6 rounded shadow text-center text-gray-500">
      No hay datos de cookies disponibles. Verifica la configuración del dominio.
    </div>;
  }

  // Destructurar los datos con valores por defecto si no existen
  const { 
    categories = [], 
    purposes = [], 
    acceptance = [], 
    providers = [] 
  } = data;

  // Colores para usar consistentemente en todos los gráficos
  const categoryColors = {
    necessary: 'rgba(75, 192, 192, 0.8)',  // Verde azulado
    preferences: 'rgba(153, 102, 255, 0.8)', // Púrpura
    analytics: 'rgba(54, 162, 235, 0.8)',   // Azul
    marketing: 'rgba(255, 99, 132, 0.8)',   // Rosa/Rojo
    functionality: 'rgba(255, 159, 64, 0.8)', // Naranja
    targeting: 'rgba(255, 205, 86, 0.8)',   // Amarillo
    unclassified: 'rgba(201, 203, 207, 0.8)' // Gris
  };

  // Función para obtener colores por categorías
  const getCategoryColors = (categories) => {
    return categories.map(cat => categoryColors[cat.category] || 'rgba(201, 203, 207, 0.8)');
  };

  // Función para obtener bordes más oscuros
  const getBorderColors = (backgroundColors) => {
    return backgroundColors.map(color => color.replace('0.8', '1'));
  };

  // Preparar datos para el gráfico de categorías
  const categoriesChartData = {
    labels: categories.map(cat => cat.category.charAt(0).toUpperCase() + cat.category.slice(1)),
    datasets: [
      {
        label: 'Cookies por Categoría',
        data: categories.map(cat => cat.count),
        backgroundColor: getCategoryColors(categories),
        borderColor: getBorderColors(getCategoryColors(categories)),
        borderWidth: 1,
      },
    ],
  };

  // Ordenar cookies por tasa de aceptación o recuento
  const sortedAcceptance = [...acceptance].sort((a, b) => {
    if (sortBy === 'acceptanceRate') {
      return b.acceptanceRate - a.acceptanceRate;
    }
    return b.total - a.total;
  }).slice(0, 10);

  // Preparar datos para el gráfico de aceptación
  const acceptanceChartData = {
    labels: sortedAcceptance.map(c => c.name),
    datasets: [
      {
        label: 'Tasa de Aceptación (%)',
        data: sortedAcceptance.map(c => c.acceptanceRate),
        backgroundColor: 'rgba(54, 162, 235, 0.8)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
      {
        label: 'Tasa de Rechazo (%)',
        data: sortedAcceptance.map(c => c.rejectionRate),
        backgroundColor: 'rgba(255, 99, 132, 0.8)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Opciones para el gráfico de barras
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',  // Barras horizontales para mejor legibilidad
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          boxWidth: 10,
          font: {
            size: 12
          }
        }
      },
      title: {
        display: true,
        text: `Tasas de Aceptación por Cookie (Top 10, ordenado por ${sortBy === 'acceptanceRate' ? 'aceptación' : 'uso'})`,
        font: {
          size: 14,
          weight: 'bold'
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.x || 0;
            return `${label}: ${value.toFixed(2)}%`;
          }
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Porcentaje (%)',
          font: {
            weight: 'bold'
          }
        },
        ticks: {
          callback: function(value) {
            return value + '%';
          }
        }
      },
      y: {
        title: {
          display: true,
          text: 'Cookie',
          font: {
            weight: 'bold'
          }
        }
      }
    }
  };

  // Opciones para el gráfico de dona
  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          usePointStyle: true,
          boxWidth: 10,
          font: {
            size: 12
          }
        }
      },
      title: {
        display: true,
        text: 'Distribución de Cookies por Categoría',
        font: {
          size: 14,
          weight: 'bold'
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(2);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  // Formateo de números con separador de miles
  const formatNumber = (num) => {
    return new Intl.NumberFormat().format(num);
  };

  return (
    <div className="space-y-6">
      {/* Resumen de Cookies */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded shadow transition-shadow hover:shadow-md">
          <h3 className="text-lg font-medium text-gray-600 mb-2">Total de Cookies</h3>
          <p className="text-3xl font-bold text-[#235C88]">
            {formatNumber(categories.reduce((sum, cat) => sum + cat.count, 0))}
          </p>
          <p className="text-sm text-gray-500 mt-2">En todas las categorías</p>
        </div>
        
        <div className="bg-white p-6 rounded shadow transition-shadow hover:shadow-md">
          <h3 className="text-lg font-medium text-gray-600 mb-2">Categorías</h3>
          <p className="text-3xl font-bold text-[#235C88]">{categories.length}</p>
          <p className="text-sm text-gray-500 mt-2">Tipos de cookies diferentes</p>
        </div>
        
        <div className="bg-white p-6 rounded shadow transition-shadow hover:shadow-md">
          <h3 className="text-lg font-medium text-gray-600 mb-2">Proveedores</h3>
          <p className="text-3xl font-bold text-[#235C88]">{providers.length}</p>
          <p className="text-sm text-gray-500 mt-2">Fuentes de cookies diferentes</p>
        </div>
      </div>
      
      {/* Gráficos principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded shadow">
          <div className="h-72">
            <Doughnut data={categoriesChartData} options={doughnutOptions} />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-600">Tasas de Aceptación (Top 10)</h3>
            <div className="flex space-x-2">
              <button 
                onClick={() => setSortBy('acceptanceRate')}
                className={`px-3 py-1 text-xs rounded-full ${
                  sortBy === 'acceptanceRate' 
                    ? 'bg-[#235C88] text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                } transition-colors`}
              >
                Por Aceptación
              </button>
              <button 
                onClick={() => setSortBy('count')}
                className={`px-3 py-1 text-xs rounded-full ${
                  sortBy === 'count' 
                    ? 'bg-[#235C88] text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                } transition-colors`}
              >
                Por Uso
              </button>
            </div>
          </div>
          <div className="h-72">
            <Bar data={acceptanceChartData} options={barOptions} />
          </div>
        </div>
      </div>
      
      {/* Tablas de datos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tabla de categorías */}
        <div className="bg-white p-6 rounded shadow overflow-x-auto">
          <h3 className="text-lg font-medium text-gray-600 mb-4">Cookies por Categoría</h3>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoría
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cantidad
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Porcentaje
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categories.map((category, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-3 w-3 rounded-full mr-2" style={{ backgroundColor: categoryColors[category.category] || '#ccc' }}></div>
                      <span className="text-sm font-medium text-gray-900">
                        {category.category.charAt(0).toUpperCase() + category.category.slice(1)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatNumber(category.count)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {category.percentage ? category.percentage.toFixed(2) + '%' : '0.00%'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Tabla de proveedores */}
        <div className="bg-white p-6 rounded shadow overflow-x-auto">
          <h3 className="text-lg font-medium text-gray-600 mb-4">Cookies por Proveedor</h3>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Proveedor
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cookies
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categorías
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {providers.map((provider, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {provider.provider}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatNumber(provider.cookieCount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex flex-wrap gap-1">
                      {provider.categories.map((cat, idx) => (
                        <span 
                          key={idx} 
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium" 
                          style={{ 
                            backgroundColor: `${categoryColors[cat] || '#ccc'}30`,
                            color: `${categoryColors[cat] || '#666'}FF`.replace('0.8', '1')
                          }}
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Tabla de aceptación de cookies */}
      <div className="bg-white p-6 rounded shadow overflow-x-auto">
        <h3 className="text-lg font-medium text-gray-600 mb-4">Tasas de Aceptación por Cookie</h3>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nombre
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Uso Total
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tasa de Aceptación
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tasa de Rechazo
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {acceptance.slice(0, 15).map((cookie, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {cookie.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatNumber(cookie.total)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-24 bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full" 
                        style={{ width: `${cookie.acceptanceRate}%` }}
                      ></div>
                    </div>
                    <span className="ml-2 text-sm text-gray-500">{cookie.acceptanceRate?.toFixed(2)}%</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-24 bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-red-500 h-2.5 rounded-full" 
                        style={{ width: `${cookie.rejectionRate}%` }}
                      ></div>
                    </div>
                    <span className="ml-2 text-sm text-gray-500">{cookie.rejectionRate?.toFixed(2)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

CookieAnalytics.propTypes = {
  data: PropTypes.shape({
    categories: PropTypes.array,
    purposes: PropTypes.array,
    acceptance: PropTypes.array,
    providers: PropTypes.array
  })
};

export default CookieAnalytics;