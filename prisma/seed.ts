/**
 * BPM Platform — Comprehensive Database Seed Script
 * Seeds: 3 users, utility tariffs, system thresholds, 30-day telemetry, maintenance tickets
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Helpers ────────────────────────────────────────────────────────────────

function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

function rand(min: number, max: number, decimals = 2): number {
  const val = Math.random() * (max - min) + min;
  return parseFloat(val.toFixed(decimals));
}

/** Solar generation follows a sinusoidal curve (peak at noon) */
function solarKw(hour: number): number {
  if (hour < 6 || hour > 20) return 0;
  const angle = ((hour - 6) / 14) * Math.PI;
  const base = Math.sin(angle) * 85; // Peak 85 kW
  const noise = rand(-5, 5);
  return clamp(base + noise, 0, 90);
}

/** Bioenergy provides a steady baseload with slight variation */
function bioenergyKw(hour: number): number {
  const base = 45; // 45 kW baseload
  const nightBoost = hour >= 20 || hour < 6 ? 10 : 0; // Ramp up at night
  return clamp(base + nightBoost + rand(-3, 3), 35, 60);
}

/** Load varies by time of day — morning ramp, afternoon peak, evening drop */
function loadKw(hour: number): number {
  let base: number;
  if (hour >= 0 && hour < 6) base = 40;
  else if (hour >= 6 && hour < 9) base = 60 + (hour - 6) * 8;
  else if (hour >= 9 && hour < 17) base = 85 + Math.sin(((hour - 9) / 8) * Math.PI) * 20;
  else if (hour >= 17 && hour < 21) base = 95;
  else base = 55 - (hour - 21) * 5;
  return clamp(base + rand(-8, 8), 30, 120);
}

function generateDegradedSoh(dayIndex: number): number {
  // Starts at 97%, degrades ~0.01% per day over 30 days
  return clamp(97 - dayIndex * 0.01 + rand(-0.05, 0.05), 94, 97.5);
}

