/* /src/components/analytics/AnalyticsCharts.jsx */
import React from 'react';
import PropTypes from 'prop-types';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

// Colores consistentes con la paleta de la aplicación
const COLORS = ['#235C88', '#64A1D8', '#92BFDD', '#AFDDF3', '#CCEAF8'];
const SECONDARY_COLORS = ['#F76540', '#F9A03F', '#FFD55A', '#89DD5E', '#38B2AC'];

// Función para formatear fechas
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// LoadingIndicator component
export const LoadingIndicator = () => (
  <div className="flex justify-center py-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#235C88]"></div>
  </div>
);

// EmptyDataMessage component
export const EmptyDataMessage = ({ message = "No hay datos disponibles para el período seleccionado" }) => (
  <p className="text-center py-8 text-gray-500">{message}</p>
);

// LineChartComponent
export const LineChartComponent = ({ data, xKey, series, height = 350, formatX, tooltipFormatter }) => {
  const defaultFormatter = (value) => [value, ''];
  
  return (
    <div style={{ height: height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey={xKey} 
            tickFormatter={formatX || ((value) => typeof value === 'string' && value.includes('T') ? formatDate(value) : value)}
          />
          <YAxis />
          <Tooltip 
            formatter={tooltipFormatter || defaultFormatter}
            labelFormatter={formatX || ((value) => typeof value === 'string' && value.includes('T') ? formatDate(value) : value)}
          />
          <Legend />
          {series.map((item, index) => (
            <Line
              key={item.key}
              type="monotone"
              dataKey={item.key}
              stroke={item.color || COLORS[index % COLORS.length]}
              activeDot={{ r: 8 }}
              name={item.name || item.key}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

LineChartComponent.propTypes = {
  data: PropTypes.array.isRequired,
  xKey: PropTypes.string.isRequired,
  series: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      name: PropTypes.string,
      color: PropTypes.string
    })
  ).isRequired,
  height: PropTypes.number,
  formatX: PropTypes.func,
  tooltipFormatter: PropTypes.func
};

// BarChartComponent
export const BarChartComponent = ({ 
  data, 
  xKey, 
  series, 
  height = 350, 
  layout = 'vertical', 
  formatX,
  tooltipFormatter
}) => {
  const defaultFormatter = (value) => [value, ''];
  
  return (
    <div style={{ height: height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout={layout}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          {layout === 'vertical' ? (
            <>
              <XAxis type="number" />
              <YAxis dataKey={xKey} type="category" />
            </>
          ) : (
            <>
              <XAxis dataKey={xKey} tickFormatter={formatX} />
              <YAxis />
            </>
          )}
          <Tooltip 
            formatter={tooltipFormatter || defaultFormatter}
            labelFormatter={formatX}
          />
          <Legend />
          {series.map((item, index) => (
            <Bar
              key={item.key}
              dataKey={item.key}
              fill={item.color || COLORS[index % COLORS.length]}
              name={item.name || item.key}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

BarChartComponent.propTypes = {
  data: PropTypes.array.isRequired,
  xKey: PropTypes.string.isRequired,
  series: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      name: PropTypes.string,
      color: PropTypes.string
    })
  ).isRequired,
  height: PropTypes.number,
  layout: PropTypes.oneOf(['vertical', 'horizontal']),
  formatX: PropTypes.func,
  tooltipFormatter: PropTypes.func
};

// PieChartComponent
export const PieChartComponent = ({ 
  data, 
  nameKey, 
  dataKey, 
  height = 350, 
  colors = COLORS,
  tooltipFormatter
}) => {
  const defaultFormatter = (value, name) => [value, name];
  
  return (
    <div style={{ height: height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey={dataKey}
            nameKey={nameKey}
            label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip formatter={tooltipFormatter || defaultFormatter} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

PieChartComponent.propTypes = {
  data: PropTypes.array.isRequired,
  nameKey: PropTypes.string.isRequired,
  dataKey: PropTypes.string.isRequired,
  height: PropTypes.number,
  colors: PropTypes.array,
  tooltipFormatter: PropTypes.func
};

// AreaChartComponent
export const AreaChartComponent = ({ 
  data, 
  xKey, 
  series, 
  height = 350, 
  formatX,
  tooltipFormatter,
  stacked = false 
}) => {
  const defaultFormatter = (value) => [value, ''];
  
  return (
    <div style={{ height: height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey={xKey} 
            tickFormatter={formatX || ((value) => typeof value === 'string' && value.includes('T') ? formatDate(value) : value)}
          />
          <YAxis />
          <Tooltip 
            formatter={tooltipFormatter || defaultFormatter}
            labelFormatter={formatX || ((value) => typeof value === 'string' && value.includes('T') ? formatDate(value) : value)}
          />
          <Legend />
          {series.map((item, index) => (
            <Area 
              key={item.key}
              type="monotone" 
              dataKey={item.key}
              stackId={stacked ? "1" : index}
              stroke={item.color || COLORS[index % COLORS.length]} 
              fill={item.fillColor || item.color || COLORS[index % COLORS.length]} 
              name={item.name || item.key}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

AreaChartComponent.propTypes = {
  data: PropTypes.array.isRequired,
  xKey: PropTypes.string.isRequired,
  series: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      name: PropTypes.string,
      color: PropTypes.string,
      fillColor: PropTypes.string
    })
  ).isRequired,
  height: PropTypes.number,
  formatX: PropTypes.func,
  tooltipFormatter: PropTypes.func,
  stacked: PropTypes.bool
};

// StatCard Component
export const StatCard = ({ title, value, isLoading, format }) => {
  const formattedValue = format ? format(value) : value;
  
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-sm text-gray-500 mb-1">{title}</h3>
      <p className="text-2xl font-bold text-[#235C88]">
        {isLoading ? (
          <span className="animate-pulse">...</span>
        ) : (
          formattedValue
        )}
      </p>
    </div>
  );
};

StatCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ]),
  isLoading: PropTypes.bool,
  format: PropTypes.func
};

// Analytics Tab Component
export const AnalyticsTab = ({ id, label, icon, active, onClick }) => {
  return (
    <button
      className={`px-4 py-2 flex items-center ${
        active
          ? 'text-[#235C88] border-b-2 border-[#235C88] font-medium'
          : 'text-gray-500 hover:text-gray-700'
      }`}
      onClick={() => onClick(id)}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {label}
    </button>
  );
};

AnalyticsTab.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  icon: PropTypes.node,
  active: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired
};

// Analytics TabContent Component
export const AnalyticsTabContent = ({ id, activeTab, children }) => {
  if (id !== activeTab) return null;
  
  return (
    <div className="space-y-6">
      {children}
    </div>
  );
};

AnalyticsTabContent.propTypes = {
  id: PropTypes.string.isRequired,
  activeTab: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired
};

// Export all components
export default {
  LineChartComponent,
  BarChartComponent,
  PieChartComponent,
  AreaChartComponent,
  StatCard,
  AnalyticsTab,
  AnalyticsTabContent,
  LoadingIndicator,
  EmptyDataMessage
};