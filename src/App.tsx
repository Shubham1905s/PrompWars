import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Armchair,
  ArrowRight,
  BadgeIndianRupee,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  MapPin,
  ParkingCircle,
  ShieldCheck,
  Sparkles,
  Ticket,
  Trophy,
  Users,
} from 'lucide-react';
import { AppProvider, useApp, type Seat, type StadiumEvent } from './store';

type SectionMeta = {
  id: string;
  label: string;
  shortLabel: string;
  sponsor: string;
  color: string;
  price: number;
  angleStart: number;
  angleEnd: number;
  ringInner: number;
  ringOuter: number;
};

type SeatPoint = {
  seat: Seat;
  x: number;
  y: number;
  row: number;
};

const sectionBlueprint: SectionMeta[] = [
  {
    id: 'BLOCK K',
    label: 'Birla Estates Block K',
    shortLabel: 'Block K',
    sponsor: 'Birla Estates',
    color: '#4fb4ff',
    price: 1200,
    angleStart: -198,
    angleEnd: -154,
    ringInner: 292,
    ringOuter: 418,
  },
  {
    id: 'BLOCK L',
    label: 'Jio Block L',
    shortLabel: 'Block L',
    sponsor: 'Jio',
    color: '#8e6dff',
    price: 1500,
    angleStart: -154,
    angleEnd: -114,
    ringInner: 300,
    ringOuter: 418,
  },
  {
    id: 'BLOCK M',
    label: 'Astral Pipes Block M',
    shortLabel: 'Block M',
    sponsor: 'Astral Pipes',
    color: '#7a43d6',
    price: 2000,
    angleStart: -114,
    angleEnd: -70,
    ringInner: 304,
    ringOuter: 418,
  },
  {
    id: 'BLOCK N',
    label: 'Torrent Block N',
    shortLabel: 'Block N',
    sponsor: 'Torrent',
    color: '#eba24e',
    price: 3000,
    angleStart: -70,
    angleEnd: -22,
    ringInner: 286,
    ringOuter: 418,
  },
  {
    id: 'BLOCK P',
    label: 'Torrent Block P',
    shortLabel: 'Block P',
    sponsor: 'Torrent',
    color: '#59c1db',
    price: 6000,
    angleStart: -22,
    angleEnd: 28,
    ringInner: 286,
    ringOuter: 418,
  },
  {
    id: 'BLOCK Q',
    label: 'BKT Tyres Block Q',
    shortLabel: 'Block Q',
    sponsor: 'BKT Tyres',
    color: '#49acd8',
    price: 17000,
    angleStart: 28,
    angleEnd: 82,
    ringInner: 294,
    ringOuter: 418,
  },
  {
    id: 'BLOCK R',
    label: 'Equitas Bank Block R',
    shortLabel: 'Block R',
    sponsor: 'Equitas Bank',
    color: '#a06dff',
    price: 22000,
    angleStart: 82,
    angleEnd: 132,
    ringInner: 300,
    ringOuter: 418,
  },
  {
    id: 'BLOCK J',
    label: 'Crew Solar Block J',
    shortLabel: 'Block J',
    sponsor: 'Crew Solar',
    color: '#c2b9ff',
    price: 28000,
    angleStart: 132,
    angleEnd: 172,
    ringInner: 304,
    ringOuter: 418,
  },
  {
    id: 'PREMIUM',
    label: 'South Premium',
    shortLabel: 'South Premium',
    sponsor: 'Birla Estates',
    color: '#a6d89f',
    price: 30000,
    angleStart: 172,
    angleEnd: 204,
    ringInner: 266,
    ringOuter: 360,
  },
  {
    id: 'SUITE',
    label: 'Premium Suites',
    shortLabel: 'Suites',
    sponsor: 'Presidential',
    color: '#d7c4c4',
    price: 40000,
    angleStart: 204,
    angleEnd: 228,
    ringInner: 266,
    ringOuter: 360,
  },
];

const viewportCenter = 500;

const formatPrice = (value: number) => `₹${value.toLocaleString('en-IN')}`;