// ─── Main Seed ───────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Starting BPM Platform database seed...\n');

  // ── 1. Clear existing data (order matters for FK constraints) ──────────────
  await prisma.auditLog.deleteMany();
  await prisma.maintenanceTicket.deleteMany();
  await prisma.telemetryRecord.deleteMany();
  await prisma.systemThreshold.deleteMany();
  await prisma.utilityTariff.deleteMany();
  await prisma.user.deleteMany();
  console.log('✓ Cleared existing data');

  // ── 2. Users ──────────────────────────────────────────────────────────────
  const SALT_ROUNDS = 10;
  const adminHash = await bcrypt.hash('Admin@BPM2024', SALT_ROUNDS);
  const operatorHash = await bcrypt.hash('Operator@BPM2024', SALT_ROUNDS);
  const userHash = await bcrypt.hash('User@BPM2024', SALT_ROUNDS);

  const adminUser = await prisma.user.create({
    data: {
      name: 'Alex Reinholt',
      email: 'admin@bpmplatform.io',
      passwordHash: adminHash,
      role: 'ADMIN',
    },
  });

  const operatorUser = await prisma.user.create({
    data: {
      name: 'Maria Fontaine',
      email: 'operator@bpmplatform.io',
      passwordHash: operatorHash,
      role: 'OPERATOR',
    },
  });

  const generalUser = await prisma.user.create({
    data: {
      name: 'James Whitfield',
      email: 'user@bpmplatform.io',
      passwordHash: userHash,
      role: 'GENERAL_USER',
    },
  });

  console.log('✓ Created 3 users (admin / operator / general_user)');
  console.log('  Admin:    admin@bpmplatform.io    / Admin@BPM2024');
  console.log('  Operator: operator@bpmplatform.io / Operator@BPM2024');
  console.log('  User:     user@bpmplatform.io     / User@BPM2024');

  // ── 3. Utility Tariffs ────────────────────────────────────────────────────
  await prisma.utilityTariff.createMany({
    data: [
      {
        name: 'Peak Commercial Rate',
        peakRate: 0.28,
        offPeakRate: 0.11,
        shoulderRate: 0.18,
        demandChargeKw: 14.50,
        effectiveFrom: new Date('2024-01-01'),
      },
      {
        name: 'Off-Peak Overnight Rate',
        peakRate: 0.24,
        offPeakRate: 0.09,
        shoulderRate: 0.15,
        demandChargeKw: 12.00,
        effectiveFrom: new Date('2024-07-01'),
      },
      {
        name: 'Summer Demand Rate',
        peakRate: 0.34,
        offPeakRate: 0.13,
        shoulderRate: 0.22,
        demandChargeKw: 18.75,
        effectiveFrom: new Date('2025-06-01'),
      },
    ],
  });
  console.log('✓ Created 3 utility tariff records');

  // ── 4. System Thresholds ─────────────────────────────────────────────────
  await prisma.systemThreshold.createMany({
    data: [
      { parameterName: 'solarKw',              warningMin: null, warningMax: 88,   criticalMin: null, criticalMax: 95,   unit: 'kW',  description: 'Solar array output' },
      { parameterName: 'bioenergyKw',           warningMin: 30,   warningMax: 58,   criticalMin: 20,   criticalMax: 65,   unit: 'kW',  description: 'Bioenergy generator output' },
      { parameterName: 'loadKw',                warningMin: null, warningMax: 110,  criticalMin: null, criticalMax: 125,  unit: 'kW',  description: 'Total facility load' },
      { parameterName: 'batterySoc',            warningMin: 20,   warningMax: null, criticalMin: 10,   criticalMax: null, unit: '%',   description: 'Battery state of charge' },
      { parameterName: 'batterySoh',            warningMin: 80,   warningMax: null, criticalMin: 70,   criticalMax: null, unit: '%',   description: 'Battery state of health' },
      { parameterName: 'pneumaticPressurePsi',  warningMin: 95,   warningMax: 145,  criticalMin: 80,   criticalMax: 160,  unit: 'PSI', description: 'Pneumatic vessel pressure' },
      { parameterName: 'gridImportKw',          warningMin: null, warningMax: 50,   criticalMin: null, criticalMax: 75,   unit: 'kW',  description: 'Grid import power' },
      { parameterName: 'frequency',             warningMin: 49.5, warningMax: 50.5, criticalMin: 49.0, criticalMax: 51.0, unit: 'Hz',  description: 'Grid frequency' },
      { parameterName: 'batteryTempC',          warningMin: -5,   warningMax: 40,   criticalMin: -10,  criticalMax: 50,   unit: '°C',  description: 'Battery pack temperature' },
      { parameterName: 'pneumaticTempC',        warningMin: null, warningMax: 65,   criticalMin: null, criticalMax: 80,   unit: '°C',  description: 'Pneumatic vessel temperature' },
    ],
  });
  console.log('✓ Created 10 system thresholds');

  // ── 5. 30-Day Historical Telemetry ────────────────────────────────────────
  console.log('⏳ Generating 30 days of telemetry records (720 points)...');
  const telemetryBatch: Array<{
    timestamp: Date;
    solarKw: number;
    bioenergyKw: number;
    loadKw: number;
    gridImportKw: number;
    gridExportKw: number;
    batterySoc: number;
    batterySoh: number;
    batteryCycles: number;
    batteryVoltageV: number;
    batteryCurrentA: number;
    batteryTempC: number;
    pneumaticPressurePsi: number;
    pneumaticTempC: number;
    systemHealthStatus: SystemHealth;
    frequency: number;
    powerFactor: number;
  }> = [];

  const now = new Date();
  let batterySoc = 75; // Start at 75% SoC
  let batteryCycles = 1240; // Cycle count

  for (let day = 29; day >= 0; day--) {
    const soh = generateDegradedSoh(29 - day);

    for (let hour = 0; hour < 24; hour++) {
      const timestamp = new Date(now);
      timestamp.setDate(now.getDate() - day);
      timestamp.setHours(hour, 0, 0, 0);

      const solar = solarKw(hour);
      const bio = bioenergyKw(hour);
      const load = loadKw(hour);
      const totalGeneration = solar + bio;
      const netPower = totalGeneration - load;

      // Battery charges when excess, discharges when deficit
      let batteryDelta = 0;
      let gridImport = 0;
      let gridExport = 0;

      if (netPower > 5 && batterySoc < 95) {
        // Charge battery
        batteryDelta = Math.min(netPower * 0.9, (95 - batterySoc) * 0.5);
        batterySoc = clamp(batterySoc + batteryDelta, 0, 100);
        const remainingExcess = netPower - batteryDelta;
        if (remainingExcess > 2) gridExport = remainingExcess * 0.85;
      } else if (netPower < -5 && batterySoc > 15) {
        // Discharge battery
        batteryDelta = Math.min(Math.abs(netPower) * 0.85, batterySoc - 15);
        batterySoc = clamp(batterySoc - batteryDelta, 0, 100);
        const remaining = Math.abs(netPower) - batteryDelta;
        if (remaining > 2) gridImport = remaining;
      } else if (netPower < -5) {
        gridImport = Math.abs(netPower) * 0.9;
      }

      // Increment battery cycles slightly over time
      if (Math.random() < 0.02) batteryCycles++;

      // Determine health status
      let healthStatus: string = 'NORMAL';
      if (batterySoc < 10 || gridImport > 75) healthStatus = 'CRITICAL';
      else if (batterySoc < 20 || gridImport > 50 || load > 110) healthStatus = 'WARNING';

      const psi = rand(105, 135);
      const pressureHealth = psi < 95 || psi > 145;
      if (pressureHealth && healthStatus === 'NORMAL') healthStatus = 'WARNING';

      telemetryBatch.push({
        timestamp,
        solarKw: parseFloat(solar.toFixed(2)),
        bioenergyKw: parseFloat(bio.toFixed(2)),
        loadKw: parseFloat(load.toFixed(2)),
        gridImportKw: parseFloat(Math.max(0, gridImport).toFixed(2)),
        gridExportKw: parseFloat(Math.max(0, gridExport).toFixed(2)),
        batterySoc: parseFloat(batterySoc.toFixed(1)),
        batterySoh: parseFloat(soh.toFixed(2)),
        batteryCycles,
        batteryVoltageV: parseFloat((48.0 + (batterySoc / 100) * 8).toFixed(2)), // 48-56V range
        batteryCurrentA: parseFloat(rand(-80, 80, 1).toFixed(1)),
        batteryTempC: parseFloat(rand(18, 35, 1).toFixed(1)),
        pneumaticPressurePsi: parseFloat(psi.toFixed(1)),
        pneumaticTempC: parseFloat(rand(22, 55, 1).toFixed(1)),
        systemHealthStatus: healthStatus as string,
        frequency: parseFloat(rand(49.85, 50.15, 3).toFixed(3)),
        powerFactor: parseFloat(rand(0.92, 0.99, 3).toFixed(3)),
      });
    }
  }

  // Batch insert in chunks to avoid SQLite limits
  const CHUNK_SIZE = 100;
  for (let i = 0; i < telemetryBatch.length; i += CHUNK_SIZE) {
    const chunk = telemetryBatch.slice(i, i + CHUNK_SIZE);
    await prisma.telemetryRecord.createMany({ data: chunk });
  }
  console.log(`✓ Inserted ${telemetryBatch.length} telemetry records`);

  // ── 6. Maintenance Tickets ────────────────────────────────────────────────
  const sampleSnapshot = JSON.stringify({
    solarKw: 72.4,
    bioenergyKw: 47.2,
    loadKw: 108.6,
    gridImportKw: 15.3,
    batterySoc: 18.2,
    batterySoh: 96.1,
    pneumaticPressurePsi: 91.4,
    systemHealthStatus: 'WARNING',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  });

  const criticalSnapshot = JSON.stringify({
    solarKw: 0,
    bioenergyKw: 44.1,
    loadKw: 112.3,
    gridImportKw: 68.2,
    batterySoc: 8.5,
    batterySoh: 95.8,
    pneumaticPressurePsi: 78.1,
    systemHealthStatus: 'CRITICAL',
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  const tickets = [
    {
      ticketCode: 'BPM-001',
      title: 'Battery SoC Critically Low — Below 10% Threshold',
      description: 'Battery state of charge dropped below the 10% critical threshold during peak evening load. Grid import increased to compensate. Immediate investigation required to assess discharge rate and load balancing.',
      severity: 'CRITICAL',
      status: 'NEW',
      subsystem: 'Battery',
      createdById: operatorUser.id,
      assignedToId: operatorUser.id,
      telemetrySnapshotJson: criticalSnapshot,
    },
    {
      ticketCode: 'BPM-002',
      title: 'Pneumatic Vessel Pressure Below Warning Threshold',
      description: 'Pneumatic accumulator pressure dropped to 91.4 PSI, below the 95 PSI warning threshold. Check valve seal integrity and compressor operation. Schedule inspection within 48 hours.',
      severity: 'HIGH',
      status: 'IN_PROGRESS',
      subsystem: 'Pneumatic',
      createdById: operatorUser.id,
      assignedToId: adminUser.id,
      telemetrySnapshotJson: sampleSnapshot,
    },
    {
      ticketCode: 'BPM-003',
      title: 'Solar Array Output Degradation — Panel Cleaning Required',
      description: 'Solar array peak output has been averaging 15% below seasonal baseline for 5 consecutive days. Soiling analysis suggests dust accumulation. Schedule panel cleaning crew.',
      severity: 'MEDIUM',
      status: 'IN_PROGRESS',
      subsystem: 'Solar',
      createdById: operatorUser.id,
      assignedToId: operatorUser.id,
      telemetrySnapshotJson: null,
    },
    {
      ticketCode: 'BPM-004',
      title: 'Grid Frequency Deviation Detected',
      description: 'Grid frequency briefly measured at 49.3 Hz for 45 seconds on 2024-08-12 at 14:32 UTC. Log for regulatory compliance reporting. Check inverter sync settings.',
      severity: 'LOW',
      status: 'RESOLVED',
      subsystem: 'Grid',
      resolutionNotes: 'Confirmed grid-side transient event. Inverter resynced automatically within 45 seconds. No action required. Regulatory notification filed.',
      createdById: operatorUser.id,
      assignedToId: operatorUser.id,
      telemetrySnapshotJson: null,
    },
    {
      ticketCode: 'BPM-005',
      title: 'Bioenergy Generator — Scheduled 500-Hour Service',
      description: 'Unit A bioenergy generator approaching 500-hour service interval. Schedule oil change, filter replacement, and combustion analysis per maintenance schedule.',
      severity: 'MEDIUM',
      status: 'NEW',
      subsystem: 'Bioenergy',
      createdById: adminUser.id,
      assignedToId: operatorUser.id,
      telemetrySnapshotJson: null,
    },
    {
      ticketCode: 'BPM-006',
      title: 'Inverter Firmware Update Available',
      description: 'SolarEdge inverter firmware v4.12.2 is available with improved MPPT algorithm. Estimated 3-5% efficiency gain. Schedule during overnight low-generation window.',
      severity: 'LOW',
      status: 'NEW',
      subsystem: 'Solar',
      createdById: adminUser.id,
      assignedToId: null,
      telemetrySnapshotJson: null,
    },
    {
      ticketCode: 'BPM-007',
      title: 'Battery Thermal Management — Cell Group C Elevated Temp',
      description: 'Cell group C temperature reached 42°C, approaching the 40°C warning threshold. Cooling fan unit 3 may have reduced airflow. Inspect and clean fan filters.',
      severity: 'HIGH',
      status: 'IN_PROGRESS',
      subsystem: 'Battery',
      createdById: operatorUser.id,
      assignedToId: adminUser.id,
      telemetrySnapshotJson: sampleSnapshot,
    },
    {
      ticketCode: 'BPM-008',
      title: 'Grid Export Curtailment — DNO Notification',
      description: 'Distribution Network Operator requested curtailment of grid export to 20 kW during periods 09:00-16:00 for the next 30 days due to local grid congestion. Update export limits.',
      severity: 'MEDIUM',
      status: 'RESOLVED',
      subsystem: 'Grid',
      resolutionNotes: 'Export limit updated in inverter settings to 20 kW during curtailment window. DNO acknowledgement received. Scheduled for review in 30 days.',
      createdById: adminUser.id,
      assignedToId: operatorUser.id,
      telemetrySnapshotJson: null,
    },
    {
      ticketCode: 'BPM-009',
      title: 'Load Spike — HVAC Compressor Startup Transient',
      description: 'Total load briefly hit 118 kW at 08:45 UTC during HVAC cold-start. Investigate soft-start configuration to reduce demand spikes and associated demand charges.',
      severity: 'MEDIUM',
      status: 'NEW',
      subsystem: 'Load',
      createdById: operatorUser.id,
      assignedToId: null,
      telemetrySnapshotJson: null,
    },
    {
      ticketCode: 'BPM-010',
      title: 'Annual ESG Compliance Audit Preparation',
      description: 'Compile 12-month renewable generation data, CO2 avoidance records, biomass utilization logs, and SDG 7/13 metrics for annual regulatory ESG report submission deadline.',
      severity: 'LOW',
      status: 'RESOLVED',
      subsystem: 'Administration',
      resolutionNotes: 'ESG report submitted to regulatory authority on time. Achieved 78% renewable energy fraction, 342 tCO2e avoided, 98% of biomass waste diverted from landfill. Full report archived.',
      createdById: adminUser.id,
      assignedToId: generalUser.id,
      telemetrySnapshotJson: null,
    },
  ];

  for (const ticket of tickets) {
    await prisma.maintenanceTicket.create({ data: ticket });
  }
  console.log(`✓ Created ${tickets.length} maintenance tickets`);

  // ── 7. Audit Logs ─────────────────────────────────────────────────────────
  await prisma.auditLog.createMany({
    data: [
      { userId: adminUser.id, action: 'USER_CREATED', details: 'Created operator account: operator@bpmplatform.io', ipAddress: '192.168.1.10' },
      { userId: adminUser.id, action: 'THRESHOLD_UPDATED', details: 'Updated battery SoC critical min from 8% to 10%', ipAddress: '192.168.1.10' },
      { userId: adminUser.id, action: 'TARIFF_CREATED', details: 'Created Summer Demand Rate tariff effective 2025-06-01', ipAddress: '192.168.1.10' },
      { userId: operatorUser.id, action: 'TICKET_CREATED', details: 'Created ticket BPM-001: Battery SoC Critically Low', ipAddress: '192.168.1.25' },
      { userId: operatorUser.id, action: 'TICKET_UPDATED', details: 'Updated ticket BPM-002 status to IN_PROGRESS', ipAddress: '192.168.1.25' },
      { userId: operatorUser.id, action: 'TICKET_RESOLVED', details: 'Resolved ticket BPM-004: Grid Frequency Deviation', ipAddress: '192.168.1.25' },
      { userId: adminUser.id, action: 'USER_LOGIN', details: 'Admin login from web interface', ipAddress: '192.168.1.10' },
      { userId: generalUser.id, action: 'ESG_REPORT_EXPORTED', details: 'Exported ESG compliance report for Q3 2024', ipAddress: '192.168.1.45' },
    ],
  });
  console.log('✓ Created 8 audit log entries');

  console.log('\n✅ BPM Platform seed completed successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Seeded:');
  console.log('   • 3 users across all roles');
  console.log('   • 3 utility tariff records');
  console.log('   • 10 system thresholds');
  console.log(`   • ${telemetryBatch.length} telemetry records (30 days × 24h)`);
  console.log('   • 10 maintenance tickets');
  console.log('   • 8 audit log entries');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
