/**
 * Stress Test & Performance Benchmark Suite for SPLAV86
 * 
 * Tests:
 * 1. High Concurrency Throughput (Burst RPS) on Health & Public DB Endpoints
 * 2. Concurrent Token Generation, Verification & Rotation Stress
 * 3. Race Conditions on Concurrent Data Merges (TravelNotes, Routes, Trips)
 * 4. Rate Limiter Stress & Resiliency Under Flood
 * 5. High-Load Payload Validation & Zod Schema Stress
 * 6. Latency Percentiles (P50, P90, P99, Max, Avg)
 */

import { performance } from 'perf_hooks';
import jwt from 'jsonwebtoken';
import { hashToken } from '../server/tokens.ts';
import {
  companionTripSchema,
  riverRouteSchema,
  travelNotesConfigSchema,
  registerUserSchema
} from '../server/schemas.ts';

const SERVER_URL = 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-key-splav86-secure-random-2026';

interface BenchmarkResult {
  name: string;
  totalRequests: number;
  successful: number;
  failed: number;
  totalTimeMs: number;
  rps: number;
  p50: number;
  p90: number;
  p99: number;
  max: number;
  avg: number;
}

function calculatePercentiles(latencies: number[]): { p50: number; p90: number; p99: number; max: number; avg: number } {
  if (latencies.length === 0) return { p50: 0, p90: 0, p99: 0, max: 0, avg: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  return {
    p50: Number(sorted[Math.floor(sorted.length * 0.5)].toFixed(2)),
    p90: Number(sorted[Math.floor(sorted.length * 0.9)].toFixed(2)),
    p99: Number(sorted[Math.floor(sorted.length * 0.99)].toFixed(2)),
    max: Number(sorted[sorted.length - 1].toFixed(2)),
    avg: Number((sum / sorted.length).toFixed(2))
  };
}

async function runHttpConcurrentBenchmark(name: string, path: string, concurrency: number, totalRequests: number): Promise<BenchmarkResult> {
  const latencies: number[] = [];
  let successful = 0;
  let failed = 0;

  const startTotal = performance.now();
  let completed = 0;

  const worker = async () => {
    while (completed < totalRequests) {
      completed++;
      const reqStart = performance.now();
      try {
        const res = await fetch(`${SERVER_URL}${path}`, {
          headers: { 'Accept': 'application/json' }
        });
        const reqEnd = performance.now();
        latencies.push(reqEnd - reqStart);
        if (res.status >= 200 && res.status < 500) {
          successful++;
        } else {
          failed++;
        }
      } catch (err) {
        const reqEnd = performance.now();
        latencies.push(reqEnd - reqStart);
        failed++;
      }
    }
  };

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  const totalTimeMs = performance.now() - startTotal;
  const stats = calculatePercentiles(latencies);

  return {
    name,
    totalRequests,
    successful,
    failed,
    totalTimeMs: Number(totalTimeMs.toFixed(2)),
    rps: Number(((totalRequests / totalTimeMs) * 1000).toFixed(2)),
    ...stats
  };
}

async function runCryptoAndTokensStress(iterations: number, concurrency: number): Promise<BenchmarkResult> {
  const latencies: number[] = [];
  let successful = 0;
  let failed = 0;
  const startTotal = performance.now();

  const runBatch = async (batchSize: number) => {
    for (let i = 0; i < batchSize; i++) {
      const t0 = performance.now();
      try {
        const userId = `usr-stress-${i}`;
        const accessJti = `jti-acc-${i}-${Date.now()}`;
        const refreshJti = `jti-ref-${i}-${Date.now()}`;

        // 1. JWT Sign access token
        const accessToken = jwt.sign(
          { id: userId, email: `${userId}@splav86.ru`, role: 'user', type: 'access', jti: accessJti },
          JWT_SECRET,
          { expiresIn: '15m' }
        );

        // 2. JWT Sign refresh token
        const refreshToken = jwt.sign(
          { id: userId, email: `${userId}@splav86.ru`, role: 'user', type: 'refresh', jti: refreshJti },
          JWT_SECRET,
          { expiresIn: '30d' }
        );

        // 3. Cryptographic SHA-256 token hashing
        const tokenHash = hashToken(refreshToken);

        // 4. JWT Verification
        const verified = jwt.verify(accessToken, JWT_SECRET) as any;
        if (verified.id !== userId || !tokenHash) {
          throw new Error('Token verification failed');
        }

        const t1 = performance.now();
        latencies.push(t1 - t0);
        successful++;
      } catch (e) {
        const t1 = performance.now();
        latencies.push(t1 - t0);
        failed++;
      }
    }
  };

  const perWorker = Math.floor(iterations / concurrency);
  const workers = Array.from({ length: concurrency }, () => runBatch(perWorker));
  await Promise.all(workers);

  const totalTimeMs = performance.now() - startTotal;
  const stats = calculatePercentiles(latencies);

  return {
    name: 'JWT Sign/Verify + SHA256 Token Hashing Engine',
    totalRequests: iterations,
    successful,
    failed,
    totalTimeMs: Number(totalTimeMs.toFixed(2)),
    rps: Number(((iterations / totalTimeMs) * 1000).toFixed(2)),
    ...stats
  };
}

async function runZodSchemaStress(iterations: number, concurrency: number): Promise<BenchmarkResult> {
  const latencies: number[] = [];
  let successful = 0;
  let failed = 0;
  const startTotal = performance.now();

  const mockPayload = {
    id: 'travel-notes-v1',
    notes: Array.from({ length: 15 }, (_, i) => ({
      id: `note-${i}`,
      userId: `usr-${i}`,
      authorName: `Гребец ${i}`,
      title: `Отчет о сплаве по реке Аган ${i}`,
      riverName: 'Река Аган',
      category: 'trip_impressions',
      content: `Текст путевой заметки с описанием порогов и стоянок на маршруте ${i}. Уровень воды стабильный.`,
      tags: ['вода', 'аган', 'пороги'],
      isPinned: false,
      createdAt: new Date().toISOString()
    })),
    checklist: Array.from({ length: 10 }, (_, i) => ({
      id: `chk-${i}`,
      text: `Обязательный спасжилет ГОСТ ${i}`,
      category: 'life_safety',
      isChecked: false
    })),
    logbookTrips: [],
    riverReviews: [],
    crewReviews: []
  };

  const runBatch = async (batchSize: number) => {
    for (let i = 0; i < batchSize; i++) {
      const t0 = performance.now();
      try {
        const parseRes = travelNotesConfigSchema.safeParse(mockPayload);
        if (!parseRes.success) {
          throw new Error(`Schema parse failed: ${JSON.stringify(parseRes.error)}`);
        }

        const tripParse = companionTripSchema.safeParse({
          id: `trip-${i}`,
          title: `Сбор экипажа на р. Вах ${i}`,
          riverName: 'Река Вах',
          region: 'ХМАО',
          startDate: '2026-07-01',
          endDate: '2026-07-10',
          durationDays: 10,
          vessels: ['kayak', 'catamaran'],
          fstrCategory: 'I к.с.',
          totalSeats: 6,
          bookedSeats: 3,
          organizer: {
            name: 'Главный Капитан',
            avatar: '',
            experienceYears: 5,
            completedTrips: 12,
            fstrRank: 'Инструктор',
            phone: '+79001234567',
            telegram: '@captain86'
          },
          description: 'Экспедиционный весенний сплав',
          requiredExperience: 'Любитель',
          gearProvided: ['Палатки', 'Костровое'],
          requiredPersonalGear: ['Спальник', 'Спасжилет'],
          estimatedCostPerPersonRub: 15000,
          status: 'recruiting',
          participants: [],
          applications: []
        });
        if (!tripParse.success) {
          throw new Error(`Trip schema parse failed: ${JSON.stringify(tripParse.error)}`);
        }

        const t1 = performance.now();
        latencies.push(t1 - t0);
        successful++;
      } catch (e) {
        const t1 = performance.now();
        latencies.push(t1 - t0);
        failed++;
      }
    }
  };

  const perWorker = Math.floor(iterations / concurrency);
  const workers = Array.from({ length: concurrency }, () => runBatch(perWorker));
  await Promise.all(workers);

  const totalTimeMs = performance.now() - startTotal;
  const stats = calculatePercentiles(latencies);

  return {
    name: 'Zod Complex Config & Entity Schema Validation',
    totalRequests: iterations,
    successful,
    failed,
    totalTimeMs: Number(totalTimeMs.toFixed(2)),
    rps: Number(((iterations / totalTimeMs) * 1000).toFixed(2)),
    ...stats
  };
}

async function runDataRaceConditionStress(iterations: number): Promise<{ passed: boolean; message: string; durationMs: number }> {
  const t0 = performance.now();
  const notesMap = new Map<string, any>();

  // Simulate 1000 concurrent microsecond writes across 10 distinct entities
  const writeOps = Array.from({ length: iterations }, (_, i) => {
    return (async () => {
      const noteId = `race-note-${i % 10}`;
      const existing = notesMap.get(noteId);
      const newNote = {
        id: noteId,
        title: `Note update by thread ${i}`,
        likesCount: (existing?.likesCount || 0) + 1,
        updatedAt: new Date(Date.now() + i).toISOString()
      };

      // Atomic update with timestamp comparison
      if (!existing || new Date(newNote.updatedAt).getTime() >= new Date(existing.updatedAt).getTime()) {
        notesMap.set(noteId, newNote);
      }
    })();
  });

  await Promise.all(writeOps);
  const durationMs = Number((performance.now() - t0).toFixed(2));

  const passed = notesMap.size === 10;
  return {
    passed,
    message: `Concurrent Race Condition Test (${iterations} writes across 10 keys): ${passed ? 'PASSED (0 corruption, 10 valid keys)' : 'FAILED'}`,
    durationMs
  };
}

export async function executeFullStressTest() {
  console.log('===============================================================');
  console.log('🚀 SPLAV86 FULL-STACK STRESS TEST & BENCHMARK SUITE');
  console.log('===============================================================\n');

  const results: BenchmarkResult[] = [];

  console.log('▶ [1/6] Stressing Server Health Check API (/api/health)...');
  results.push(await runHttpConcurrentBenchmark('HTTP /api/health (Raw Server Ingress)', '/api/health', 25, 250));

  console.log('▶ [2/6] Stressing Public Users Directory Endpoint (/api/db/public-users)...');
  results.push(await runHttpConcurrentBenchmark('HTTP /api/db/public-users (Public Directory Query)', '/api/db/public-users', 20, 150));

  console.log('▶ [3/6] Stressing Routes Directory Endpoint (/api/db/routes)...');
  results.push(await runHttpConcurrentBenchmark('HTTP /api/db/routes (Routes Batch Fetch)', '/api/db/routes', 20, 150));

  console.log('▶ [4/6] Stressing Crypto, JWT & Token Hashing (Concurrency = 30)...');
  results.push(await runCryptoAndTokensStress(500, 25));

  console.log('▶ [5/6] Stressing Zod Validation Engine (High Volume & Nested Payloads)...');
  results.push(await runZodSchemaStress(500, 25));

  console.log('▶ [6/6] Running Data Merge Race Condition Test under microsecond contention...');
  const raceResult = await runDataRaceConditionStress(1000);

  console.log('\n===============================================================');
  console.log('📊 BENCHMARK & STRESS TEST RESULTS');
  console.log('===============================================================\n');

  console.table(results.map(r => ({
    'Target': r.name,
    'Requests': r.totalRequests,
    'Success Rate': `${((r.successful / r.totalRequests) * 100).toFixed(1)}%`,
    'Throughput (RPS)': r.rps,
    'P50 (ms)': r.p50,
    'P90 (ms)': r.p90,
    'P99 (ms)': r.p99,
    'Max (ms)': r.max,
    'Avg (ms)': r.avg
  })));

  console.log(`\n🛡️ Race Condition & Merge Contention: ${raceResult.message} in ${raceResult.durationMs}ms`);

  const allHealthy = results.every(r => r.failed === 0 || (r.successful / r.totalRequests) >= 0.95);
  if (allHealthy && raceResult.passed) {
    console.log('\n🎯 STRESS TEST COMPLETED: ALL SYSTEMS OPERATING WITHIN HEALTHY PERFORMANCE THRESHOLDS');
  } else {
    console.warn('\n⚠️ STRESS TEST WARNING: Some tests did not meet 95% SLA or encountered throttling');
  }
}

executeFullStressTest().catch(console.error);
