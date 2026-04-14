import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  Armchair,
  ArrowLeft,
  ArrowRight,
  BadgeIndianRupee,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Clock3,
  Coffee,
  CreditCard,
  LogOut,
  MapPin,
  Navigation,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Ticket,
  Users,
  UtensilsCrossed,
  Zap,
} from 'lucide-react';
import { AppProvider, useApp, type QueueTime, type Seat, type StadiumEvent } from './store';

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
  labelRadius?: number;
  labelDx?: number;
  labelDy?: number;
  labelSize?: number;
};

type SeatPoint = {
  seat: Seat;
  x: number;
  y: number;
};

type SectionView = SectionMeta & {
  sourceSection: string;
};

type AttendeeView = 'discover' | 'seats' | 'payment' | 'ticket' | 'experience';
type ExperienceTab = 'pass' | 'map' | 'food' | 'status';

type ParsedRoute = {
  bookingId: string | null;
  eventId: string | null;
  tab: ExperienceTab;
  view: AttendeeView;
};

const viewportCenter = 500;

const sectionBlueprint: SectionMeta[] = [
  {
    id: 'BIRLA BLOCK K',
    label: 'Birla Estates Block K',
    shortLabel: 'Block K',
    sponsor: 'Birla Estates',
    color: '#4fb4ff',
    price: 1200,
    angleStart: 120,
    angleEnd: 154,
    ringInner: 296,
    ringOuter: 408,
    labelRadius: 458,
    labelDy: 18,
  },
  {
    id: 'JIO BLOCK L',
    label: 'Jio Block L',
    shortLabel: 'Block L',
    sponsor: 'Jio',
    color: '#8e6dff',
    price: 1500,
    angleStart: 154,
    angleEnd: 206,
    ringInner: 296,
    ringOuter: 408,
    labelRadius: 462,
    labelDx: -10,
    labelDy: 8,
  },
  {
    id: 'ASTRAL BLOCK M',
    label: 'Astral Pipes Block M',
    shortLabel: 'Block M',
    sponsor: 'Astral Pipes',
    color: '#7a43d6',
    price: 2000,
    angleStart: 206,
    angleEnd: 258,
    ringInner: 296,
    ringOuter: 408,
    labelRadius: 462,
    labelDx: -14,
  },
  {
    id: 'TORRENT BLOCK N',
    label: 'Torrent Block N',
    shortLabel: 'Block N',
    sponsor: 'Torrent',
    color: '#eba24e',
    price: 3000,
    angleStart: 258,
    angleEnd: 304,
    ringInner: 286,
    ringOuter: 408,
    labelRadius: 454,
    labelDx: -8,
  },
  {
    id: 'TORRENT BLOCK P',
    label: 'Torrent Block P',
    shortLabel: 'Block P',
    sponsor: 'Torrent',
    color: '#59c1db',
    price: 6000,
    angleStart: 304,
    angleEnd: 346,
    ringInner: 286,
    ringOuter: 408,
    labelRadius: 450,
    labelDy: -6,
  },
  {
    id: 'BKT TYRES BLOCK Q',
    label: 'BKT Tyres Block Q',
    shortLabel: 'Block Q',
    sponsor: 'BKT Tyres',
    color: '#49acd8',
    price: 17000,
    angleStart: 346,
    angleEnd: 406,
    ringInner: 286,
    ringOuter: 408,
    labelRadius: 458,
    labelDx: 12,
  },
  {
    id: 'SOUTH PREMIUM',
    label: 'South Premium',
    shortLabel: 'South Premium',
    sponsor: 'Birla Estates',
    color: '#a6d89f',
    price: 28000,
    angleStart: 100,
    angleEnd: 120,
    ringInner: 266,
    ringOuter: 360,
    labelRadius: 420,
    labelDx: 44,
    labelDy: -6,
    labelSize: 14,
  },
  {
    id: 'PRESIDENTIAL SUITE',
    label: 'Premium Suites',
    shortLabel: 'Suites',
    sponsor: 'Presidential',
    color: '#d7c4c4',
    price: 40000,
    angleStart: 84,
    angleEnd: 100,
    ringInner: 266,
    ringOuter: 360,
    labelRadius: 420,
    labelDx: -36,
    labelDy: -20,
    labelSize: 14,
  },
];

const foodMenu = [
  { id: 'burger', name: 'Classic Burger', price: 280, eta: '10 min' },
  { id: 'wings', name: 'Spicy Wings', price: 340, eta: '12 min' },
  { id: 'cola', name: 'Large Cola', price: 120, eta: '4 min' },
  { id: 'popcorn', name: 'Popcorn XL', price: 180, eta: '6 min' },
];

