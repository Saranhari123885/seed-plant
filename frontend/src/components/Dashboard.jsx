import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  Sprout, Sun, LayoutDashboard, BarChart2, Clock, 
  Search, Download, Thermometer, Droplets, Wind, Waves, CheckCircle, AlertTriangle, Activity
} from 'lucide-react';

const Dashboard = () => {
  const [dataHistory, setDataHistory] = useState([]);
  const [currentData, setCurrentData] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeMainTab, setActiveMainTab] = useState('Analytics');
  const [activeInnerTab, setActiveInnerTab] = useState('All Sensors');
  const [activeTimeFilter, setActiveTimeFilter] = useState('2m');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const API_BASE = 'http://localhost:8001/api';
  const MAX_HISTORY = 50;

  useEffect(() => {
    let interval;
    const initData = async () => {
      try {
        const histRes = await axios.get(`${API_BASE}/history`);
        if (histRes.data.history && histRes.data.history.length > 0) {
          setDataHistory(histRes.data.history.map(d => ({...d, status: 'Safe'}))); 
        }
      } catch (err) {}
      
      const fetchLiveData = async () => {
        try {
          const { data } = await axios.get(`${API_BASE}/data`);
          const newReading = data.readings;
          
          const timestamp = new Date(data.timestamp).toLocaleTimeString('en-US', { hour12: true });

          setCurrentData(newReading);

          const predRes = await axios.post(`${API_BASE}/predict`, newReading);
          const predictionData = predRes.data;
          setPrediction(predictionData);

          const point = {
            time: timestamp,
            temperature: parseFloat(newReading.temperature.toFixed(2)),
            humidity: parseFloat(newReading.humidity.toFixed(2)),
            co2: parseFloat(newReading.co2.toFixed(2)),
            moisture: parseFloat(newReading.moisture.toFixed(2)),
            status: predictionData.prediction,
            predictionLevel: predictionData.prediction === 'Critical' ? 3 : (predictionData.prediction === 'Warning' ? 2 : 1)
          };

          setDataHistory(prev => {
            const updated = [...prev, point];
            if (updated.length > MAX_HISTORY) updated.shift();
            return updated;
          });

          if (predictionData.prediction === 'Critical' || predictionData.prediction === 'Warning') {
            setAlerts(prev => {
              const newAlert = {
                id: Date.now(),
                time: timestamp,
                type: predictionData.prediction,
                msg: `System at ${predictionData.prediction} condition`
              };
              return [newAlert, ...prev].slice(0, 15);
            });
          }
          setLoading(false);
        } catch (err) {}
      };

      fetchLiveData();
      interval = setInterval(fetchLiveData, 3000);
    };

    initData();
    return () => { if (interval) clearInterval(interval); };
  }, []);

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
      </div>
    );
  }

  const colors = {
    temp: '#f43f5e',      
    hum: '#3b82f6',       
    moist: '#10b981',     
    co2: '#a855f7',       
    co2Fill: '#a855f7',
    safe: '#10b981',
    warn: '#fbbf24',
    crit: '#f43f5e'
  };

  const CustomLineTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-time">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color, margin: '4px 0', fontSize: '12px', fontWeight: 500 }}>
              {entry.name} : {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const filteredHistory = dataHistory.filter(item => {
    const matchesSearch = item.time.includes(searchQuery) || item.temperature.toString().includes(searchQuery);
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).reverse(); 

  return (
    <div className="app-container">
      <header className="top-header">
        <div className="brand">
          <div className="logo-icon"><Sprout size={24} color="#10b981" /></div>
          <div className="brand-text">
            <h1 className="brand-title">GrainGuard AI</h1>
            <p className="brand-subtitle">Predictive Maintenance Dashboard</p>
          </div>
        </div>
        <div className="header-actions">
          <div className="live-badge">
            <span className="live-icon">[]</span> Live
          </div>
          <button className="icon-btn theme-toggle"><Sun size={20} /></button>
        </div>
      </header>

      <div className="main-nav-container">
        <div className="main-tabs">
          <button 
            className={`main-tab ${activeMainTab === 'Dashboard' ? 'active' : ''}`}
            onClick={() => setActiveMainTab('Dashboard')}
          >
            <LayoutDashboard size={18} /> Dashboard
          </button>
          <button 
            className={`main-tab ${activeMainTab === 'Analytics' ? 'active' : ''}`}
            onClick={() => setActiveMainTab('Analytics')}
          >
            <BarChart2 size={18} /> Analytics
          </button>
          <button 
            className={`main-tab ${activeMainTab === 'History' ? 'active' : ''}`}
            onClick={() => setActiveMainTab('History')}
          >
            <Clock size={18} /> History
          </button>
        </div>
      </div>

      <div className="tab-content">
        
        {activeMainTab === 'Dashboard' && (
          <div className="dashboard-view animate-fade-in">
            <div className="metrics-grid">
              <div className="stat-card">
                <div className="stat-header"><span>Temperature</span><Thermometer size={20} color={colors.temp} /></div>
                <div className="stat-value">{currentData?.temperature?.toFixed(1)}<span className="unit">°C</span></div>
              </div>
              <div className="stat-card">
                <div className="stat-header"><span>Humidity</span><Droplets size={20} color={colors.hum} /></div>
                <div className="stat-value">{currentData?.humidity?.toFixed(1)}<span className="unit">%</span></div>
              </div>
              <div className="stat-card">
                <div className="stat-header"><span>Moisture</span><Waves size={20} color={colors.moist} /></div>
                <div className="stat-value">{currentData?.moisture?.toFixed(1)}<span className="unit">%</span></div>
              </div>
              <div className="stat-card highlight-co2">
                <div className="stat-header"><span>Carbon Dioxide</span><Wind size={20} color={colors.co2} /></div>
                <div className="stat-value" style={{color: colors.co2}}>{currentData?.co2?.toFixed(0)}<span className="unit">ppm</span></div>
              </div>
            </div>
            
            <div className="health-section">
               <div className="panel health-panel">
                  <h3>System Health</h3>
                  <div className={`health-status ${prediction?.prediction?.toLowerCase()}`}>
                    {prediction?.prediction === 'Safe' ? <CheckCircle size={48} /> : 
                     prediction?.prediction === 'Warning' ? <AlertTriangle size={48} /> : 
                     <Activity size={48} />}
                    <h2>{prediction?.prediction || 'Safe'}</h2>
                    <p>Confidence: {prediction?.confidence ? (prediction.confidence * 100).toFixed(1) : '100'}%</p>
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeMainTab === 'Analytics' && (
          <div className="analytics-view animate-fade-in panel">
            <div className="analytics-header">
              <h3>Sensor Analytics</h3>
              <div className="time-filters">
                {['30s', '2m', '5m', 'All'].map(t => (
                  <button 
                    key={t}
                    className={`time-btn ${activeTimeFilter === t ? 'active' : ''}`}
                    onClick={() => setActiveTimeFilter(t)}
                  >{t}</button>
                ))}
              </div>
            </div>

            <div className="inner-tabs-container">
              <button className={`inner-tab ${activeInnerTab === 'All Sensors' ? 'active' : ''}`} onClick={() => setActiveInnerTab('All Sensors')}>All Sensors</button>
              <button className={`inner-tab ${activeInnerTab === 'Temp' ? 'active' : ''}`} onClick={() => setActiveInnerTab('Temp')}>Temp</button>
              <button className={`inner-tab ${activeInnerTab === 'Air Quality' ? 'active' : ''}`} onClick={() => setActiveInnerTab('Air Quality')}>Air Quality</button>
              <button className={`inner-tab ${activeInnerTab === 'Prediction' ? 'active' : ''}`} onClick={() => setActiveInnerTab('Prediction')}>Prediction</button>
            </div>

            <div className="chart-wrapper">
              {activeInnerTab === 'All Sensors' && (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={dataHistory} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={true} horizontal={true}/>
                    <XAxis dataKey="time" stroke="#64748b" tick={{fill: '#64748b', fontSize: 11}} tickMargin={10} />
                    <YAxis stroke="#64748b" tick={{fill: '#64748b', fontSize: 11}} domain={[0, 100]} />
                    <Tooltip content={<CustomLineTooltip />} cursor={{ stroke: '#94a3b8', strokeWidth: 1 }} />
                    <Line type="monotone" dataKey="temperature" name="Temp °C" stroke={colors.temp} strokeWidth={2} dot={false} activeDot={{ r: 5, fill: '#0f172a', stroke: colors.temp, strokeWidth: 2 }} />
                    <Line type="monotone" dataKey="humidity" name="Humidity %" stroke={colors.hum} strokeWidth={2} dot={false} activeDot={{ r: 5, fill: '#0f172a', stroke: colors.hum, strokeWidth: 2 }} />
                    <Line type="monotone" dataKey="moisture" name="Moisture %" stroke={colors.moist} strokeWidth={2} dot={false} activeDot={{ r: 5, fill: '#0f172a', stroke: colors.moist, strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}

              {activeInnerTab === 'Temp' && (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={dataHistory} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                    <defs>
                      <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={colors.temp} stopOpacity={0.4}/>
                        <stop offset="95%" stopColor={colors.temp} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorHum" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={colors.hum} stopOpacity={0.2}/>
                        <stop offset="95%" stopColor={colors.hum} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={true} />
                    <XAxis dataKey="time" stroke="#64748b" tick={{fill: '#64748b', fontSize: 11}} tickMargin={10} />
                    <YAxis stroke="#64748b" tick={{fill: '#64748b', fontSize: 11}} domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
                    <Area type="monotone" dataKey="humidity" name="Humidity %" stroke={colors.hum} fill="url(#colorHum)" strokeWidth={2} />
                    <Area type="monotone" dataKey="temperature" name="Temp °C" stroke={colors.temp} fill="url(#colorTemp)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}

              {activeInnerTab === 'Air Quality' && (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={dataHistory} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                    <defs>
                      <linearGradient id="colorCo2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={colors.co2Fill} stopOpacity={0.4}/>
                        <stop offset="95%" stopColor={colors.co2Fill} stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={true} />
                    <XAxis dataKey="time" stroke="#64748b" tick={{fill: '#64748b', fontSize: 11}} tickMargin={10} />
                    <YAxis stroke="#64748b" tick={{fill: '#64748b', fontSize: 11}} domain={[0, 1000]} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
                    <Area type="monotone" dataKey="co2" name="CO2 ppm" stroke={colors.co2} fill="url(#colorCo2)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}

              {activeInnerTab === 'Prediction' && (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={dataHistory} margin={{ top: 20, right: 30, left: 0, bottom: 20 }} barCategoryGap="10%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={true} horizontal={false}/>
                    <XAxis dataKey="time" stroke="#64748b" tick={{fill: '#64748b', fontSize: 11}} tickMargin={10} />
                    <YAxis 
                      stroke="#64748b" 
                      tick={{fill: '#64748b', fontSize: 11}} 
                      domain={[0, 3]} 
                      ticks={[1, 2, 3]} 
                      tickFormatter={(val) => val === 3 ? 'Crit' : val === 2 ? 'Warn' : 'Safe'} 
                    />
                    <Tooltip cursor={{fill: '#1e293b'}} contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff' }} formatter={(v, n, props) => [props.payload.status, "Status"]} />
                    <Bar dataKey="predictionLevel" radius={[4, 4, 0, 0]}>
                      {dataHistory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.predictionLevel === 3 ? colors.crit : entry.predictionLevel === 2 ? colors.warn : colors.safe} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {activeMainTab === 'History' && (
          <div className="history-view animate-fade-in panel">
            <div className="history-header">
              <h3>Historical Data</h3>
              <button className="export-btn"><Download size={14}/> Export CSV</button>
            </div>
            
            <div className="history-filters">
              <div className="search-box">
                <Search size={16} color="#64748b" />
                <input 
                  type="text" 
                  placeholder="Search readings..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="status-filters">
                {['All', 'Safe', 'Warning', 'Critical'].map(s => (
                  <button 
                    key={s} 
                    className={`status-btn ${statusFilter === s ? 'active' : ''}`}
                    onClick={() => setStatusFilter(s)}
                  >{s}</button>
                ))}
              </div>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Temp °C</th>
                    <th>Humidity %</th>
                    <th>CO₂ ppm</th>
                    <th>Moisture %</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((row, i) => (
                    <tr key={i}>
                      <td>{row.time}</td>
                      <td>{row.temperature}</td>
                      <td>{row.humidity}</td>
                      <td>{row.co2}</td>
                      <td>{row.moisture}</td>
                      <td>
                        <span className={`status-pill pill-${row.status?.toLowerCase()}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredHistory.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{textAlign: 'center', padding: '30px', color: '#64748b'}}>No records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
