import { Component, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Api } from '../../services/api';
import { TranslationService } from '../../services/translation.service';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-analytics',
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './analytics.html',
  styleUrl: './analytics.scss',
})
export class Analytics implements OnInit {
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly totalDocs = signal(0);
  protected readonly totalReqs = signal(0);
  protected readonly totalTasks = signal(0);
  protected readonly totalTests = signal(0);

  // Animated display values (count up from 0)
  protected readonly animDocs = signal(0);
  protected readonly animReqs = signal(0);
  protected readonly animTasks = signal(0);
  protected readonly animTests = signal(0);

  // Controls whether bars render their target width (false = 0%, true = real%)
  protected readonly barsReady = signal(false);

  protected readonly priorityCounts = signal<Record<string, number>>({
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  });

  protected readonly complexityCounts = signal<Record<string, number>>({
    SIMPLE: 0,
    MODERATE: 0,
    COMPLEX: 0,
  });

  // Computed percentages for Priority Charts
  protected readonly priorityPercentages = computed(() => {
    const total = this.totalReqs();
    if (total === 0) return { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    const counts = this.priorityCounts();
    return {
      CRITICAL: Math.round((counts['CRITICAL'] / total) * 100),
      HIGH: Math.round((counts['HIGH'] / total) * 100),
      MEDIUM: Math.round((counts['MEDIUM'] / total) * 100),
      LOW: Math.round((counts['LOW'] / total) * 100),
    };
  });

  // Computed percentages for Complexity Charts
  protected readonly complexityPercentages = computed(() => {
    const total = this.totalTasks();
    if (total === 0) return { SIMPLE: 0, MODERATE: 0, COMPLEX: 0 };
    const counts = this.complexityCounts();
    return {
      SIMPLE: Math.round((counts['SIMPLE'] / total) * 100),
      MODERATE: Math.round((counts['MODERATE'] / total) * 100),
      COMPLEX: Math.round((counts['COMPLEX'] / total) * 100),
    };
  });

  // Animated bar widths (0 until barsReady, then real%)
  protected readonly animPriorityPerc = computed(() => {
    if (!this.barsReady()) return { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    return this.priorityPercentages();
  });

  protected readonly animComplexityPerc = computed(() => {
    if (!this.barsReady()) return { SIMPLE: 0, MODERATE: 0, COMPLEX: 0 };
    return this.complexityPercentages();
  });

  constructor(
    private api: Api,
    public ts: TranslationService
  ) {}

  ngOnInit(): void {
    this.loadAnalytics();
  }

  loadAnalytics(): void {
    this.api.getAnalytics().subscribe({
      next: (res) => {
        this.totalDocs.set(res.total_documents);
        this.totalReqs.set(res.total_requirements);
        this.totalTasks.set(res.total_tasks);
        this.totalTests.set(res.total_test_scenarios);
        this.priorityCounts.set(res.requirements_by_priority);
        this.complexityCounts.set(res.tasks_by_complexity);
        this.isLoading.set(false);

        // Kick off animations after a microtask so the DOM renders first
        setTimeout(() => {
          this.animateCounter(this.animDocs, res.total_documents);
          this.animateCounter(this.animReqs, res.total_requirements, 50);
          this.animateCounter(this.animTasks, res.total_tasks, 100);
          this.animateCounter(this.animTests, res.total_test_scenarios, 150);
          // Trigger bar growth after a short delay
          setTimeout(() => this.barsReady.set(true), 200);
        }, 50);
      },
      error: (err) => {
        this.errorMessage.set(this.ts.t('analytics.loadError'));
        this.isLoading.set(false);
        console.error(err);
      }
    });
  }

  /** Smoothly counts a signal from 0 to target over ~800ms using requestAnimationFrame */
  private animateCounter(
    sig: ReturnType<typeof signal<number>>,
    target: number,
    delayMs: number = 0
  ): void {
    if (target === 0) { sig.set(0); return; }

    const duration = 800; // ms
    const run = () => {
      const start = performance.now();
      const step = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        sig.set(Math.round(eased * target));
        if (progress < 1) {
          requestAnimationFrame(step);
        }
      };
      requestAnimationFrame(step);
    };

    if (delayMs > 0) {
      setTimeout(run, delayMs);
    } else {
      run();
    }
  }
}