const parseHashRoute = (): ParsedRoute => {
  const clean = window.location.hash.replace(/^#\/?/, '');
  const parts = clean ? clean.split('/') : [];

  if (!parts.length || parts[0] === 'discover') {
    return { view: 'discover', eventId: null, bookingId: null, tab: 'pass' };
  }

  if (parts[0] === 'seats' && parts[1]) {
    return { view: 'seats', eventId: decodeURIComponent(parts[1]), bookingId: null, tab: 'pass' };
  }

  if (parts[0] === 'payment' && parts[1]) {
    return { view: 'payment', eventId: null, bookingId: decodeURIComponent(parts[1]), tab: 'pass' };
  }

  if (parts[0] === 'ticket' && parts[1]) {
    return { view: 'ticket', eventId: null, bookingId: decodeURIComponent(parts[1]), tab: 'pass' };
  }

  if (parts[0] === 'experience' && parts[1]) {
    const maybeTab = parts[2] as ExperienceTab | undefined;
    return {
      view: 'experience',
      eventId: null,
      bookingId: decodeURIComponent(parts[1]),
      tab: maybeTab && ['pass', 'map', 'food', 'status'].includes(maybeTab) ? maybeTab : 'pass',
    };
  }

  return { view: 'discover', eventId: null, bookingId: null, tab: 'pass' };
};

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

function getQueueAccent(status: QueueTime['status']) {
  if (status === 'CONGESTED') return 'queue-danger';
  if (status === 'BUSY') return 'queue-warn';
  return 'queue-good';
}

function getStatusMessage(waitMinutes: number) {
  if (waitMinutes >= 18) return 'Heavy flow detected';
  if (waitMinutes >= 10) return 'Moderate pressure';
  return 'Flow is smooth';
}

function buildSections(seats: Seat[]): SectionView[] {
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
}

function buildSeatPoints(sections: SectionView[], seats: Seat[]) {
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
      points.push({ seat, x, y });
    });
  });

  return points;
}

function AppHeader({
  onBack,
  subtitle,
  title,
  rightSlot,
}: {
  onBack?: () => void;
  subtitle?: string;
  title: string;
  rightSlot?: React.ReactNode;
}) {
  return (
    <header className="page-header glass-card">
      <div className="page-header-main">
        {onBack ? (
          <button type="button" className="icon-button" onClick={onBack} aria-label="Go back">
            <ArrowLeft size={18} />
          </button>
        ) : null}
        <div className="brand-mark">
          <Zap size={18} />
        </div>
        <div>
          <p className="eyebrow-text">{subtitle ?? 'VenueSync'}</p>
          <h1>{title}</h1>
        </div>
      </div>
      {rightSlot ? <div className="page-header-side">{rightSlot}</div> : null}
    </header>
  );
}

