import React from 'react';
import { Globe, Server, MonitorSmartphone, ArrowUpRight } from 'lucide-react';
import './SummaryCards.css';

const SummaryCards = () => {
  const cards = [
    {
      title: 'Total Assets',
      value: '126,734',
      trend: '+3.4%',
      trendLabel: 'vs last 7 days',
      icon: <Globe size={20} className="card-icon" />
    },
    {
      title: 'Domains',
      value: '12,682',
      trend: '+2.1%',
      trendLabel: 'vs last 7 days',
      icon: <Globe size={20} className="card-icon" />
    },
    {
      title: 'IP Addresses',
      value: '98,765',
      trend: '+4.7%',
      trendLabel: 'vs last 7 days',
      icon: <MonitorSmartphone size={20} className="card-icon" />
    },
    {
      title: 'Open Ports',
      value: '245,572',
      trend: '+5.2%',
      trendLabel: 'vs last 7 days',
      icon: <Server size={20} className="card-icon" />
    }
  ];

  return (
    <div className="summary-cards">
      {cards.map((card, idx) => (
        <div key={idx} className="summary-card card">
          <div className="card-header">
            <h3 className="card-title">{card.title}</h3>
            <div className="icon-wrapper">
               {card.icon}
            </div>
          </div>
          <div className="card-body">
            <h2 className="card-value">{card.value}</h2>
            <div className="card-trend">
              <span className="trend-up">
                <ArrowUpRight size={14} /> {card.trend}
              </span>
              <span className="trend-label">{card.trendLabel}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SummaryCards;
