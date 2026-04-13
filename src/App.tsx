import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Armchair,
  BadgeIndianRupee,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  MapPin,
  Sparkles,
  Ticket,
  Trophy,
} from 'lucide-react';

type Section = {
  id: string;
  name: string;
  shortLabel: string;
  sponsor: string;
  price: number;
  color: string;
  startAngle: number;
  endAngle: number;
  innerRadius: number;
  outerRadius: number;
  rows: number;
  seatsPerRow: number;
  gate: string;
  lounge?: string;
};

type SeatNode = {
  id: string;
  sectionId: string;
  sectionName: string;
  sponsor: string;
  price: number;
  color: string;
  gate: string;
  rowLabel: string;
  seatNumber: number;
  x: number;
  y: number;
};

const sections: Section[] = [
  {
    id: 'K',
    name: 'Birla Estates Block K',
    shortLabel: 'Block K',
    sponsor: 'Birla Estates',
    price: 1200,
    color: '#4eb4ff',
    startAngle: -202,
    endAngle: -154,
    innerRadius: 306,
    outerRadius: 420,
    rows: 3,
    seatsPerRow: 9,
    gate: 'Gate 1',
  },
  {
    id: 'L',
    name: 'Jio Block L',
    shortLabel: 'Block L',
    sponsor: 'Jio',
    price: 1500,
    color: '#8f6bff',
    startAngle: -154,
    endAngle: -114,
    innerRadius: 314,
    outerRadius: 420,
    rows: 3,
    seatsPerRow: 8,
    gate: 'Gate 1',
  },
  {
    id: 'M',
    name: 'Astral Pipes Block M',
    shortLabel: 'Block M',
    sponsor: 'Astral Pipes',
    price: 2000,
    color: '#7a43d6',
    startAngle: -114,
    endAngle: -70,
    innerRadius: 312,
    outerRadius: 420,
    rows: 3,
    seatsPerRow: 8,
    gate: 'Gate 2',
    lounge: 'North Club',
  },
  {
    id: 'N',
    name: 'Torrent Block N',
    shortLabel: 'Block N',
    sponsor: 'Torrent',
    price: 3000,
    color: '#eea24a',
    startAngle: -70,
    endAngle: -22,
    innerRadius: 298,
    outerRadius: 420,
    rows: 4,
    seatsPerRow: 8,
    gate: 'Gate 2',
    lounge: 'Torrent Lounge',
  },
  {
    id: 'P',
    name: 'Torrent Block P',
    shortLabel: 'Block P',
    sponsor: 'Torrent',
    price: 6000,
    color: '#53b8cf',
    startAngle: -22,
    endAngle: 28,
    innerRadius: 298,
    outerRadius: 420,
    rows: 4,
    seatsPerRow: 8,
    gate: 'Gate 3',
  },
  {
    id: 'Q',
    name: 'BKT Tyres Block Q',
    shortLabel: 'Block Q',
    sponsor: 'BKT Tyres',
    price: 15000,
    color: '#6cc8d9',
    startAngle: 28,
    endAngle: 78,
    innerRadius: 306,
    outerRadius: 420,
    rows: 3,
    seatsPerRow: 9,
    gate: 'Gate 3',
  },
  {
    id: 'R',
    name: 'Equitas Bank Block R',
    shortLabel: 'Block R',
    sponsor: 'Equitas Bank',
    price: 17000,
    color: '#a76dff',
    startAngle: 78,
    endAngle: 128,
    innerRadius: 310,
    outerRadius: 420,
    rows: 3,
    seatsPerRow: 8,
    gate: 'Gate 4',
  },
  {
    id: 'J',
    name: 'Crew Solar Block J',
    shortLabel: 'Block J',
    sponsor: 'Crew Solar',
    price: 22000,
    color: '#c3bbff',
    startAngle: 128,
    endAngle: 166,
    innerRadius: 316,
    outerRadius: 420,
    rows: 3,
    seatsPerRow: 7,
    gate: 'Gate 4',
  },
  {
    id: 'SP',
    name: 'Birla Estates South Premium',
    shortLabel: 'South Premium',
    sponsor: 'Birla Estates',
    price: 28000,
    color: '#a8d89f',
    startAngle: 166,
    endAngle: 194,
    innerRadius: 280,
    outerRadius: 372,
    rows: 2,
    seatsPerRow: 7,
    gate: 'Gate 5',
    lounge: 'South Club',
  },
  {
    id: 'PP',
    name: 'President Gallery',
    shortLabel: 'President Gallery',
    sponsor: 'Torrent',
    price: 30000,
    color: '#f5a5a0',
    startAngle: 194,
    endAngle: 212,
    innerRadius: 280,
    outerRadius: 372,
    rows: 2,
    seatsPerRow: 5,
    gate: 'Gate 5',
    lounge: 'Hospitality Deck',
  },
  {
    id: 'PS',
    name: 'Premium Suites',
    shortLabel: 'Premium Suites',
    sponsor: 'Birla Estates',
    price: 40000,
    color: '#d8c4c3',
    startAngle: 212,
    endAngle: 230,
    innerRadius: 280,
    outerRadius: 372,
    rows: 2,
    seatsPerRow: 5,
    gate: 'VIP Entry',
    lounge: 'Private Suite Access',
  },
];

