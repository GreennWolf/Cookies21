import React from 'react';
import PropTypes from 'prop-types';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';

// Registrar componentes de Chart.js
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const ConsentStats = ({ data }) => {
  if (!data || !data.rates || !data.trends || data.trends.length === 0) {
    return (
      <div className="bg-white p-6 rounded shadow text-center text-gray-500">
        No hay datos de consentimiento disponibles. Verifica el rango de fechas seleccionado o la configuración del dominio.
      </div>
    );
  }

  // Asegurar que los datos tienen valores predeterminados
  const { 
    rates = { 
      acceptanceRate: 0, 
      rejectionRate: 0, 
      customizationRate: 0 
    }, 
    trends = [] 
  } = data;
  
  // Colores consistentes para los tipos de consentimiento
  const colors = {
    accept: {
      background: 'rgba(75, 192, 192, 0.8)',
      border: 'rgba(75, 192, 192, 1)'
    },
    reject: {
      background: 'rgba(255, 99, 132, 0.8)',
      border: 'rgba(255, 99, 132, 1)'
    },
    customize: {
      background: 'rgba(54, 162, 235, 0.8)',
      border: 'rgba(54, 162, 235, 1)'
    }
  };
  
  // Preparar datos para el gráfico de distribución de consentimientos
  const consentDistributionData = {
    labels: ['Aceptar Todo', 'Rechazar Todo', 'Personalizar'],
    datasets: [
      {
        label: 'Distribución de Consentimientos',
        data: [
          rates.acceptanceRate || 0,
          rates.rejectionRate || 0,
          rates.customizationRate || 0
        ],
        backgroundColor: [
          colors.accept.background,
          colors.reject.background,
          colors.customize.background
        ],
        borderColor: [
          colors.accept.border,
          colors.reject.border,
          colors.customize.border
        ],
        borderWidth: 1,
      },
    ],
  };

  // Formatear fecha para mejor legibilidad
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('es', { 
      day: '2-digit', 
      month: 'short', 
      year: '2-digit'
    }).format(date);
  };

  // Preparar datos para el gráfico de tendencias en el tiempo
  const trendChartData = {
    labels: trends.map(t => formatDate(t.date)),
    datasets: [
      {
        label: 'Tasa de Aceptación (%)',
        data: trends.map(t => t.acceptAll || 0),
        borderColor: colors.accept.border,
        backgroundColor: colors.accept.background,
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: colors.accept.border,
        tension: 0.3,
        fill: false
      },
      {
        label: 'Tasa de Rechazo (%)',
        data: trends.map(t => t.rejectAll || 0),
        borderColor: colors.reject.border,
        backgroundColor: colors.reject.background,
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: colors.reject.border,
        tension: 0.3,
        fill: false
      },
      {
        label: 'Tasa de Personalización (%)',
        data: trends.map(t => t.customize || 0),
        borderColor: colors.customize.border,
        backgroundColor: colors.customize.background,
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: colors.customize.border,
        tension: 0.3,
        fill: false
      }
    ],
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
        text: 'Distribución de Consentimientos',
        font: {
          size: 16,
          weight: 'bold'
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const value = context.parsed || 0;
            return `${context.label}: ${value.toFixed(2)}%`;
          }
        }
      }
    }
  };

  // Opciones para el gráfico de línea
  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
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
        text: 'Tendencias de Consentimiento',
        font: {
          size: 16,
          weight: 'bold'
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}%`;
          }
        }
      }
    },
    scales: {
      y: {
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
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Fecha',
          font: {
            weight: 'bold'
          }
        },
        grid: {
          display: false
        }
      }
    }
  };

  // Formatear porcentaje con dos decimales
  const formatPercentage = (value) => {
    if (value === undefined || value === null) return '0.00%';
    return value.toFixed(2) + '%';
  };

  return (
    <div className="space-y-6">
      {/* Resumen de tasas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded shadow transition-shadow hover:shadow-md">
          <h3 className="text-lg font-medium text-gray-600 mb-2">Tasa de Aceptación</h3>
          <p className="text-3xl font-bold text-[#235C88]">{formatPercentage(rates.acceptanceRate)}</p>
          <p className="text-sm text-gray-500 mt-2">Usuarios que aceptan todas las cookies</p>
        </div>
        <div className="bg-white p-6 rounded shadow transition-shadow hover:shadow-md">
          <h3 className="text-lg font-medium text-gray-600 mb-2">Tasa de Rechazo</h3>
          <p className="text-3xl font-bold text-[#235C88]">{formatPercentage(rates.rejectionRate)}</p>
          <p className="text-sm text-gray-500 mt-2">Usuarios que rechazan todas las cookies</p>
        </div>
        <div className="bg-white p-6 rounded shadow transition-shadow hover:shadow-md">
          <h3 className="text-lg font-medium text-gray-600 mb-2">Tasa de Personalización</h3>
          <p className="text-3xl font-bold text-[#235C88]">{formatPercentage(rates.customizationRate)}</p>
          <p className="text-sm text-gray-500 mt-2">Usuarios que personalizan sus preferencias</p>
        </div>
      </div>
      
      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gráfico de distribución */}
        <div className="bg-white p-6 rounded shadow">
          <div className="h-64">
            <Doughnut data={consentDistributionData} options={doughnutOptions} />
          </div>
        </div>
        
        {/* Gráfico de tendencias */}
        <div className="bg-white p-6 rounded shadow">
          <div className="h-64">
            <Line data={trendChartData} options={lineOptions} />
          </div>
        </div>
      </div>
      
      {/* Tabla de datos de tendencias */}
      <div className="bg-white p-6 rounded shadow overflow-x-auto">
        <h3 className="text-lg font-medium text-gray-600 mb-4">Datos de Tendencias</h3>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aceptar Todo (%)
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rechazar Todo (%)
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Personalizar (%)
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {trends.map((item, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(item.date)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatPercentage(item.acceptAll)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatPercentage(item.rejectAll)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatPercentage(item.customize)}
                </td>
              </tr>
            ))}
            {trends.length === 0 && (
              <tr>
                <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                  No hay datos disponibles para el período seleccionado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

ConsentStats.propTypes = {
  data: PropTypes.shape({
    rates: PropTypes.object,
    trends: PropTypes.array
  })
};

export default ConsentStats;  