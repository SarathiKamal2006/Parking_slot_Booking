import React, { useState, useMemo } from "react";
import { Car, Zap, Accessibility, Gauge, X } from "lucide-react";

// ---- Design tokens (garage / signage theme) ----
const COLORS = {
  asphalt: "#1b1d1f",
  asphalt2: "#242629",
  concrete: "#34373b",
  line: "#4a4e53",
  paint: "#edede6",
  paintDim: "#a7a9ac",
  signal: "#f2c94c",
  free: "#3ddc97",
  occupied: "#e85c4a",
  reserved: "#5b8def",
};

const RATES = { hatch: 30, sedan: 40, suv: 55, bike: 15 };
const SURCHARGE = { hatch: 0, sedan: 5, suv: 15, bike: 0 };
const VEHICLE_LABEL = { hatch: "Hatchback", sedan: "Sedan", suv: "SUV", bike: "Two-wheeler" };

const TYPE_META = {
  regular: { label: "Regular", Icon: Car },
  compact: { label: "Compact", Icon: Gauge },
  ev: { label: "EV Charging", Icon: Zap },
  accessible: { label: "Accessible", Icon: Accessibility },
};

const LEVELS = ["P1", "P2", "P3"];
const TYPE_CYCLE = ["regular", "regular", "compact", "regular", "ev", "regular", "accessible", "regular", "compact", "regular", "regular", "ev"];

function seedStatus(seed) {
  // deterministic pseudo-random so layout doesn't jump on re-render
  const r = (Math.sin(seed * 999) + 1) / 2;
  if (r < 0.45) return "free";
  if (r < 0.8) return "occupied";
  return "reserved";
}

