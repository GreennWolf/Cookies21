import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Registrar componentes de Chart.js incluyendo Filler para áreas sombreadas
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const AnalyticsTrends = ({ data = [] }) => {
  const [metrics, setMetrics] = useState(['visits', 'acceptanceRate']);
  
  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-6 rounded shadow text-center text-gray-500">
        No hay datos de tendencias disponibles. Selecciona otro rango de fechas o verifica la configuración.
      </div>
    );
  }

  // Formatear fechas para el eje X con formato más amigable
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('es', { 
      day: '2-digit', 
      month: 'short', 
      year: '2-digit'
    }).format(date);
  };

  // Preparar datos para el gráfico
  const chartData = {
    labels: data.map(item => formatDate(item.date)),
    datasets: []
  };

  // Colores para los datasets
  const colors = {
    visits: {
      border: 'rgba(75, 192, 192, 1)',
      background: 'rgba(75, 192, 192, 0.2)'
    },
    acceptanceRate: {
      border: 'rgba(54, 162, 235, 1)',
      background: 'rgba(54, 162, 235, 0.2)'
    },
    customizationRate: {
      border: 'rgba(255, 99, 132, 1)',
      background: 'rgba(255, 99, 132, 0.2)'
    }
  };

  // Añadir datasets según las métricas seleccionadas
  if (metrics.includes('visits')) {
    chartData.datasets.push({
      label: 'Visitas',
      data: data.map(item => item.visits || 0),
      borderColor: colors.visits.border,
      backgroundColor: colors.visits.background,
      borderWidth: 2,
      pointRadius: 3,
      pointBackgroundColor: colors.visits.border,
      yAxisID: 'y',
      tension: 0.3, // Hace las líneas más suaves
      fill: true
    });
  }

  if (metrics.includes('acceptanceRate')) {
    chartData.datasets.push({
      label: 'Tasa de Aceptación (%)',
      data: data.map(item => item.acceptanceRate || 0),
      borderColor: colors.acceptanceRate.border,
      backgroundColor: colors.acceptanceRate.background,
      borderWidth: 2,
      pointRadius: 3,
      pointBackgroundColor: colors.acceptanceRate.border,
      yAxisID: 'y1',
      tension: 0.3,
      fill: false
    });
  }

  if (metrics.includes('customizationRate')) {
    chartData.datasets.push({
      label: 'Tasa de Personalización (%)',
      data: data.map(item => item.customizationRate || 0),
      borderColor: colors.customizationRate.border,
      backgroundColor: colors.customizationRate.background,
      borderWidth: 2,
      pointRadius: 3,
      pointBackgroundColor: colors.customizationRate.border,
      yAxisID: 'y1',
      tension: 0.3,
      fill: false
    });
  }

  // Opciones del gráfico mejoradas
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    stacked: false,
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Visitas',
          font: {
            weight: 'bold'
          }
        },
        grid: {
          drawOnChartArea: true,
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          precision: 0
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Porcentaje (%)',
          font: {
            weight: 'bold'
          }
        },
        grid: {
          drawOnChartArea: false,
        },
        min: 0,
        max: 100,
        ticks: {
          callback: function(value) {
            return value + '%';
          }
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
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (label.includes('%')) {
              return label + context.parsed.y.toFixed(2) + '%';
            }
            return label + context.parsed.y.toLocaleString();
          }
        }
      }
    }
  };

  // Toggle para seleccionar métricas
  const toggleMetric = (metric) => {
    if (metrics.includes(metric)) {
      setMetrics(metrics.filter(m => m !== metric));
    } else {
      setMetrics([...metrics, metric]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Selector de métricas */}
      <div className="bg-white p-6 rounded shadow">
        <h3 className="text-lg font-medium text-gray-600 mb-3">Métricas a Mostrar</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => toggleMetric('visits')}
            className={`px-4 py-2 rounded-full ${
              metrics.includes('visits')
                ? 'bg-[#235C88] text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            } transition-colors`}
          >
            Visitas
          </button>
          <button
            onClick={() => toggleMetric('acceptanceRate')}
            className={`px-4 py-2 rounded-full ${
              metrics.includes('acceptanceRate')
                ? 'bg-[#235C88] text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            } transition-colors`}
          >
            Tasa de Aceptación
          </button>
          <button
            onClick={() => toggleMetric('customizationRate')}
            className={`px-4 py-2 rounded-full ${
              metrics.includes('customizationRate')
                ? 'bg-[#235C88] text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            } transition-colors`}
          >
            Tasa de Personalización
          </button>
        </div>
      </div>
      
      {/* Gráfico de tendencias */}
      <div className="bg-white p-6 rounded shadow">
        <h3 className="text-lg font-medium text-gray-600 mb-4">Tendencias</h3>
        <div className="h-80">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>
      
      {/* Tabla de datos */}
      <div className="bg-white p-6 rounded shadow overflow-x-auto">
        <h3 className="text-lg font-medium text-gray-600 mb-4">Datos Detallados</h3>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Visitas
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tasa de Aceptación
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tasa de Personalización
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(item.date)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.visits?.toLocaleString() || '0'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.acceptanceRate ? item.acceptanceRate.toFixed(2) + '%' : '0.00%'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.customizationRate ? item.customizationRate.toFixed(2) + '%' : '0.00%'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

AnalyticsTrends.propTypes = {
  data: PropTypes.array
};

export default AnalyticsTrends;