const bookedSeatIds = new Set([
  'K-A3',
  'K-B4',
  'L-A6',
  'M-C2',
  'N-A4',
  'N-D7',
  'P-B6',
  'Q-C5',
  'R-A2',
  'J-B3',
  'SP-A6',
  'PP-B2',
  'PS-A4',
]);

const rowLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const center = 500;

function polarToCartesian(cx: number, cy: number, radius: number, angle: number) {
  const radians = (angle - 90) * (Math.PI / 180);
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

function createSectionPath(section: Section) {
  const startOuter = polarToCartesian(center, center, section.outerRadius, section.endAngle);
  const endOuter = polarToCartesian(center, center, section.outerRadius, section.startAngle);
  const startInner = polarToCartesian(center, center, section.innerRadius, section.startAngle);
  const endInner = polarToCartesian(center, center, section.innerRadius, section.endAngle);
  const largeArc = Math.abs(section.endAngle - section.startAngle) > 180 ? 1 : 0;

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${section.outerRadius} ${section.outerRadius} 0 ${largeArc} 0 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${section.innerRadius} ${section.innerRadius} 0 ${largeArc} 1 ${endInner.x} ${endInner.y}`,
    'Z',
  ].join(' ');
}

function createSeats(section: Section) {
  const seats: SeatNode[] = [];

  for (let row = 0; row < section.rows; row += 1) {
    const rowLabel = rowLetters[row];
    const radiusStep =
      section.rows === 1
        ? 0
        : (section.outerRadius - section.innerRadius - 24) / (section.rows - 1);
    const radius = section.innerRadius + 14 + row * radiusStep;
    const span = section.endAngle - section.startAngle;

    for (let seat = 0; seat < section.seatsPerRow; seat += 1) {
      const angle = section.startAngle + span * ((seat + 0.5) / section.seatsPerRow);
      const { x, y } = polarToCartesian(center, center, radius, angle);
      seats.push({
        id: `${section.id}-${rowLabel}${seat + 1}`,
        sectionId: section.id,
        sectionName: section.name,
        sponsor: section.sponsor,
        price: section.price,
        color: section.color,
        gate: section.gate,
        rowLabel,
        seatNumber: seat + 1,
        x,
        y,
      });
    }
  }

  return seats;
}

const allSeats = sections.flatMap(createSeats);

const priceTiers = [
  { price: 1200, color: '#4eb4ff' },
  { price: 1500, color: '#8f6bff' },
  { price: 2000, color: '#7a43d6' },
  { price: 3000, color: '#eea24a' },
  { price: 6000, color: '#53b8cf' },
  { price: 15000, color: '#6cc8d9' },
  { price: 17000, color: '#ff4fa6' },
  { price: 22000, color: '#c3bbff' },
  { price: 28000, color: '#a8d89f' },
  { price: 30000, color: '#f5a5a0' },
  { price: 40000, color: '#d8c4c3' },
];

const formatPrice = (price: number) => `₹${price.toLocaleString('en-IN')}`;

function App() {
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [bookedIds, setBookedIds] = useState<Set<string>>(new Set(bookedSeatIds));
  const [activeSectionId, setActiveSectionId] = useState<string>('N');
  const [expandedTier, setExpandedTier] = useState<number | null>(3000);
  const [confirmationCode, setConfirmationCode] = useState<string | null>(null);

  const selectedSeats = allSeats.filter((seat) => selectedSeatIds.includes(seat.id));
  const activeSection = sections.find((section) => section.id === activeSectionId) ?? sections[0];
  const activeSectionSeats = allSeats.filter((seat) => seat.sectionId === activeSection.id);
  const activeAvailable = activeSectionSeats.filter((seat) => !bookedIds.has(seat.id)).length;
  const activeBooked = activeSectionSeats.length - activeAvailable;
  const total = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
  const activeTicketCount = selectedSeats.filter((seat) => seat.sectionId === activeSection.id).length;

  const handleSeatToggle = (seatId: string) => {
    if (bookedIds.has(seatId)) return;

    setSelectedSeatIds((current) =>
      current.includes(seatId) ? current.filter((id) => id !== seatId) : [...current, seatId],
    );
  };

  const handleBookNow = () => {
    if (!selectedSeatIds.length) return;

    setBookedIds((current) => {
      const next = new Set(current);
      selectedSeatIds.forEach((seatId) => next.add(seatId));
      return next;
    });
    setConfirmationCode(`PW-${Math.random().toString(36).slice(2, 8).toUpperCase()}`);
    setSelectedSeatIds([]);
  };

  return (
    <div className="booking-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <main className="booking-app">
        <motion.section
          className="hero-panel"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="hero-copy">
            <span className="eyebrow">
              <Sparkles size={14} />
              3D Seat Booking Experience
            </span>
            <h1>Choose your exact stadium seat and book it live.</h1>
            <p>
              A premium circular map inspired by your reference, with distinct sections, clear
              pricing, and direct seat selection that feels modern and functional.
            </p>
            <div className="hero-meta">
              <div className="meta-pill">
                <CalendarDays size={15} />
                20 April 2026
              </div>
              <div className="meta-pill">
                <Clock3 size={15} />
                7:30 PM IST
              </div>
              <div className="meta-pill">
                <Trophy size={15} />
                Global Champions Stadium
              </div>
            </div>
          </div>

          <div className="hero-card">
            <div className="hero-card-top">
              <span>Featured Match</span>
              <span className="status-dot">Live Booking</span>
            </div>
            <h2>Strikers FC vs Titans XI</h2>
            <p>Seats update instantly by section, row and exact position.</p>

            <div className="hero-stats">
              <div>
                <strong>{sections.length}</strong>
                <span>Sections</span>
              </div>
              <div>
                <strong>{allSeats.length}</strong>
                <span>Total seats</span>
              </div>
              <div>
                <strong>{allSeats.length - bookedIds.size}</strong>
                <span>Available</span>
              </div>
            </div>
          </div>
        </motion.section>

        <section className="content-grid">
          <motion.div
            className="stadium-panel"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            <div className="panel-head">
              <div>
                <p className="panel-kicker">Interactive Map</p>
                <h3>3D-style bowl view</h3>
              </div>
              <div className="seat-state-legend">
                <span>
                  <i className="dot available" />
                  Available
                </span>
                <span>
                  <i className="dot selected" />
                  Selected
                </span>
                <span>
                  <i className="dot booked" />
                  Booked
                </span>
              </div>
            </div>

            <div className="stadium-stage">
              <div className="stadium-floor" />
              <div className="stadium-svg-wrap">
                <svg viewBox="0 0 1000 1000" className="stadium-svg" aria-label="stadium seat map">
                  <defs>
                    <radialGradient id="pitchGlow" cx="50%" cy="50%" r="75%">
                      <stop offset="0%" stopColor="#4caf6a" />
                      <stop offset="100%" stopColor="#25512d" />
                    </radialGradient>
                    <linearGradient id="fieldStrip" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#67dd86" stopOpacity="0.85" />
                      <stop offset="100%" stopColor="#2d6c3b" stopOpacity="0.95" />
                    </linearGradient>
                  </defs>

                  <ellipse cx="500" cy="525" rx="320" ry="260" fill="rgba(7, 14, 24, 0.92)" />
                  <ellipse cx="500" cy="525" rx="290" ry="236" fill="url(#pitchGlow)" />
                  <rect x="476" y="430" width="48" height="190" rx="6" fill="#f4f3ef" opacity="0.95" />
                  <rect x="487" y="346" width="26" height="96" rx="6" fill="#f4f3ef" opacity="0.9" />

                  {sections.map((section) => {
                    const mid = (section.startAngle + section.endAngle) / 2;
                    const labelPoint = polarToCartesian(center, center, section.outerRadius + 60, mid);
                    const isActive = activeSectionId === section.id;
                    return (
                      <g key={section.id}>
                        <path
                          d={createSectionPath(section)}
                          fill={section.color}
                          opacity={isActive ? 0.95 : 0.76}
                          stroke={isActive ? '#ffffff' : 'rgba(255,255,255,0.18)'}
                          strokeWidth={isActive ? 4 : 2}
                          className="section-path"
                          onClick={() => setActiveSectionId(section.id)}
                        />
                        <text
                          x={labelPoint.x}
                          y={labelPoint.y}
                          textAnchor="middle"
                          className={`section-label ${isActive ? 'active' : ''}`}
                          onClick={() => setActiveSectionId(section.id)}
                        >
                          {section.shortLabel}
                        </text>
                      </g>
                    );
                  })}

                  {allSeats.map((seat) => {
                    const isSelected = selectedSeatIds.includes(seat.id);
                    const isBooked = bookedIds.has(seat.id);
                    const isActive = seat.sectionId === activeSectionId;
                    return (
                      <circle
                        key={seat.id}
                        cx={seat.x}
                        cy={seat.y}
                        r={isSelected ? 9.5 : 7}
                        className={[
                          'seat-node',
                          isBooked ? 'is-booked' : '',
                          isSelected ? 'is-selected' : '',
                          isActive ? 'is-active' : '',
                        ].join(' ')}
                        style={{ '--seat-color': seat.color } as React.CSSProperties}
                        onClick={() => {
                          setActiveSectionId(seat.sectionId);
                          handleSeatToggle(seat.id);
                        }}
                      />
                    );
                  })}
                </svg>
              </div>
            </div>

            <div className="section-chips">
              {sections.map((section) => {
                const isActive = activeSectionId === section.id;
                const freeCount = allSeats.filter(
                  (seat) => seat.sectionId === section.id && !bookedIds.has(seat.id),
                ).length;

                return (
                  <button
                    key={section.id}
                    type="button"
                    className={`section-chip ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveSectionId(section.id)}
                    style={{ '--chip-color': section.color } as React.CSSProperties}
                  >
                    <span>{section.shortLabel}</span>
                    <small>{freeCount} open</small>
                  </button>
                );
              })}
            </div>
          </motion.div>

          <motion.aside
            className="sidebar-stack"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            <div className="info-card">
              <div className="panel-head compact">
                <div>
                  <p className="panel-kicker">Active Section</p>
                  <h3>{activeSection.name}</h3>
                </div>
                <span className="section-price">{formatPrice(activeSection.price)}</span>
              </div>

              <div className="info-grid">
                <div>
                  <span>Available</span>
                  <strong>{activeAvailable}</strong>
                </div>
                <div>
                  <span>Booked</span>
                  <strong>{activeBooked}</strong>
                </div>
                <div>
                  <span>Entry</span>
                  <strong>{activeSection.gate}</strong>
                </div>
                <div>
                  <span>Lounge</span>
                  <strong>{activeSection.lounge ?? 'Standard Access'}</strong>
                </div>
              </div>

              <div className="active-banner" style={{ '--banner-color': activeSection.color } as React.CSSProperties}>
                <MapPin size={16} />
                <span>
                  {activeTicketCount
                    ? `${activeTicketCount} seat${activeTicketCount > 1 ? 's' : ''} selected in ${
                        activeSection.shortLabel
                      }`
                    : `Tap any available seat inside ${activeSection.shortLabel} to reserve your choice.`}
                </span>
              </div>
            </div>

            <div className="info-card">
              <div className="panel-head compact">
                <div>
                  <p className="panel-kicker">Seat Prices</p>
                  <h3>Price slabs</h3>
                </div>
                <BadgeIndianRupee size={18} />
              </div>

              <div className="tier-list">
                {priceTiers.map((tier) => {
                  const tierSections = sections.filter((section) => section.price === tier.price);
                  if (!tierSections.length) return null;

                  const isOpen = expandedTier === tier.price;

                  return (
                    <div className="tier-item" key={tier.price}>
                      <button
                        type="button"
                        className="tier-trigger"
                        onClick={() => setExpandedTier(isOpen ? null : tier.price)}
                      >
                        <div className="tier-left">
                          <span
                            className="tier-icon"
                            style={{ '--tier-color': tier.color } as React.CSSProperties}
                          >
                            <Armchair size={15} />
                          </span>
                          <strong>{formatPrice(tier.price)}</strong>
                        </div>
                        <ChevronDown className={`tier-chevron ${isOpen ? 'open' : ''}`} size={18} />
                      </button>

                      {isOpen && (
                        <div className="tier-details">
                          {tierSections.map((section) => {
                            const remaining = allSeats.filter(
                              (seat) => seat.sectionId === section.id && !bookedIds.has(seat.id),
                            ).length;

                            return (
                              <div className="tier-detail-row" key={section.id}>
                                <span>{section.name}</span>
                                <small>{remaining} left</small>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="info-card booking-card">
              <div className="panel-head compact">
                <div>
                  <p className="panel-kicker">Booking Summary</p>
                  <h3>Your seats</h3>
                </div>
                <Ticket size={18} />
              </div>

              {selectedSeats.length ? (
                <div className="selected-list">
                  {selectedSeats.map((seat) => (
                    <button
                      key={seat.id}
                      type="button"
                      className="selected-seat-pill"
                      onClick={() => handleSeatToggle(seat.id)}
                      style={{ '--pill-color': seat.color } as React.CSSProperties}
                    >
                      <span>{seat.id}</span>
                      <small>{formatPrice(seat.price)}</small>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="empty-copy">
                  No seat selected yet. Click directly on the map to choose your exact row and seat.
                </p>
              )}

              <div className="summary-row">
                <span>Tickets</span>
                <strong>{selectedSeats.length}</strong>
              </div>
              <div className="summary-row">
                <span>Total</span>
                <strong>{formatPrice(total)}</strong>
              </div>

              <button type="button" className="book-button" onClick={handleBookNow} disabled={!selectedSeats.length}>
                Book selected seats
              </button>

              {confirmationCode && (
                <div className="confirmation-card">
                  <CheckCircle2 size={18} />
                  <div>
                    <strong>Booking confirmed</strong>
                    <p>Reference {confirmationCode}. Your seats are now locked in successfully.</p>
                  </div>
                </div>
              )}
            </div>
          </motion.aside>
        </section>
      </main>
    </div>
  );
}

export default App;