function ToastContainer() {
  const { notifications, clearNotification } = useApp();

  return (
    <div className="toast-stack">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.button
            key={notification.id}
            type="button"
            className={`toast-card ${notification.type}`}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            onClick={() => clearNotification(notification.id)}
          >
            <div>
              <span className="toast-label">{notification.type}</span>
              <strong>{notification.message}</strong>
            </div>
            <AlertTriangle size={14} />
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}

function StadiumHeatmap() {
  const { queueTimes } = useApp();
  const gate2Wait = queueTimes.find((item) => item.area === 'Gate 2 Entrance')?.waitMinutes ?? 0;
  const concourseWait = queueTimes.find((item) => item.area === 'Main Concourse')?.waitMinutes ?? 0;

  return (
    <div className="heatmap-card glass-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow-text">Live Coordination</p>
          <h3>Venue movement map</h3>
        </div>
        <span className="pill neutral">Real-time</span>
      </div>

      <div className="heatmap-stage">
        <svg viewBox="0 0 300 300" className="heatmap-svg" aria-label="crowd density map">
          <rect x="30" y="30" width="240" height="240" rx="60" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          <rect x="70" y="70" width="160" height="160" rx="30" fill="none" stroke="rgba(76, 180, 255, 0.28)" strokeWidth="20" />
          <rect x="110" y="110" width="80" height="80" rx="6" fill="rgba(80, 177, 108, 0.18)" stroke="#59d37f" strokeWidth="1.2" />
          <line x1="110" y1="150" x2="190" y2="150" stroke="#59d37f" strokeWidth="0.7" />
          <circle cx="150" cy="150" r="15" fill="none" stroke="#59d37f" strokeWidth="0.7" />
        </svg>

        <motion.div
          className="heat-blob heat-blob-main"
          animate={{ scale: [1, 1.18, 1], opacity: [0.25, 0.55, 0.25] }}
          transition={{ duration: 3.2, repeat: Infinity }}
          style={{ width: `${70 + concourseWait}px`, height: `${70 + concourseWait}px` }}
        />
        <motion.div
          className="heat-blob heat-blob-gate"
          animate={{ scale: [1, 1.12, 1], opacity: [0.18, 0.44, 0.18] }}
          transition={{ duration: 3.8, repeat: Infinity }}
          style={{ width: `${56 + gate2Wait}px`, height: `${56 + gate2Wait}px` }}
        />

        <svg viewBox="0 0 300 300" className="heatmap-path" aria-hidden="true">
          <motion.path
            d="M 150 42 L 150 96 L 218 148"
            fill="none"
            stroke="#80d7ff"
            strokeWidth="3"
            strokeDasharray="8 8"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
          />
        </svg>

        <div className="gate-chip gate-top">G1</div>
        <div className="gate-chip gate-right">G2</div>
        <div className="gate-chip gate-bottom">G3</div>
        <div className="gate-chip gate-left">G4</div>

        <div className="map-pin you">
          <Smartphone size={10} />
          <span>You</span>
        </div>
        <div className="map-pin seat">
          <MapPin size={10} />
          <span>Seat</span>
        </div>
      </div>

      <div className="heatmap-legend">
        <span><i className="legend-dot good" />Fluid</span>
        <span><i className="legend-dot warn" />Busy</span>
        <span><i className="legend-dot danger" />Heavy</span>
      </div>
    </div>
  );
}

function DiscoveryScreen({ onSelectEvent }: { onSelectEvent: (eventId: string) => void }) {
  const { currentUser, events, logout, queueTimes, safetyLogs } = useApp();
  const liveAlert = queueTimes.reduce((worst, item) => (item.waitMinutes > worst.waitMinutes ? item : worst), queueTimes[0]);

  return (
    <div className="screen-grid">
      <AppHeader
        title={`Welcome, ${currentUser?.name ?? 'Attendee'}`}
        subtitle="Event Discovery"
        rightSlot={
          <button type="button" className="icon-button" onClick={logout} aria-label="Log out">
            <LogOut size={18} />
          </button>
        }
      />

      <section className="hero-banner glass-card">
        <div className="hero-copy">
          <span className="hero-tag">
            <Sparkles size={14} />
            Physical event experience orchestration
          </span>
          <h2>Plan the whole venue journey, not just the ticket.</h2>
          <p>
            Choose your event, lock the exact seat you want, and move through live gate guidance,
            wait-time updates, and in-venue coordination from one connected flow.
          </p>
          <div className="hero-pills">
            <span><Users size={16} /> Crowd flow</span>
            <span><Clock3 size={16} /> Queue tracking</span>
            <span><Navigation size={16} /> Smart routing</span>
          </div>
        </div>

        <div className="hero-alert glass-card">
          <p className="eyebrow-text">Operations Pulse</p>
          <h3>{liveAlert?.area ?? 'Main Concourse'}</h3>
          <strong>{liveAlert?.waitMinutes ?? 0} min</strong>
          <p>{liveAlert ? getStatusMessage(liveAlert.waitMinutes) : 'Flow is smooth'}</p>
          <span className={`pill ${liveAlert ? getQueueAccent(liveAlert.status) : 'queue-good'}`}>
            {liveAlert?.status ?? 'FLUID'}
          </span>
        </div>
      </section>

      <section className="discovery-layout">
        <div className="event-stack">
          <div className="section-heading">
            <div>
              <p className="eyebrow-text">Upcoming Events</p>
              <h3>Choose your sporting venue experience</h3>
            </div>
          </div>

          <div className="event-grid">
            {events.map((event) => (
              <motion.button
                key={event.id}
                type="button"
                className="event-card"
                whileHover={{ y: -4, scale: 1.01 }}
                onClick={() => onSelectEvent(event.id)}
              >
                <img src={event.image} alt={event.title} />
                <div className="event-card-overlay" />
                <div className="event-card-content">
                  <span className="pill neutral">{event.category}</span>
                  <h4>{event.title}</h4>
                  <p>{event.teams[0]} vs {event.teams[1]}</p>
                  <div className="event-meta">
                    <span><CalendarDays size={14} />{event.date}</span>
                    <span><Clock3 size={14} />{event.time}</span>
                  </div>
                  <span className="event-cta">
                    Start seat planning
                    <ArrowRight size={15} />
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        <aside className="insight-stack">
          <div className="glass-card info-panel">
            <div className="section-heading compact">
              <div>
                <p className="eyebrow-text">Live Queue Board</p>
                <h3>Waiting times right now</h3>
              </div>
              <BadgeIndianRupee size={18} />
            </div>
            <div className="queue-list">
              {queueTimes.map((item) => (
                <div key={item.area} className="queue-row">
                  <div>
                    <strong>{item.area}</strong>
                    <span>{getStatusMessage(item.waitMinutes)}</span>
                  </div>
                  <span className={`pill ${getQueueAccent(item.status)}`}>{item.waitMinutes} min</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card info-panel">
            <div className="section-heading compact">
              <div>
                <p className="eyebrow-text">Safety Timeline</p>
                <h3>Facility updates</h3>
              </div>
              <ShieldCheck size={18} />
            </div>
            <div className="timeline">
              {safetyLogs.map((log) => (
                <div key={log.id} className="timeline-item">
                  <span className="timeline-dot" />
                  <div>
                    <strong>{log.message}</strong>
                    <p>{log.time} • {log.officer}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

function SeatMap({
  activeSectionId,
  onSectionChange,
  onToggleSeat,
  sections,
  seatPoints,
  seats,
  selectedSeatIds,
}: {
  activeSectionId: string;
  onSectionChange: (sectionId: string) => void;
  onToggleSeat: (seat: Seat) => void;
  sections: SectionView[];
  seatPoints: SeatPoint[];
  seats: Seat[];
  selectedSeatIds: string[];
}) {
  return (
    <>
      <div className="panel-header-row">
        <div>
          <p className="eyebrow-text">Interactive Seat Bowl</p>
          <h3>Tap the exact seat you want</h3>
        </div>
        <div className="state-legend">
          <span><i className="legend-dot good" />Available</span>
          <span><i className="legend-dot selected" />Selected</span>
          <span><i className="legend-dot booked" />Booked</span>
        </div>
      </div>

      <div className="stadium-canvas-wrap">
        <div className="stadium-shadow" />
        <svg viewBox="-60 -60 1120 1120" className="stadium-canvas" aria-label="interactive seat map">
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
            const arcSpan = Math.abs(section.angleEnd - section.angleStart);
            const labelRadius = section.labelRadius ?? section.ringOuter + (arcSpan < 24 ? 30 : 46);
            const labelDx = section.labelDx ?? 0;
            const labelDy = section.labelDy ?? 0;
            const labelSize = section.labelSize ?? (arcSpan < 24 ? 14 : 22);
            const labelPoint = polarToCartesian(viewportCenter, viewportCenter, labelRadius, midAngle);
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
                  onClick={() => onSectionChange(section.id)}
                />
                <text
                  x={labelPoint.x + labelDx}
                  y={labelPoint.y + labelDy}
                  textAnchor="middle"
                  className={`section-title ${isActive ? 'active' : ''}`}
                  style={{ fontSize: `${labelSize}px` }}
                  onClick={() => onSectionChange(section.id)}
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
                  seat.isBooked && !isSelected ? 'is-booked' : '',
                  isSelected ? 'is-selected' : '',
                  isActive ? 'is-active' : '',
                ].join(' ')}
                style={{ '--seat-color': section?.color ?? seat.color } as React.CSSProperties}
                onClick={() => {
                  if (section) onSectionChange(section.id);
                  onToggleSeat(seat);
                }}
              />
            );
          })}
        </svg>
      </div>

      <div className="chip-row">
        {sections.map((section) => {
          const free = seats.filter((seat) => seat.section === section.sourceSection && !seat.isBooked).length;
          const isActive = section.id === activeSectionId;

          return (
            <button
              key={section.id}
              type="button"
              className={`section-chip ${isActive ? 'active' : ''}`}
              onClick={() => onSectionChange(section.id)}
              style={{ '--chip-color': section.color } as React.CSSProperties}
            >
              <span>{section.shortLabel}</span>
              <small>{free} open</small>
            </button>
          );
        })}
      </div>
    </>
  );
}

function SeatSelectionScreen({
  event,
  onBack,
  onProceed,
}: {
  event: StadiumEvent;
  onBack: () => void;
  onProceed: (bookingId: string) => void;
}) {
  const { bookSeats, lockSeat, queueTimes, seats, unlockSeat } = useApp();
  const sections = useMemo(() => buildSections(seats), [seats]);
  const seatPoints = useMemo(() => buildSeatPoints(sections, seats), [sections, seats]);
  const priceGroups = useMemo(() => {
    return Array.from(new Set(seats.map((seat) => seat.price)))
      .sort((a, b) => a - b)
      .map((price) => ({
        price,
        sections: sections.filter((section) => section.price === price),
      }));
  }, [sections, seats]);

  const [activeSectionId, setActiveSectionId] = useState<string>(sections[0]?.id ?? '');
  const [expandedPrice, setExpandedPrice] = useState<number | null>(3000);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const releaseOnUnmount = useRef(true);

  useEffect(() => {
    if (sections[0] && !sections.some((section) => section.id === activeSectionId)) {
      setActiveSectionId(sections[0].id);
    }
  }, [activeSectionId, sections]);

  useEffect(() => {
    return () => {
      if (releaseOnUnmount.current) {
        selectedSeatIds.forEach((seatId) => unlockSeat(seatId));
      }
    };
  }, [selectedSeatIds, unlockSeat]);

  const activeSection = sections.find((section) => section.id === activeSectionId) ?? sections[0];
  const activeSectionSeats = seats.filter((seat) => seat.section === activeSection?.sourceSection);
  const selectedSeats = seats.filter((seat) => selectedSeatIds.includes(seat.id));
  const selectedTotal = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
  const recommendedQueue = queueTimes.reduce(
    (best, item) => (item.waitMinutes < best.waitMinutes ? item : best),
    queueTimes[0],
  );

  const toggleSeat = (seat: Seat) => {
    setError('');

    if (selectedSeatIds.includes(seat.id)) {
      unlockSeat(seat.id);
      setSelectedSeatIds((current) => current.filter((id) => id !== seat.id));
      return;
    }

    if (seat.isBooked) {
      setError('That seat is no longer available. Please choose another one.');
      return;
    }

    const locked = lockSeat(seat.id);
    if (!locked) {
      setError('That seat could not be locked. Try another seat.');
      return;
    }

    setSelectedSeatIds((current) => [...current, seat.id]);
  };

  const handleProceed = async () => {
    if (!selectedSeatIds.length) {
      setError('Select at least one seat before continuing.');
      return;
    }

    setIsProcessing(true);
    const bookingId = await bookSeats(event.id, selectedSeatIds);
    setIsProcessing(false);

    if (!bookingId) {
      setError('We could not reserve those seats. Please try again.');
      return;
    }

    releaseOnUnmount.current = false;
    onProceed(bookingId);
  };

  return (
    <div className="screen-grid">
      <AppHeader
        title="Seat Planning"
        subtitle={event.title}
        onBack={onBack}
        rightSlot={<span className="pill neutral">{event.teams[0]} vs {event.teams[1]}</span>}
      />

      <section className="journey-banner glass-card">
        <div>
          <p className="eyebrow-text">Step 1 of 4</p>
          <h2>Choose seats and review venue guidance.</h2>
          <p>
            Lock exact seats, compare sections by price, and plan your arrival using live queue
            signals before you pay.
          </p>
        </div>
        <div className="journey-metrics">
          <div>
            <span>Open seats</span>
            <strong>{seats.filter((seat) => !seat.isBooked).length}</strong>
          </div>
          <div>
            <span>Best gate flow</span>
            <strong>{recommendedQueue?.area ?? 'Gate 1'}</strong>
          </div>
          <div>
            <span>Selected total</span>
            <strong>{formatPrice(selectedTotal)}</strong>
          </div>
        </div>
      </section>

      <section className="seat-layout">
        <motion.section
          className="glass-card stadium-panel"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <SeatMap
            activeSectionId={activeSectionId}
            onSectionChange={setActiveSectionId}
            onToggleSeat={toggleSeat}
            sections={sections}
            seatPoints={seatPoints}
            seats={seats}
            selectedSeatIds={selectedSeatIds}
          />
        </motion.section>

        <aside className="sidebar-stack">
          <motion.section className="glass-card info-panel" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
            <div className="section-heading compact">
              <div>
                <p className="eyebrow-text">Active Section</p>
                <h3>{activeSection?.label}</h3>
              </div>
              <span className="pill neutral">{formatPrice(activeSection?.price ?? 0)}</span>
            </div>

            <div className="stats-grid">
              <div>
                <span>Open seats</span>
                <strong>{activeSectionSeats.filter((seat) => !seat.isBooked).length}</strong>
              </div>
              <div>
                <span>Entry gate</span>
                <strong>{activeSectionSeats[0] ? `Gate ${activeSectionSeats[0].gate}` : 'Gate 1'}</strong>
              </div>
              <div>
                <span>Parking</span>
                <strong>{activeSectionSeats[0]?.parking ?? 'Zone P1'}</strong>
              </div>
              <div>
                <span>Selected here</span>
                <strong>{selectedSeats.filter((seat) => seat.section === activeSection?.sourceSection).length}</strong>
              </div>
            </div>
          </motion.section>

          <motion.section className="glass-card info-panel" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
            <div className="section-heading compact">
              <div>
                <p className="eyebrow-text">Price Bands</p>
                <h3>Section pricing</h3>
              </div>
              <BadgeIndianRupee size={18} />
            </div>

            <div className="price-list">
              {priceGroups.map((group) => {
                const isOpen = expandedPrice === group.price;
                const color = group.sections[0]?.color ?? '#7dd3fc';

                return (
                  <div key={group.price} className="price-row">
                    <button type="button" className="price-trigger" onClick={() => setExpandedPrice(isOpen ? null : group.price)}>
                      <div className="price-left">
                        <span className="seat-icon-box" style={{ '--tier-color': color } as React.CSSProperties}>
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

          <motion.section className="glass-card summary-panel" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
            <div className="section-heading compact">
              <div>
                <p className="eyebrow-text">Booking Summary</p>
                <h3>Ready for checkout</h3>
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
                Select seats directly from the stadium map. Your choices stay visible here while
                you compare prices and entry guidance.
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

            {error ? <p className="error-copy">{error}</p> : null}

            <button type="button" className="primary-button" onClick={handleProceed} disabled={!selectedSeats.length || isProcessing}>
              {isProcessing ? 'Reserving seats...' : 'Proceed to checkout'}
              <ArrowRight size={16} />
            </button>
          </motion.section>
        </aside>
      </section>
    </div>
  );
}

function PaymentScreen({
  bookingId,
  onBack,
  onComplete,
}: {
  bookingId: string;
  onBack: () => void;
  onComplete: () => void;
}) {
  const { bookings, confirmBooking, events, seats } = useApp();
  const booking = bookings.find((item) => item.id === bookingId);
  const bookingSeats = seats.filter((seat) => booking?.seatIds.includes(seat.id));
  const event = events.find((item) => item.id === booking?.eventId);
  const total = bookingSeats.reduce((sum, seat) => sum + seat.price, 0);

  if (!booking) {
    return (
      <div className="screen-grid">
        <AppHeader title="Checkout" subtitle="Booking not found" onBack={onBack} />
        <div className="glass-card empty-state">
          <h2>This booking could not be loaded.</h2>
          <p>Return to event discovery and reserve seats again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="screen-grid narrow-screen">
      <AppHeader title="Checkout" subtitle="Step 2 of 4" onBack={onBack} />

      <section className="glass-card payment-shell">
        <div className="payment-intro">
          <div className="payment-icon">
            <CreditCard size={28} />
          </div>
          <div>
            <h2>Secure payment</h2>
            <p>
              Your seats are reserved. Confirm payment to turn this hold into a final digital pass.
            </p>
          </div>
        </div>

        <div className="payment-summary">
          <div>
            <span>Event</span>
            <strong>{event?.title ?? 'Selected event'}</strong>
          </div>
          <div>
            <span>Seats</span>
            <strong>{booking.seatIds.join(', ')}</strong>
          </div>
          <div>
            <span>Gate</span>
            <strong>Gate {booking.gate}</strong>
          </div>
          <div>
            <span>Total</span>
            <strong>{formatPrice(total)}</strong>
          </div>
        </div>

        <div className="payment-methods">
          {['UPI / Google Pay', 'Card / Net Banking', 'Corporate Hospitality Pass'].map((method) => (
            <button
              key={method}
              type="button"
              className="payment-method"
              onClick={() => {
                confirmBooking(bookingId);
                onComplete();
              }}
            >
              <span>{method}</span>
              <ChevronRight size={18} />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function TicketScreen({
  bookingId,
  onBack,
  onEnterVenue,
}: {
  bookingId: string;
  onBack: () => void;
  onEnterVenue: () => void;
}) {
  const { bookings, currentUser, events, queueTimes, seats } = useApp();
  const booking = bookings.find((item) => item.id === bookingId);
  const event = events.find((item) => item.id === booking?.eventId);
  const firstSeat = seats.find((seat) => seat.id === booking?.seatIds[0]);
  const leastBusy = queueTimes.reduce((best, item) => (item.waitMinutes < best.waitMinutes ? item : best), queueTimes[0]);

  if (!booking || !firstSeat) {
    return (
      <div className="screen-grid">
        <AppHeader title="Digital Pass" subtitle="Booking not found" onBack={onBack} />
        <div className="glass-card empty-state">
          <h2>The ticket details are unavailable.</h2>
          <p>Go back and reopen the booking flow.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="screen-grid narrow-screen">
      <AppHeader title="Digital Pass" subtitle="Step 3 of 4" onBack={onBack} />

      <div className="ticket-view">
        <motion.section className="ticket-card glass-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
          <div className="ticket-band">
            <Ticket size={22} />
            <div>
              <strong>{event?.title ?? 'Match Day Admit'}</strong>
              <span>{event ? `${event.teams[0]} vs ${event.teams[1]}` : 'Live sporting event'}</span>
            </div>
          </div>

          <div className="ticket-grid">
            <div>
              <span>Booking ID</span>
              <strong>{booking.id}</strong>
            </div>
            <div>
              <span>Seats</span>
              <strong>{booking.seatIds.join(', ')}</strong>
            </div>
            <div>
              <span>Gate</span>
              <strong>Gate {booking.gate}</strong>
            </div>
            <div>
              <span>Parking</span>
              <strong>{booking.parking}</strong>
            </div>
          </div>

          <div className="ticket-note">
            <Shield size={16} />
            <span>{currentUser?.name ?? 'Attendee'} is registered for venue entry under this pass.</span>
          </div>
        </motion.section>

        <section className="glass-card guidance-card">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow-text">Arrival Guidance</p>
              <h3>Best route right now</h3>
            </div>
            <Navigation size={18} />
          </div>
          <p className="muted-copy">
            {leastBusy?.area ?? 'Gate 1 Entrance'} currently has the lowest pressure. Use that path
            for a smoother arrival before heading to Gate {booking.gate}.
          </p>
          <button type="button" className="primary-button" onClick={onEnterVenue}>
            Start live venue mode
            <ArrowRight size={16} />
          </button>
        </section>
      </div>
    </div>
  );
}

function InVenueExperience({
  activeTab,
  bookingId,
  onBack,
  onTabChange,
}: {
  activeTab: ExperienceTab;
  bookingId: string;
  onBack: () => void;
  onTabChange: (tab: ExperienceTab) => void;
}) {
  const { bookings, currentUser, placeOrder, queueTimes, safetyLogs, seats } = useApp();
  const booking = bookings.find((item) => item.id === bookingId);
  const seat = seats.find((item) => item.id === booking?.seatIds[0]);

  if (!booking || !seat) {
    return (
      <div className="screen-grid">
        <AppHeader title="Venue Live" subtitle="Booking not found" onBack={onBack} />
        <div className="glass-card empty-state">
          <h2>Live venue mode is unavailable.</h2>
          <p>Reopen the ticket flow to continue.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="screen-grid narrow-screen">
      <AppHeader title="Venue Live" subtitle="Step 4 of 4" onBack={onBack} />

      <div className="experience-tabs">
        {[
          { id: 'pass', label: 'My Pass', icon: Ticket },
          { id: 'map', label: 'Navigate', icon: MapPin },
          { id: 'food', label: 'Food', icon: Coffee },
          { id: 'status', label: 'Status', icon: Activity },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={`tab-button ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => onTabChange(item.id as ExperienceTab)}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'pass' ? (
          <motion.div key="pass" className="experience-panel" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="glass-card pass-card">
              <div className="pass-topline">
                <div>
                  <p className="eyebrow-text">Holder</p>
                  <h3>{currentUser?.name ?? 'Guest Attendee'}</h3>
                </div>
                <div className="brand-mark">
                  <Zap size={18} />
                </div>
              </div>
              <div className="pass-qr">QR READY</div>
              <div className="pass-grid">
                <div>
                  <span>Seat</span>
                  <strong>{booking.seatIds.join(', ')}</strong>
                </div>
                <div>
                  <span>Section</span>
                  <strong>{seat.section}</strong>
                </div>
                <div>
                  <span>Gate</span>
                  <strong>Gate {booking.gate}</strong>
                </div>
                <div>
                  <span>Parking</span>
                  <strong>{booking.parking}</strong>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}

        {activeTab === 'map' ? (
          <motion.div key="map" className="experience-panel" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <StadiumHeatmap />
            <div className="two-col-cards">
              <div className="glass-card mini-card">
                <p className="eyebrow-text">Arrival estimate</p>
                <strong>4 min</strong>
                <span>Follow the highlighted gate path to avoid the busiest corridor.</span>
              </div>
              <div className="glass-card mini-card">
                <p className="eyebrow-text">Route tip</p>
                <strong>Use Gate 3 lane</strong>
                <span>Flow is lighter there before you cut across to your assigned section.</span>
              </div>
            </div>
          </motion.div>
        ) : null}

        {activeTab === 'food' ? (
          <motion.div key="food" className="experience-panel" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="glass-card food-shell">
              <div className="section-heading compact">
                <div>
                  <p className="eyebrow-text">In-Seat Delivery</p>
                  <h3>Order from your seat</h3>
                </div>
                <UtensilsCrossed size={18} />
              </div>
              <div className="food-list">
                {foodMenu.map((item) => (
                  <div key={item.id} className="food-row">
                    <div>
                      <strong>{item.name}</strong>
                      <span>ETA {item.eta}</span>
                    </div>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() =>
                        placeOrder(seat.id, [{ itemId: item.id, quantity: 1, name: item.name }])
                      }
                    >
                      {formatPrice(item.price)}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : null}

        {activeTab === 'status' ? (
          <motion.div key="status" className="experience-panel" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="glass-card alert-card">
              <AlertTriangle size={18} />
              <div>
                <strong>Gate 2 is under heavy pressure.</strong>
                <p>Redirecting arrivals through Gate 3 reduces entry time by about 40% right now.</p>
              </div>
            </div>

            <div className="glass-card info-panel">
              <div className="section-heading compact">
                <div>
                  <p className="eyebrow-text">Queue Snapshot</p>
                  <h3>Live wait times</h3>
                </div>
                <Clock3 size={18} />
              </div>
              <div className="queue-list">
                {queueTimes.map((item) => (
                  <div key={item.area} className="queue-row">
                    <div>
                      <strong>{item.area}</strong>
                      <span>{getStatusMessage(item.waitMinutes)}</span>
                    </div>
                    <span className={`pill ${getQueueAccent(item.status)}`}>{item.waitMinutes} min</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card info-panel">
              <div className="section-heading compact">
                <div>
                  <p className="eyebrow-text">Ops Timeline</p>
                  <h3>Recent coordination events</h3>
                </div>
                <Shield size={18} />
              </div>
              <div className="timeline">
                {safetyLogs.map((log) => (
                  <div key={log.id} className="timeline-item">
                    <span className="timeline-dot" />
                    <div>
                      <strong>{log.message}</strong>
                      <p>{log.time} • {log.officer}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function ManagerDashboard() {
  const { currentUser, logout, queueTimes, safetyLogs, updateQueueTime } = useApp();

  return (
    <div className="screen-grid manager-screen">
      <AppHeader
        title="Command Center"
        subtitle={`Operations • ${currentUser?.name ?? 'Manager'}`}
        rightSlot={
          <button type="button" className="icon-button" onClick={logout} aria-label="Log out">
            <LogOut size={18} />
          </button>
        }
      />

      <section className="manager-layout">
        <StadiumHeatmap />

        <div className="glass-card info-panel">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow-text">Gate Control</p>
              <h3>Manual queue tuning</h3>
            </div>
            <Users size={18} />
          </div>
          <div className="control-list">
            {queueTimes.map((item) => (
              <div key={item.area} className="control-row">
                <div>
                  <strong>{item.area}</strong>
                  <span>{item.waitMinutes} minutes</span>
                </div>
                <div className="control-buttons">
                  <button type="button" className="icon-button" onClick={() => updateQueueTime(item.area, Math.max(0, item.waitMinutes - 1))}>-</button>
                  <button type="button" className="icon-button" onClick={() => updateQueueTime(item.area, item.waitMinutes + 1)}>+</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card info-panel">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow-text">Safety Log</p>
              <h3>Incident timeline</h3>
            </div>
            <Shield size={18} />
          </div>
          <div className="timeline">
            {safetyLogs.map((log) => (
              <div key={log.id} className="timeline-item">
                <span className="timeline-dot" />
                <div>
                  <strong>{log.message}</strong>
                  <p>{log.time} • {log.officer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function VendorDashboard() {
  const { currentUser, logout, orders, updateOrderStatus } = useApp();

  return (
    <div className="screen-grid narrow-screen">
      <AppHeader
        title="Vendor Kitchen"
        subtitle={`Orders • ${currentUser?.name ?? 'Vendor'}`}
        rightSlot={
          <button type="button" className="icon-button" onClick={logout} aria-label="Log out">
            <LogOut size={18} />
          </button>
        }
      />

      <section className="vendor-shell">
        {orders.length ? (
          orders.map((order) => (
            <div key={order.id} className="glass-card vendor-order">
              <div className="vendor-head">
                <div>
                  <p className="eyebrow-text">Seat {order.seatId}</p>
                  <h3>{order.id}</h3>
                </div>
                <span className="pill neutral">{order.status}</span>
              </div>
              <div className="vendor-items">
                {order.items.map((item, index) => (
                  <div key={`${order.id}-${index}`} className="vendor-item">
                    <span>{(item as { name?: string; itemId: string }).name ?? item.itemId}</span>
                    <strong>x{item.quantity}</strong>
                  </div>
                ))}
              </div>
              <div className="vendor-actions">
                <button type="button" className="secondary-button" onClick={() => updateOrderStatus(order.id, 'PREPARING')}>
                  Mark preparing
                </button>
                <button type="button" className="primary-button compact" onClick={() => updateOrderStatus(order.id, 'DELIVERED')}>
                  Mark ready
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="glass-card empty-state">
            <Coffee size={26} />
            <h2>No live food orders yet.</h2>
            <p>Orders placed from the venue experience will appear here.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function AttendeeShell() {
  const { bookings, currentUser, events, setCurrentUser } = useApp();
  const [route, setRoute] = useState<ParsedRoute>(() => parseHashRoute());

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
    const onHashChange = () => setRoute(parseHashRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (!window.location.hash) {
      window.location.hash = '/discover';
    }
  }, []);

  const navigate = (next: string) => {
    window.location.hash = next;
  };

  const selectedEvent = events.find((event) => event.id === route.eventId) ?? events[0];
  const activeBooking = route.bookingId ? bookings.find((item) => item.id === route.bookingId) : null;

  if (currentUser?.role === 'manager') {
    return <ManagerDashboard />;
  }

  if (currentUser?.role === 'vendor') {
    return <VendorDashboard />;
  }

  return (
    <div className="site-shell">
      <div className="backdrop-glow backdrop-glow-left" />
      <div className="backdrop-glow backdrop-glow-right" />
      <main className={`site-frame ${route.view === 'discover' ? '' : 'narrow'}`}>
        <ToastContainer />
        <AnimatePresence mode="wait">
          {route.view === 'discover' ? (
            <motion.div key="discover" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -18 }}>
              <DiscoveryScreen onSelectEvent={(eventId) => navigate(`/seats/${encodeURIComponent(eventId)}`)} />
            </motion.div>
          ) : null}

          {route.view === 'seats' && selectedEvent ? (
            <motion.div key={`seats-${selectedEvent.id}`} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}>
              <SeatSelectionScreen
                event={selectedEvent}
                onBack={() => navigate('/discover')}
                onProceed={(bookingId) => navigate(`/payment/${encodeURIComponent(bookingId)}`)}
              />
            </motion.div>
          ) : null}

          {route.view === 'payment' && activeBooking ? (
            <motion.div key={`payment-${activeBooking.id}`} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}>
              <PaymentScreen
                bookingId={activeBooking.id}
                onBack={() => navigate(`/seats/${encodeURIComponent(activeBooking.eventId)}`)}
                onComplete={() => navigate(`/ticket/${encodeURIComponent(activeBooking.id)}`)}
              />
            </motion.div>
          ) : null}

          {route.view === 'ticket' && activeBooking ? (
            <motion.div key={`ticket-${activeBooking.id}`} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}>
              <TicketScreen
                bookingId={activeBooking.id}
                onBack={() => navigate(`/payment/${encodeURIComponent(activeBooking.id)}`)}
                onEnterVenue={() => navigate(`/experience/${encodeURIComponent(activeBooking.id)}/pass`)}
              />
            </motion.div>
          ) : null}

          {route.view === 'experience' && activeBooking ? (
            <motion.div key={`experience-${activeBooking.id}-${route.tab}`} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}>
              <InVenueExperience
                activeTab={route.tab}
                bookingId={activeBooking.id}
                onBack={() => navigate(`/ticket/${encodeURIComponent(activeBooking.id)}`)}
                onTabChange={(tab) => navigate(`/experience/${encodeURIComponent(activeBooking.id)}/${tab}`)}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AttendeeShell />
    </AppProvider>
  );
}

export default App;