function polarToCartesian(cx: number, cy: number, radius: number, angle: number) {
  const radians = (angle - 90) * (Math.PI / 180);
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

function createArcPath(section: SectionMeta) {
  const outerStart = polarToCartesian(viewportCenter, viewportCenter, section.ringOuter, section.angleEnd);
  const outerEnd = polarToCartesian(viewportCenter, viewportCenter, section.ringOuter, section.angleStart);
  const innerStart = polarToCartesian(viewportCenter, viewportCenter, section.ringInner, section.angleStart);
  const innerEnd = polarToCartesian(viewportCenter, viewportCenter, section.ringInner, section.angleEnd);
  const largeArc = Math.abs(section.angleEnd - section.angleStart) > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${section.ringOuter} ${section.ringOuter} 0 ${largeArc} 0 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${section.ringInner} ${section.ringInner} 0 ${largeArc} 1 ${innerEnd.x} ${innerEnd.y}`,
    'Z',
  ].join(' ');
}

function AppContent() {
  const { currentUser, setCurrentUser, events, seats, bookings, lockSeat, unlockSeat, bookSeats, confirmBooking } =
    useApp();

  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string>('BLOCK N');
  const [expandedPrice, setExpandedPrice] = useState<number | null>(3000);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [isBooking, setIsBooking] = useState(false);
  const [confirmedBookingId, setConfirmedBookingId] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState('');

  useEffect(() => {
    if (!currentUser) {
      setCurrentUser({
        id: 'demo-attendee',
        name: 'Guest Viewer',
        email: 'guest@promptwars.local',
        role: 'attendee',
      });
    }
  }, [currentUser, setCurrentUser]);

  useEffect(() => {
    if (!activeEventId && events[0]) {
      setActiveEventId(events[0].id);
    }
  }, [activeEventId, events]);

  const activeEvent = events.find((event) => event.id === activeEventId) ?? events[0];

  const sections = useMemo(() => {
    const uniqueSections = Array.from(new Set(seats.map((seat) => seat.section)));
    return uniqueSections
      .map((sectionName, index) => {
        const matched = sectionBlueprint.find((item) => sectionName.includes(item.id));
        const sampleSeat = seats.find((seat) => seat.section === sectionName);
        return {
          ...(matched ?? {
            id: sectionName,
            label: sectionName,
            shortLabel: sectionName.replace(/^[A-Z]+\s+/i, ''),
            sponsor: sectionName.split(' ')[0],
            color: sampleSeat?.color ?? '#7dd3fc',
            price: sampleSeat?.price ?? 1200,
            angleStart: -190 + index * 40,
            angleEnd: -152 + index * 40,
            ringInner: 294,
            ringOuter: 416,
          }),
          sourceSection: sectionName,
        };
      })
      .sort((a, b) => a.angleStart - b.angleStart);
  }, [seats]);

  useEffect(() => {
    if (sections[0] && !sections.some((section) => section.id === activeSectionId)) {
      setActiveSectionId(sections[0].id);
    }
  }, [activeSectionId, sections]);

  const sectionById = useMemo(
    () => new Map(sections.map((section) => [section.id, section])),
    [sections],
  );

  const seatPoints = useMemo(() => {
    const points: SeatPoint[] = [];

    sections.forEach((section) => {
      const sectionSeats = seats.filter((seat) => seat.section === section.sourceSection);
      const rows = Math.min(4, Math.max(2, Math.ceil(sectionSeats.length / 12)));
      const seatsPerRow = Math.ceil(sectionSeats.length / rows);
      const ringDepth = section.ringOuter - section.ringInner - 24;

      sectionSeats.forEach((seat, index) => {
        const row = Math.floor(index / seatsPerRow);
        const column = index % seatsPerRow;
        const radius = section.ringInner + 14 + row * (ringDepth / Math.max(rows - 1, 1));
        const angleSpan = section.angleEnd - section.angleStart;
        const angle = section.angleStart + angleSpan * ((column + 0.5) / seatsPerRow);
        const { x, y } = polarToCartesian(viewportCenter, viewportCenter, radius, angle);
        points.push({ seat, x, y, row });
      });
    });

    return points;
  }, [sections, seats]);

  const activeSection = sections.find((section) => section.id === activeSectionId) ?? sections[0];
  const activeSectionSeats = seats.filter((seat) => seat.section === activeSection?.sourceSection);
  const activeSectionSelected = selectedSeatIds.filter((id) =>
    activeSectionSeats.some((seat) => seat.id === id),
  ).length;
  const activeSectionOpen = activeSectionSeats.filter((seat) => !seat.isBooked).length;
  const activeSectionBooked = activeSectionSeats.length - activeSectionOpen;

  const selectedSeats = seats.filter((seat) => selectedSeatIds.includes(seat.id));
  const selectedTotal = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
  const latestBooking = bookings.find((booking) => booking.id === confirmedBookingId) ?? null;
  const bookedTicketSeats = latestBooking
    ? seats.filter((seat) => latestBooking.seatIds.includes(seat.id))
    : [];

  const priceGroups = useMemo(() => {
    return Array.from(new Set(seats.map((seat) => seat.price)))
      .sort((a, b) => a - b)
      .map((price) => ({
        price,
        sections: sections.filter((section) => section.price === price),
      }));
  }, [sections, seats]);

  const toggleSeat = (seat: Seat) => {
    setBookingError('');
    setConfirmedBookingId(null);

    if (selectedSeatIds.includes(seat.id)) {
      unlockSeat(seat.id);
      setSelectedSeatIds((current) => current.filter((id) => id !== seat.id));
      return;
    }

    const locked = lockSeat(seat.id);
    if (!locked) {
      setBookingError('That seat is no longer available. Please choose another one.');
      return;
    }

    setSelectedSeatIds((current) => [...current, seat.id]);
  };

  const handleBookSeats = async () => {
    if (!activeEvent || !selectedSeatIds.length) {
      setBookingError('Pick an event and at least one seat before booking.');
      return;
    }

    setIsBooking(true);
    setBookingError('');

    const bookingId = await bookSeats(activeEvent.id, selectedSeatIds);

    if (!bookingId) {
      setBookingError('Booking could not be completed. Please try again.');
      setIsBooking(false);
      return;
    }

    confirmBooking(bookingId);
    setConfirmedBookingId(bookingId);
    setSelectedSeatIds([]);
    setIsBooking(false);
  };

  return (
    <div className="site-shell">
      <div className="backdrop-glow backdrop-glow-left" />
      <div className="backdrop-glow backdrop-glow-right" />

      <main className="site-frame">
        <section className="hero-card">
          <div className="hero-copy">
            <span className="eyebrow">
              <Sparkles size={14} />
              Fully connected booking website
            </span>
            <h1>Book your exact stadium seat through one clean working flow.</h1>
            <p>
              Event selection, section pricing, live seat picking, booking summary and ticket
              confirmation now sit in one connected experience instead of scattered screens.
            </p>

            <div className="hero-highlights">
              <span>
                <ShieldCheck size={16} />
                Live seat state
              </span>
              <span>
                <Armchair size={16} />
                Exact seat choice
              </span>
              <span>
                <Ticket size={16} />
                Instant ticket details
              </span>
            </div>
          </div>

          <div className="hero-match-card">
            <div className="match-topline">
              <span>Match day booking</span>
              <span className="live-indicator">Open now</span>
            </div>

            {activeEvent ? (
              <>
                <h2>{activeEvent.title}</h2>
                <p>
                  {activeEvent.teams[0]} vs {activeEvent.teams[1]}
                </p>
                <div className="match-meta-grid">
                  <div>
                    <CalendarDays size={15} />
                    <span>{activeEvent.date}</span>
                  </div>
                  <div>
                    <Clock3 size={15} />
                    <span>{activeEvent.time}</span>
                  </div>
                  <div>
                    <MapPin size={15} />
                    <span>Global Champions Stadium</span>
                  </div>
                  <div>
                    <Users size={15} />
                    <span>{seats.filter((seat) => !seat.isBooked).length} seats open</span>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </section>

        <section className="event-strip">
          {events.map((event) => {
            const isActive = event.id === activeEvent?.id;
            return (
              <button
                key={event.id}
                type="button"
                className={`event-card ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setActiveEventId(event.id);
                  setConfirmedBookingId(null);
                }}
              >
                <img src={event.image} alt={event.title} />
                <div className="event-overlay" />
                <div className="event-content">
                  <span className="event-badge">{event.category}</span>
                  <h3>{event.title}</h3>
                  <p>
                    {event.teams[0]} vs {event.teams[1]}
                  </p>
                </div>
              </button>
            );
          })}
        </section>

        <section className="main-layout">
          <motion.section
            className="panel stadium-panel"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <div className="panel-header">
              <div>
                <p className="panel-label">Interactive Stadium</p>
                <h3>Choose section and tap the exact seat</h3>
              </div>
              <div className="state-legend">
                <span>
                  <i className="legend-dot available" />
                  Available
                </span>
                <span>
                  <i className="legend-dot selected" />
                  Selected
                </span>
                <span>
                  <i className="legend-dot booked" />
                  Booked
                </span>
              </div>
            </div>

            <div className="stadium-canvas-wrap">
              <div className="stadium-shadow" />
              <svg viewBox="0 0 1000 1000" className="stadium-canvas" aria-label="interactive seat map">
                <defs>
                  <radialGradient id="groundGlow" cx="50%" cy="50%" r="65%">
                    <stop offset="0%" stopColor="#4ca967" />
                    <stop offset="100%" stopColor="#23492c" />
                  </radialGradient>
                </defs>

                <ellipse cx="500" cy="528" rx="336" ry="270" fill="rgba(7, 12, 22, 0.96)" />
                <ellipse cx="500" cy="528" rx="296" ry="236" fill="url(#groundGlow)" />
                <rect x="478" y="424" width="44" height="206" rx="6" fill="#f7f4ee" opacity="0.95" />

                {sections.map((section) => {
                  const midAngle = (section.angleStart + section.angleEnd) / 2;
                  const labelPoint = polarToCartesian(
                    viewportCenter,
                    viewportCenter,
                    section.ringOuter + 62,
                    midAngle,
                  );
                  const isActive = section.id === activeSectionId;

                  return (
                    <g key={section.id}>
                      <path
                        d={createArcPath(section)}
                        fill={section.color}
                        opacity={isActive ? 0.96 : 0.8}
                        stroke={isActive ? '#ffffff' : 'rgba(255,255,255,0.14)'}
                        strokeWidth={isActive ? 4 : 2}
                        className="section-arc"
                        onClick={() => setActiveSectionId(section.id)}
                      />
                      <text
                        x={labelPoint.x}
                        y={labelPoint.y}
                        textAnchor="middle"
                        className={`section-title ${isActive ? 'active' : ''}`}
                        onClick={() => setActiveSectionId(section.id)}
                      >
                        {section.shortLabel}
                      </text>
                    </g>
                  );
                })}

                {seatPoints.map(({ seat, x, y }) => {
                  const section = sections.find((item) => item.sourceSection === seat.section);
                  const isSelected = selectedSeatIds.includes(seat.id);
                  const isActive = section?.id === activeSectionId;

                  return (
                    <circle
                      key={seat.id}
                      cx={x}
                      cy={y}
                      r={isSelected ? 9 : 7}
                      className={[
                        'seat-point',
                        seat.isBooked ? 'is-booked' : '',
                        isSelected ? 'is-selected' : '',
                        isActive ? 'is-active' : '',
                      ].join(' ')}
                      style={{ '--seat-color': section?.color ?? seat.color } as React.CSSProperties}
                      onClick={() => {
                        if (section) setActiveSectionId(section.id);
                        if (!seat.isBooked) toggleSeat(seat);
                      }}
                    />
                  );
                })}
              </svg>
            </div>

            <div className="chip-row">
              {sections.map((section) => {
                const free = seats.filter(
                  (seat) => seat.section === section.sourceSection && !seat.isBooked,
                ).length;
                const isActive = section.id === activeSectionId;

                return (
                  <button
                    key={section.id}
                    type="button"
                    className={`section-chip ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveSectionId(section.id)}
                    style={{ '--chip-color': section.color } as React.CSSProperties}
                  >
                    <span>{section.shortLabel}</span>
                    <small>{free} left</small>
                  </button>
                );
              })}
            </div>
          </motion.section>

          <aside className="sidebar">
            <motion.section
              className="panel"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.05 }}
            >
              <div className="panel-header compact">
                <div>
                  <p className="panel-label">Selected Stand</p>
                  <h3>{activeSection?.label}</h3>
                </div>
                <span className="price-chip">{formatPrice(activeSection?.price ?? 0)}</span>
              </div>

              <div className="stats-grid">
                <div>
                  <span>Open seats</span>
                  <strong>{activeSectionOpen}</strong>
                </div>
                <div>
                  <span>Booked</span>
                  <strong>{activeSectionBooked}</strong>
                </div>
                <div>
                  <span>Entry gate</span>
                  <strong>
                    {activeSectionSeats[0] ? `Gate ${activeSectionSeats[0].gate}` : 'Gate 1'}
                  </strong>
                </div>
                <div>
                  <span>Selected here</span>
                  <strong>{activeSectionSelected}</strong>
                </div>
              </div>
            </motion.section>

            <motion.section
              className="panel"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.08 }}
            >
              <div className="panel-header compact">
                <div>
                  <p className="panel-label">Seat Pricing</p>
                  <h3>Price list</h3>
                </div>
                <BadgeIndianRupee size={18} />
              </div>

              <div className="price-list">
                {priceGroups.map((group) => {
                  const isOpen = expandedPrice === group.price;
                  const color = group.sections[0]?.color ?? '#7dd3fc';

                  return (
                    <div key={group.price} className="price-row">
                      <button
                        type="button"
                        className="price-trigger"
                        onClick={() => setExpandedPrice(isOpen ? null : group.price)}
                      >
                        <div className="price-left">
                          <span
                            className="seat-icon-box"
                            style={{ '--tier-color': color } as React.CSSProperties}
                          >
                            <Armchair size={15} />
                          </span>
                          <strong>{formatPrice(group.price)}</strong>
                        </div>
                        <ChevronDown className={`price-arrow ${isOpen ? 'open' : ''}`} size={18} />
                      </button>

                      {isOpen ? (
                        <div className="price-dropdown">
                          {group.sections.map((section) => {
                            const remaining = seats.filter(
                              (seat) => seat.section === section.sourceSection && !seat.isBooked,
                            ).length;

                            return (
                              <button
                                key={section.id}
                                type="button"
                                className="price-stand"
                                onClick={() => setActiveSectionId(section.id)}
                              >
                                <span>{section.label}</span>
                                <small>{remaining} available</small>
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </motion.section>

            <motion.section
              className="panel summary-panel"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.12 }}
            >
              <div className="panel-header compact">
                <div>
                  <p className="panel-label">Booking Summary</p>
                  <h3>Review and confirm</h3>
                </div>
                <Ticket size={18} />
              </div>

              {selectedSeats.length ? (
                <div className="selected-seat-list">
                  {selectedSeats.map((seat) => {
                    const section = sections.find((item) => item.sourceSection === seat.section);
                    return (
                      <button
                        key={seat.id}
                        type="button"
                        className="selected-seat-card"
                        onClick={() => toggleSeat(seat)}
                        style={{ '--seat-accent': section?.color ?? seat.color } as React.CSSProperties}
                      >
                        <strong>{seat.id}</strong>
                        <span>{seat.section}</span>
                        <small>{formatPrice(seat.price)}</small>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="muted-copy">
                  Choose any seat from the map to build your booking. Selected seats appear here
                  instantly.
                </p>
              )}

              <div className="summary-line">
                <span>Tickets</span>
                <strong>{selectedSeats.length}</strong>
              </div>
              <div className="summary-line">
                <span>Total amount</span>
                <strong>{formatPrice(selectedTotal)}</strong>
              </div>

              {bookingError ? <p className="error-copy">{bookingError}</p> : null}

              <button type="button" className="primary-button" disabled={!selectedSeats.length || isBooking} onClick={handleBookSeats}>
                {isBooking ? 'Booking seats...' : 'Confirm booking'}
                <ArrowRight size={16} />
              </button>
            </motion.section>
          </aside>
        </section>

        <section className="bottom-layout">
          <motion.section
            className="panel ticket-panel"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.15 }}
          >
            <div className="panel-header compact">
              <div>
                <p className="panel-label">Digital Ticket</p>
                <h3>{latestBooking ? 'Booking confirmed' : 'Your ticket will appear here'}</h3>
              </div>
              <CheckCircle2 size={18} />
            </div>

            {latestBooking && activeEvent ? (
              <div className="ticket-card">
                <div className="ticket-band">
                  <Trophy size={20} />
                  <div>
                    <strong>{activeEvent.title}</strong>
                    <span>
                      {activeEvent.teams[0]} vs {activeEvent.teams[1]}
                    </span>
                  </div>
                </div>

                <div className="ticket-grid">
                  <div>
                    <span>Booking ID</span>
                    <strong>{latestBooking.id}</strong>
                  </div>
                  <div>
                    <span>Seats</span>
                    <strong>{latestBooking.seatIds.join(', ')}</strong>
                  </div>
                  <div>
                    <span>Gate</span>
                    <strong>{latestBooking.gate}</strong>
                  </div>
                  <div>
                    <span>Parking</span>
                    <strong>{latestBooking.parking}</strong>
                  </div>
                </div>

                <div className="ticket-note">
                  <ParkingCircle size={16} />
                  <span>
                    Parking and gate are assigned from your chosen stand. Keep this ticket ready at
                    entry.
                  </span>
                </div>

                <div className="ticket-seat-tags">
                  {bookedTicketSeats.map((seat) => (
                    <span key={seat.id}>{seat.id}</span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="muted-copy">
                Once you confirm the booking, the final ticket details and assigned gate will show
                here.
              </p>
            )}
          </motion.section>

          <motion.section
            className="panel info-tiles"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.18 }}
          >
            <div className="info-tile">
              <h4>Connected flow</h4>
              <p>Event cards, map, pricing, booking and ticket confirmation all update in one place.</p>
            </div>
            <div className="info-tile">
              <h4>Real seat booking</h4>
              <p>Seats use your existing store actions, so selected seats lock and confirmed seats stay booked.</p>
            </div>
            <div className="info-tile">
              <h4>Cleaner structure</h4>
              <p>The site now behaves like a real front page for attendees instead of multiple disconnected demos.</p>
            </div>
          </motion.section>
        </section>
      </main>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