function buildGarage() {
  const garage = {};
  LEVELS.forEach((lvl, li) => {
    garage[lvl] = [];
    for (let i = 1; i <= 18; i++) {
      const seed = li * 100 + i;
      garage[lvl].push({
        id: `${lvl}-${String(i).padStart(2, "0")}`,
        type: TYPE_CYCLE[(i - 1) % TYPE_CYCLE.length],
        status: seedStatus(seed),
      });
    }
  });
  return garage;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function nowStr() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function ParkingBooking() {
  const [garage, setGarage] = useState(buildGarage);
  const [level, setLevel] = useState("P1");
  const [filter, setFilter] = useState("all");
  const [selectedBay, setSelectedBay] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [ticket, setTicket] = useState(null);
  const [toast, setToast] = useState("");

  const [form, setForm] = useState({
    vehicleNo: "",
    vehicleType: "hatch",
    duration: "2",
    entryDate: todayStr(),
    entryTime: nowStr(),
    driverName: "",
    phone: "",
  });
  const [formErr, setFormErr] = useState("");

  const bays = garage[level];
  const visibleBays = useMemo(
    () => bays.filter((b) => filter === "all" || b.type === filter),
    [bays, filter]
  );

  const stats = useMemo(
    () => ({
      free: bays.filter((b) => b.status === "free").length,
      occupied: bays.filter((b) => b.status === "occupied").length,
      reserved: bays.filter((b) => b.status === "reserved").length,
    }),
    [bays]
  );

  const price = useMemo(() => {
    const hrs = parseInt(form.duration, 10);
    const base = RATES[form.vehicleType] * hrs;
    const sur = SURCHARGE[form.vehicleType] * hrs;
    return { base, sur, total: base + sur };
  }, [form.duration, form.vehicleType]);

  function openBooking(bay) {
    setSelectedBay(bay);
    setForm({
      vehicleNo: "",
      vehicleType: "hatch",
      duration: "2",
      entryDate: todayStr(),
      entryTime: nowStr(),
      driverName: "",
      phone: "",
    });
    setFormErr("");
    setShowModal(true);
  }

  function updateForm(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate() {
    if (!form.vehicleNo.trim()) return "Enter vehicle number.";
    if (!form.driverName.trim()) return "Enter driver name.";
    if (!/^\d{10}$/.test(form.phone.trim())) return "Enter a valid 10-digit phone number.";
    if (!form.entryDate || !form.entryTime) return "Set entry date and time.";
    return "";
  }

  function confirmBooking() {
    const err = validate();
    if (err) {
      setFormErr(err);
      return;
    }
    setFormErr("");

    setGarage((g) => {
      const next = { ...g, [level]: g[level].map((b) => (b.id === selectedBay.id ? { ...b, status: "reserved" } : b)) };
      return next;
    });

    const bookingId = level.replace("P", "") + Date.now().toString().slice(-8);
    setTicket({
      bookingId,
      bay: selectedBay,
      level,
      vehicleNo: form.vehicleNo.trim().toUpperCase(),
      vehicleType: VEHICLE_LABEL[form.vehicleType],
      driverName: form.driverName.trim(),
      phone: form.phone.trim(),
      date: form.entryDate,
      time: form.entryTime,
      duration: form.duration === "24" ? "Full day" : `${form.duration} hour${form.duration === "1" ? "" : "s"}`,
      total: price.total,
    });

    setShowModal(false);
    setToast(`Bay ${selectedBay.id} reserved`);
    setTimeout(() => setToast(""), 2400);
  }

  return (
    <div style={{ background: COLORS.asphalt, color: COLORS.paint, minHeight: "100vh", fontFamily: "'IBM Plex Sans', sans-serif" }} className="pb-16">
      <GoogleFontsPreload />

      {/* Header */}
      <header
        style={{ background: COLORS.asphalt2, borderBottom: `4px solid ${COLORS.signal}` }}
        className="flex items-center justify-between flex-wrap gap-4 px-6 py-5 sm:px-10"
      >
        <div className="flex items-center gap-3">
          <div
            style={{ background: COLORS.signal, color: COLORS.asphalt, transform: "skewX(-6deg)" }}
            className="w-11 h-11 rounded-md flex items-center justify-center font-bold text-xl"
          >
            <span style={{ transform: "skewX(6deg)", display: "inline-block", fontFamily: "'Oswald', sans-serif" }}>P</span>
          </div>
          <div>
            <h1 style={{ fontFamily: "'Oswald', sans-serif" }} className="text-2xl font-bold uppercase tracking-wide leading-none m-0">
              ParkBay
            </h1>
            <p style={{ color: COLORS.paintDim }} className="text-xs tracking-widest m-0 mt-1">
              AUTOMATED BAY RESERVATION · GARAGE TERMINAL
            </p>
          </div>
        </div>
        <div className="flex gap-6 font-mono">
          <Stat label="Free" value={stats.free} color={COLORS.free} />
          <Stat label="Occupied" value={stats.occupied} color={COLORS.occupied} />
          <Stat label="Reserved" value={stats.reserved} color={COLORS.reserved} />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 sm:px-10 pt-8">
        {/* Level tabs */}
        <div className="flex gap-2 flex-wrap mb-6">
          {LEVELS.map((lvl) => {
            const active = lvl === level;
            return (
              <button
                key={lvl}
                onClick={() => setLevel(lvl)}
                style={{
                  background: active ? COLORS.signal : COLORS.concrete,
                  color: active ? COLORS.asphalt : COLORS.paintDim,
                  border: `1px solid ${active ? COLORS.signal : COLORS.line}`,
                  fontFamily: "'Oswald', sans-serif",
                }}
                className="px-5 py-2 rounded-lg uppercase text-sm tracking-wide font-semibold transition"
              >
                Level {lvl}
              </button>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div className="flex gap-2 flex-wrap">
            {["all", "regular", "compact", "ev", "accessible"].map((key) => {
              const active = filter === key;
              return (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  style={{
                    background: active ? COLORS.paint : "transparent",
                    color: active ? COLORS.asphalt : COLORS.paintDim,
                    border: `1px solid ${active ? COLORS.paint : COLORS.line}`,
                  }}
                  className="px-3.5 py-1.5 rounded-full text-xs uppercase tracking-wide"
                >
                  {key === "all" ? "All types" : TYPE_META[key].label}
                </button>
              );
            })}
          </div>
          <div style={{ color: COLORS.paintDim }} className="flex gap-4 text-xs">
            <LegendDot color={COLORS.free} label="Free" />
            <LegendDot color={COLORS.occupied} label="Occupied" />
            <LegendDot color={COLORS.reserved} label="Reserved" />
          </div>
        </div>

        {/* Bay grid */}
        <div
          style={{ background: COLORS.concrete }}
          className="rounded-xl p-5 grid gap-0"
        >
          {visibleBays.length === 0 ? (
            <div style={{ color: COLORS.paintDim }} className="text-center py-10 col-span-full">
              No bays of this type on {level}.
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {visibleBays.map((bay) => (
                <Bay key={bay.id} bay={bay} onSelect={() => bay.status === "free" && openBooking(bay)} />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Booking modal */}
      {showModal && selectedBay && (
        <Overlay onClose={() => setShowModal(false)}>
          <div
            style={{ background: COLORS.asphalt2, border: `1px solid ${COLORS.line}` }}
            className="rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-start">
              <h2 style={{ fontFamily: "'Oswald', sans-serif" }} className="text-xl uppercase font-semibold m-0">
                Reserve Bay <span className="font-mono">{selectedBay.id}</span>
              </h2>
              <button onClick={() => setShowModal(false)} style={{ color: COLORS.paintDim }}>
                <X size={20} />
              </button>
            </div>
            <p style={{ color: COLORS.paintDim }} className="text-sm mb-4">
              {TYPE_META[selectedBay.type].label} bay · {level}
            </p>

            <Field label="Vehicle number">
              <TextInput value={form.vehicleNo} onChange={(v) => updateForm("vehicleNo", v)} placeholder="TN 58 AB 1234" />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Vehicle type">
                <Select value={form.vehicleType} onChange={(v) => updateForm("vehicleType", v)}>
                  {Object.entries(VEHICLE_LABEL).map(([k, label]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Duration (hrs)">
                <Select value={form.duration} onChange={(v) => updateForm("duration", v)}>
                  <option value="1">1 hour</option>
                  <option value="2">2 hours</option>
                  <option value="4">4 hours</option>
                  <option value="8">8 hours</option>
                  <option value="24">Full day</option>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Entry date">
                <TextInput type="date" value={form.entryDate} onChange={(v) => updateForm("entryDate", v)} />
              </Field>
              <Field label="Entry time">
                <TextInput type="time" value={form.entryTime} onChange={(v) => updateForm("entryTime", v)} />
              </Field>
            </div>

            <Field label="Driver name">
              <TextInput value={form.driverName} onChange={(v) => updateForm("driverName", v)} placeholder="Full name" />
            </Field>
            <Field label="Phone">
              <TextInput value={form.phone} onChange={(v) => updateForm("phone", v.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit mobile" />
            </Field>

            <div className="font-mono text-sm">
              <PriceLine label="Base rate" value={`₹${price.base}`} />
              <PriceLine label="Vehicle surcharge" value={`₹${price.sur}`} />
              <PriceLine label="Total" value={`₹${price.total}`} total />
            </div>

            {formErr && <p style={{ color: COLORS.occupied }} className="text-xs mt-2 mb-1">{formErr}</p>}

            <button
              onClick={confirmBooking}
              style={{ background: COLORS.signal, color: COLORS.asphalt, fontFamily: "'Oswald', sans-serif" }}
              className="w-full mt-4 py-3 rounded-lg uppercase tracking-wide font-semibold"
            >
              Confirm &amp; Generate Ticket
            </button>
            <button
              onClick={() => setShowModal(false)}
              style={{ color: COLORS.paintDim, border: `1px solid ${COLORS.line}`, fontFamily: "'Oswald', sans-serif" }}
              className="w-full mt-2 py-3 rounded-lg uppercase tracking-wide bg-transparent"
            >
              Cancel
            </button>
          </div>
        </Overlay>
      )}

      {/* Ticket modal */}
      {ticket && (
        <Overlay onClose={() => setTicket(null)}>
          <div className="w-full max-w-sm">
            <TicketStub data={ticket} />
            <button
              onClick={() => setTicket(null)}
              style={{ background: COLORS.signal, color: COLORS.asphalt, fontFamily: "'Oswald', sans-serif" }}
              className="w-full mt-4 py-3 rounded-lg uppercase tracking-wide font-semibold"
            >
              Done
            </button>
          </div>
        </Overlay>
      )}

      {/* Toast */}
      <div
        style={{
          background: COLORS.free,
          color: COLORS.asphalt,
          fontFamily: "'Oswald', sans-serif",
          transform: toast ? "translate(-50%, 0)" : "translate(-50%, 120%)",
        }}
        className="fixed bottom-6 left-1/2 px-6 py-3 rounded-lg uppercase font-semibold text-sm tracking-wide transition-transform duration-300"
      >
        {toast}
      </div>
    </div>
  );
}

// ---------- Small presentational pieces ----------

function Stat({ label, value, color }) {
  return (
    <div className="text-center">
      <div style={{ color }} className="text-xl font-semibold">{value}</div>
      <div style={{ color: COLORS.paintDim }} className="text-[10px] uppercase tracking-widest">{label}</div>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span style={{ background: color }} className="w-2.5 h-2.5 rounded-sm inline-block" />
      {label}
    </span>
  );
}

function Bay({ bay, onSelect }) {
  const meta = TYPE_META[bay.type];
  const Icon = meta.Icon;
  const statusColor =
    bay.status === "free" ? COLORS.free : bay.status === "occupied" ? COLORS.occupied : COLORS.reserved;

  return (
    <div
      onClick={onSelect}
      style={{
        borderTop: "3px dashed rgba(237,237,230,0.35)",
        cursor: bay.status === "free" ? "pointer" : "not-allowed",
        opacity: bay.status === "free" ? 1 : 0.55,
      }}
      className="rounded-md px-2 pt-3 pb-2.5 text-center transition-transform hover:-translate-y-0.5"
    >
      <Icon size={20} style={{ color: statusColor, margin: "0 auto 4px" }} />
      <div style={{ color: statusColor }} className="font-mono font-semibold text-sm">{bay.id}</div>
      <div style={{ color: COLORS.paintDim }} className="text-[10px] uppercase tracking-wide mt-0.5">{meta.label}</div>
    </div>
  );
}

function Overlay({ children, onClose }) {
  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ background: "rgba(10,10,10,0.65)" }}
      className="fixed inset-0 flex items-center justify-center p-5 z-50"
    >
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="mb-3.5">
      <label style={{ color: COLORS.paintDim }} className="block text-[11px] uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = "text" }) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{ background: COLORS.asphalt, border: `1px solid ${COLORS.line}`, color: COLORS.paint }}
      className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
    />
  );
}

function Select({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ background: COLORS.asphalt, border: `1px solid ${COLORS.line}`, color: COLORS.paint }}
      className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
    >
      {children}
    </select>
  );
}

function PriceLine({ label, value, total }) {
  return (
    <div
      style={{ borderTop: `1px ${total ? "solid" : "dashed"} ${COLORS.line}`, color: total ? COLORS.signal : COLORS.paint }}
      className={`flex justify-between py-2 ${total ? "text-lg font-semibold mt-1.5" : "text-sm"}`}
    >
      <span style={{ color: total ? COLORS.signal : COLORS.paintDim }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function TicketStub({ data }) {
  const meta = TYPE_META[data.bay.type];
  return (
    <div style={{ background: COLORS.paint, color: COLORS.asphalt }} className="rounded-xl overflow-hidden font-mono">
      <div className="px-6 pt-5 pb-3.5">
        <div style={{ fontFamily: "'Oswald', sans-serif", opacity: 0.6 }} className="text-xs uppercase tracking-widest">
          ParkBay · Reservation Slip
        </div>
        <h3 style={{ fontFamily: "'Oswald', sans-serif" }} className="text-2xl mt-0.5 mb-3">
          Bay {data.bay.id}
        </h3>
        <TLine k="Booking ID" v={`#${data.bookingId}`} />
        <TLine k="Level" v={data.level} />
        <TLine k="Bay type" v={meta.label} />
        <TLine k="Vehicle no." v={data.vehicleNo} />
        <TLine k="Vehicle type" v={data.vehicleType} />
        <TLine k="Driver" v={data.driverName} />
        <TLine k="Phone" v={data.phone} />
        <TLine k="Entry" v={`${data.date} · ${data.time}`} />
        <TLine k="Duration" v={data.duration} />
        <TLine k="Amount paid" v={`₹${data.total}`} />
      </div>
      <div style={{ borderTop: `2px dashed rgba(27,29,31,0.35)` }} className="mx-6" />
      <div className="px-6 pt-3.5 pb-5 text-center">
        <div
          style={{
            height: 44,
            background:
              "repeating-linear-gradient(90deg, #1b1d1f 0px, #1b1d1f 2px, transparent 2px, transparent 5px, #1b1d1f 5px, #1b1d1f 6px, transparent 6px, transparent 10px)",
          }}
          className="rounded-sm mb-2"
        />
        <div style={{ opacity: 0.7 }} className="text-[11px] tracking-widest">
          {data.bookingId} — KEEP FOR EXIT
        </div>
      </div>
    </div>
  );
}

function TLine({ k, v }) {
  return (
    <div className="flex justify-between text-[12.5px] py-0.5">
      <span>{k}</span>
      <b className="font-semibold">{v}</b>
    </div>
  );
}

function GoogleFontsPreload() {
  return (
    <link
      href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
      rel="stylesheet"
    />
  );
}